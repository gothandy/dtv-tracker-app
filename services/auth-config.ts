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

export const REDIRECT_URI = process.env.AUTH_REDIRECT_URI || 'http://localhost:3000/auth/callback';
