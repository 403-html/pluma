import nodemailer from 'nodemailer';
import { Queue, Worker } from 'bullmq';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_ENV = process.env.SMTP_FROM ?? 'noreply@pluma.local';

const REDIS_URL = process.env.REDIS_URL;

type MailJobData = { to: string; from: string; subject: string; text: string; html: string };

const QUEUE_NAME = 'pluma:emails';

// Create SMTP transport once at module init; null when SMTP is unconfigured.
const transport = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth:
        SMTP_USER && SMTP_PASS
          ? { user: SMTP_USER, pass: SMTP_PASS }
          : undefined,
    })
  : null;

if (!transport) {
  console.warn('[mailer] SMTP_HOST is not set — email delivery is disabled');
}

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
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
  };
}

// BullMQ queue + worker — only created when Redis is configured.
let emailQueue: Queue<MailJobData> | null = null;
let emailWorker: Worker<MailJobData> | null = null;

if (REDIS_URL) {
  const connection = parseRedisUrl(REDIS_URL);

  emailQueue = new Queue<MailJobData>(QUEUE_NAME, { connection });

  emailWorker = new Worker<MailJobData>(
    QUEUE_NAME,
    async (job) => {
      if (!transport) return;
      await transport.sendMail(job.data);
    },
    { connection, concurrency: 2 },
  );

  emailWorker.on('failed', (job, err) => {
    console.error(`[mailer] email job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err);
  });
} else {
  console.warn('[mailer] REDIS_URL is not set — emails will be sent synchronously without retry');
}

/**
 * Sends a welcome email to the given address.
 *
 * When Redis is configured the mail is enqueued (delivered asynchronously with
 * up to 3 retry attempts using exponential back-off). Without Redis it is sent
 * synchronously via nodemailer. When neither is configured this is a no-op.
 *
 * @param email - recipient address
 * @param from  - optional From override; falls back to the SMTP_FROM env var
 */
export async function sendWelcomeEmail(email: string, from?: string): Promise<void> {
  const mailData: MailJobData = {
    to: email,
    from: from || SMTP_FROM_ENV,
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

  if (!transport) return;
  await transport.sendMail(mailData);
}

/** Closes the queue and worker gracefully. Call on process shutdown. */
export async function closeMailer(): Promise<void> {
  await Promise.all([emailQueue?.close(), emailWorker?.close()]);
}
