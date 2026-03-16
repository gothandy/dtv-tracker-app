import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user: {
      id: string;
      displayName: string;
      email: string;
      role: 'admin' | 'checkin' | 'readonly' | 'selfservice';
      profileSlug?: string;
      profileId?: number;       // set for checkin and selfservice; used for ownership enforcement
      profileIds?: number[];    // all profiles for this email (selfservice with multiple linked profiles)
      trustedRole?: 'admin' | 'checkin'; // selfservice user whose email also matches a trusted account; indicates which role
    } | undefined;
    returnTo: string | undefined;
  }
}
