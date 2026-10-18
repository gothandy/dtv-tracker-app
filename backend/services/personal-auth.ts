import { profilesRepository } from './repositories/profiles-repository';
import { profileSlug, parseEmails } from './data-layer';
import { PROFILE_STATS } from './field-names';
import { isAdminEmail } from '../config';
import type { SharePointProfile } from '../../types/sharepoint';

// Resolves a self-service (email verification code) login by matching the
// verified email against Profile.Email.
export async function resolvePersonalSession(email: string, displayName: string, oauthId: string): Promise<{
  ok: true;
  sessionUser: NonNullable<import('express-session').SessionData['user']>;
} | { ok: false }> {
  const profiles = await profilesRepository.getAll();
  const target = email.toLowerCase();
  const matchedProfiles = profiles.filter(p => parseEmails(p.Email).includes(target));
  if (matchedProfiles.length === 0) return { ok: false };

  const primary = matchedProfiles[0];

  // Detect if this email also has a DTV Account login, and which role it would get.
  // Check the profile's linked User field (DTV username) as well as the OAuth email itself.
  let trustedRole: 'admin' | 'checkin' | undefined;
  const linkedDTVEmail = primary.User?.toLowerCase();
  if (isAdminEmail(email) || isAdminEmail(linkedDTVEmail)) {
    trustedRole = 'admin';
  } else if (primary.User) {
    trustedRole = 'checkin';
  }

  let profileStats: NonNullable<import('express-session').SessionData['user']>['profileStats'];
  if (primary[PROFILE_STATS]) {
    try { profileStats = JSON.parse(primary[PROFILE_STATS]); } catch {}
  }

  return {
    ok: true,
    sessionUser: {
      id: oauthId,
      displayName: displayName || primary.Title || email,
      email,
      role: 'selfservice',
      profileSlug: profileSlug(primary.Title, primary.ID),
      profileId: primary.ID,
      profileIds: matchedProfiles.map(p => p.ID),
      trustedRole,
      profileStats,
    },
  };
}

// A staff (Microsoft) session for a profile whose `User` is the person's DTV account.
// Used at sign-in and when rebuilding the session from the Logins list after a restart,
// so the role is always worked out the same way, from the current admin list.
export function staffSessionUser(
  profile: SharePointProfile,
  email: string,
  freshAuthAt: string,
  /** The access an Admin chose on this device (auth-store ACCESS_COOKIE); Check In unless they chose Admin. */
  chosenAccess: 'admin' | 'checkin' = 'checkin'
): NonNullable<import('express-session').SessionData['user']> {
  let profileStats: NonNullable<import('express-session').SessionData['user']>['profileStats'];
  if (profile[PROFILE_STATS]) {
    try { profileStats = JSON.parse(profile[PROFILE_STATS]); } catch { /* ignore */ }
  }
  return {
    id: String(profile.ID),
    displayName: profile.Title || email,
    email,
    role: isAdminEmail(email) && chosenAccess === 'admin' ? 'admin' : 'checkin',
    canBeAdmin: isAdminEmail(email),
    profileSlug: profileSlug(profile.Title, profile.ID),
    profileId: profile.ID,
    freshAuthAt,
    profileStats,
  };
}
