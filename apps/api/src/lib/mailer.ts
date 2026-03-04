import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM ?? 'noreply@pluma.local';

// Create transport once at module initialisation; null when SMTP is unconfigured.
const transport = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth:
        SMTP_USER && SMTP_PASS
          ? { user: SMTP_USER, pass: SMTP_PASS }
          : undefined,
    })
  : null;

if (!transport) {
  // Module-level warning emitted once on startup — no request context available.
  console.warn('[mailer] SMTP_HOST is not set — welcome emails are disabled');
}

/**
 * Sends a welcome email to the given address.
 *
 * If SMTP_HOST is not configured this function is a no-op — registration
 * always succeeds regardless of email delivery.
 */
export async function sendWelcomeEmail(email: string): Promise<void> {
  if (!transport) {
    return;
  }

  await transport.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Welcome to Pluma',
    text: 'Your Pluma account has been created successfully.',
    html: '<p>Your Pluma account has been created successfully.</p>',
  });
}
