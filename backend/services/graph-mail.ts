import { sharePointClient } from './sharepoint-client';
import { tracker } from '../config';
import { assertSafeRecipient } from './email-safe-list';

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
    `Reply-To: ${tracker.sharedMailbox}`,
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
 * Sends from, and replies go to, the TRACKER_SHARED_MAILBOX setting. Outside production, only to the safe list
 * (see email-safe-list.ts); anything else throws UnsafeRecipientError and nothing is sent.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  await assertSafeRecipient(options.to);
  const sender = tracker.sharedMailbox;

  const token = await sharePointClient.getAccessToken();
  const mime = buildMime(options);

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: Buffer.from(mime).toString('base64'),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph sendMail failed: ${res.status} ${body}`);
  }
}
