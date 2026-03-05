import nodemailer from 'nodemailer';
import { Queue, Worker } from 'bullmq';
import { prisma } from '@pluma-flags/db';

const REDIS_URL = process.env.REDIS_URL;

type MailJobData = { to: string; from: string; subject: string; text: string; html: string };

const QUEUE_NAME = 'pluma:emails';

/**
 * Parses a redis:// URL into a BullMQ-compatible connection options object.
 * BullMQ sets `maxRetriesPerRequest: null` automatically when connection options
 * are provided as a plain object rather than an IORedis instance.
 *
 * Throws a descriptive error when the URL is malformed so misconfiguration is
 * caught at startup rather than silently failing later.
 */
function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `[mailer] REDIS_URL is not a valid URL: "${url}". Expected format: redis://[password@]host:port`,
    );
  }

  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error(
      `[mailer] REDIS_URL must use redis:// or rediss:// scheme, got "${parsed.protocol}" for "${url}"`,
    );
  }

  const hostname = parsed.hostname.trim();
  if (!hostname) {
    throw new Error(`[mailer] REDIS_URL must include a hostname, got "${url}"`);
  }

  const portString = parsed.port;
  const port = portString ? parseInt(portString, 10) : 6379;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(
      `[mailer] REDIS_URL must include a valid port (1-65535), got "${portString || '6379'}" for "${url}"`,
    );
  }

  return {
    host: hostname,
    port,
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
  };
}

/**
 * Reads SMTP settings from OrgSettings in the DB and returns a Nodemailer transport,
 * or null when SMTP is not configured.
 */
async function createTransportFromDb(): Promise<nodemailer.Transporter | null> {
  const settings = await prisma.orgSettings.findUnique({ where: { id: 'default' } });
  if (!settings || !settings.smtpHost) {
    return null;
  }
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth:
      settings.smtpUser && settings.smtpPass
        ? { user: settings.smtpUser, pass: settings.smtpPass }
        : undefined,
  });
}

// BullMQ queue + worker — lazily initialised via initMailer(); null until then.
let emailQueue: Queue<MailJobData> | null = null;
let emailWorker: Worker<MailJobData> | null = null;

/**
 * Initialises the BullMQ queue and worker.
 *
 * Should be called once from `buildApp` after the Fastify instance is ready.
 * Requires REDIS_URL to be set — without it emails fall back to synchronous
 * delivery (see sendWelcomeEmail). `closeMailer` must be registered separately
 * on the shutdown hook.
 */
export function initMailer(): void {
  if (!REDIS_URL) {
    console.warn('[mailer] REDIS_URL is not set — emails will be sent synchronously without retry');
    return;
  }

  const connection = parseRedisUrl(REDIS_URL);

  emailQueue = new Queue<MailJobData>(QUEUE_NAME, { connection });

  emailWorker = new Worker<MailJobData>(
    QUEUE_NAME,
    async (job) => {
      const transport = await createTransportFromDb();
      if (!transport) {
        console.warn(`[mailer] Skipped email job ${job.id}: SMTP not configured`);
        return;
      }
      await transport.sendMail(job.data);
    },
    { connection, concurrency: 2 },
  );

  emailWorker.on('failed', (job, err) => {
    console.error(`[mailer] email job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err);
  });
}

/**
 * Sends a welcome email to the given address.
 *
 * When Redis is configured (via `initMailer`) the mail is enqueued (delivered
 * asynchronously with up to 3 retry attempts using exponential back-off).
 * Without Redis it is sent synchronously via nodemailer. When SMTP is not
 * configured in OrgSettings this is always a no-op.
 *
 * @param email - recipient address
 */
export async function sendWelcomeEmail(email: string): Promise<void> {
  const settings = await prisma.orgSettings.findUnique({ where: { id: 'default' } });
  if (!settings || !settings.smtpHost) {
    // SMTP not configured — no-op.
    return;
  }

  const mailData: MailJobData = {
    to: email,
    from: settings.smtpFrom || `noreply@pluma.local`,
    subject: 'Welcome to Pluma',
    text: 'Your Pluma account has been created successfully.',
    html: '<p>Your Pluma account has been created successfully.</p>',
  };

  if (emailQueue) {
    await emailQueue.add('welcome', mailData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
    });
    return;
  }

  const transport = await createTransportFromDb();
  if (!transport) {
    console.warn('[mailer] Synchronous email skipped: SMTP not configured');
    return;
  }
  await transport.sendMail(mailData);
}

/** Closes the queue and worker gracefully. Call on process shutdown. */
export async function closeMailer(): Promise<void> {
  await Promise.all([emailQueue?.close(), emailWorker?.close()]);
}
