import { ConfidentialClientApplication, Configuration, LogLevel } from '@azure/msal-node';

const msalConfig: Configuration = {
  auth: {
    clientId: process.env.SHAREPOINT_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.SHAREPOINT_TENANT_ID!}`,
    clientSecret: process.env.SHAREPOINT_CLIENT_SECRET!,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string) => {
        if (level === LogLevel.Error) console.error('[MSAL]', message);
      },
      logLevel: LogLevel.Error,
    },
  },
};

export const msalClient = new ConfidentialClientApplication(msalConfig);

export const AUTH_SCOPES = ['User.Read'];

export function getRedirectUri(req: { protocol: string; get(name: string): string | undefined }): string {
  return `${req.protocol}://${req.get('host')}/auth/callback`;
}
