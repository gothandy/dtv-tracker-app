import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user: {
      id: string;
      displayName: string;
      email: string;
      role: 'admin' | 'checkin';
    } | undefined;
    returnTo: string | undefined;
  }
}
