import { ConfidentialClientApplication, LogLevel } from '@azure/msal-node';
import { entra } from '../config';

let client: ConfidentialClientApplication | undefined;

/** MSAL client for staff Microsoft sign-in. Created on first use, so settings are read lazily. */
export function msalClient(): ConfidentialClientApplication {
  client ??= new ConfidentialClientApplication({
    auth: {
      clientId: entra.clientId,
      authority: `https://login.microsoftonline.com/${entra.tenantId}`,
      clientSecret: entra.clientSecret,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level: LogLevel, message: string) => {
          if (level === LogLevel.Error) console.error('[MSAL]', message);
        },
        logLevel: LogLevel.Error,
      },
    },
  });
  return client;
}

// email: so the sign-in token includes the person's email (optional claim on the registration).
export const AUTH_SCOPES = ['User.Read', 'email'];

export function getRedirectUri(req: { protocol: string; get(name: string): string | undefined }): string {
  return `${req.protocol}://${req.get('host')}/auth/signed-in`;
}
