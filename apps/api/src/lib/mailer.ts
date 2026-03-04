import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM ?? 'noreply@pluma.local';

function createTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth:
      SMTP_USER && SMTP_PASS
        ? { user: SMTP_USER, pass: SMTP_PASS }
        : undefined,
  });
}

/**
 * Sends a welcome email to the given address.
 *
 * If SMTP_HOST is not configured this function is a no-op — registration
 * always succeeds regardless of email delivery.
 */
export async function sendWelcomeEmail(email: string): Promise<void> {
  if (!SMTP_HOST) {
    console.warn('[mailer] SMTP_HOST is not set — skipping welcome email');
    return;
  }

  const transport = createTransport();

  await transport.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Welcome to Pluma',
    text: 'Your Pluma account has been created successfully.',
    html: '<p>Your Pluma account has been created successfully.</p>',
  });
}
