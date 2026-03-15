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
      hasStaffAccess?: boolean; // selfservice user whose email also matches a staff-level account
    } | undefined;
    returnTo: string | undefined;
  }
}
