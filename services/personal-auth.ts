import { profilesRepository } from './repositories/profiles-repository';
import { profileSlug } from './data-layer';

// Resolves a personal account (Google/Facebook) OAuth login by matching the
// OAuth email against Profile.Email. Used by all personal account providers.
export async function resolvePersonalSession(email: string, displayName: string, oauthId: string): Promise<{
  ok: true;
  sessionUser: NonNullable<import('express-session').SessionData['user']>;
} | { ok: false }> {
  const adminUsers = (process.env.ADMIN_USERS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  const profiles = await profilesRepository.getAll();

  const matchedProfiles = profiles.filter(p => p.Email?.toLowerCase() === email.toLowerCase());
  if (matchedProfiles.length === 0) return { ok: false };

  const primary = matchedProfiles[0];

  // Detect if this email also has a DTV Account login, and which role it would get.
  // Check the profile's linked User field (DTV username) as well as the OAuth email itself.
  let trustedRole: 'admin' | 'checkin' | undefined;
  const linkedDTVEmail = primary.User?.toLowerCase();
  if (adminUsers.includes(email.toLowerCase()) || (linkedDTVEmail && adminUsers.includes(linkedDTVEmail))) {
    trustedRole = 'admin';
  } else if (primary.User) {
    trustedRole = 'checkin';
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
    },
  };
}
