import { profilesRepository } from './repositories/profiles-repository';
import { profileSlug, parseEmails } from './data-layer';

// Resolves a personal account (Google/Facebook) OAuth login by matching the
// OAuth email against Profile.Email. Used by all personal account providers.
export async function resolvePersonalSession(email: string, displayName: string, oauthId: string): Promise<{
  ok: true;
  sessionUser: NonNullable<import('express-session').SessionData['user']>;
} | { ok: false }> {
  const adminUsers = (process.env.ADMIN_USERS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  const profiles = await profilesRepository.getAll();
  const target = email.toLowerCase();
  const matchedProfiles = profiles.filter(p => parseEmails(p.Email).includes(target));
  console.log(`[Auth] ${email}`);
  if (matchedProfiles.length === 0) {
    const candidates = profiles.filter(p => p.Email && p.Email.toLowerCase().includes(target.split('@')[0]));
    for (const c of candidates) {
      const raw = c.Email!;
      console.error(`[Auth] NO MATCH. target="${target}" raw="${raw}" charCodes=[${[...raw].map(ch => ch.charCodeAt(0)).join(',')}] parsed=${JSON.stringify(parseEmails(raw))}`);
    }
    if (!candidates.length) console.error(`[Auth] NO MATCH and no candidate profiles found for ${target}`);
    return { ok: false };
  }

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
