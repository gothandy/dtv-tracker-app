import { sharePointClient } from './sharepoint-client';

/**
 * Send an email via Microsoft Graph API using the existing app credentials.
 * Requires Mail.Send application permission on the Azure app registration.
 * MAIL_SENDER env var must be the UPN/address of the mailbox to send from.
 */
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  const sender = process.env.MAIL_SENDER;
  if (!sender) throw new Error('MAIL_SENDER env var is not set');

  const token = await sharePointClient.getAccessToken();

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: html },
        toRecipients: [{ emailAddress: { address: to } }],
        replyTo: [{ emailAddress: { address: 'admin@deantrailvolunteers.org.uk' } }],
      },
      saveToSentItems: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph sendMail failed: ${res.status} ${body}`);
  }
}
