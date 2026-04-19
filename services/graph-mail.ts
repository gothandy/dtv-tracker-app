import { sharePointClient } from './sharepoint-client';

const REPLY_TO = 'admin@deantrailvolunteers.org.uk';
const BOUNDARY = 'dtv-email-boundary';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function buildMime({ to, subject, html, text }: SendEmailOptions): string {
  return [
    'MIME-Version: 1.0',
    `To: ${to}`,
    `Reply-To: ${REPLY_TO}`,
    `Subject: ${subject}`,
    `Content-Type: multipart/alternative; boundary="${BOUNDARY}"`,
    '',
    `--${BOUNDARY}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    text,
    '',
    `--${BOUNDARY}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
    '',
    `--${BOUNDARY}--`,
  ].join('\r\n');
}

/**
 * Send an email via Microsoft Graph API using the existing app credentials.
 * Requires Mail.Send application permission on the Azure app registration.
 * MAIL_SENDER env var must be the UPN/address of the mailbox to send from.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const sender = process.env.MAIL_SENDER;
  if (!sender) throw new Error('MAIL_SENDER env var is not set');

  const token = await sharePointClient.getAccessToken();
  const mime = buildMime(options);

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: mime,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph sendMail failed: ${res.status} ${body}`);
  }
}
