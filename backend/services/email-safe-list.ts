/**
 * Outside production, the tracker only sends email to the people testing it.
 *
 * Slots and local development run on a copy of live data, so the copy holds real
 * volunteers' addresses. This stops a test from emailing them by accident. The safe
 * list is each admin's work account (TRACKER_ADMIN_USERS for this environment) and the
 * addresses on that admin's own profile, exactly as written: nothing else, so changing
 * who can receive test email means changing the slot's admin users.
 *
 * It guards against accidents, not attacks: an admin can still edit their own profile.
 */

import { SharePointProfile } from '../../types/sharepoint';
import { environmentName, platform, tracker } from '../config';
import { parseEmails } from './data-layer';
import { profilesRepository } from './repositories/profiles-repository';

export class UnsafeRecipientError extends Error {
  constructor(environment: string, recipient: string) {
    super(
      `${environment} only sends email to its admin users and the addresses on their own profiles, ` +
      `not to ${recipient}. See docs/configuration.md (TRACKER_ADMIN_USERS).`
    );
    this.name = 'UnsafeRecipientError';
  }
}

/** The admins' work accounts, plus every address on a profile whose User is one of them. */
export function safeRecipients(
  adminUsers: ReadonlySet<string>,
  profiles: Pick<SharePointProfile, 'User' | 'Email'>[],
): Set<string> {
  const safe = new Set(adminUsers);
  for (const profile of profiles) {
    const user = profile.User?.trim().toLowerCase();
    if (!user || !adminUsers.has(user)) continue;
    for (const email of parseEmails(profile.Email)) safe.add(email);
  }
  return safe;
}

/** Throws UnsafeRecipientError if this environment isn't production and the address isn't safe. */
export async function assertSafeRecipient(recipient: string): Promise<void> {
  const environment = environmentName();
  // A local run is never production, even if its .env points at the live site by mistake.
  if (environment === 'Production' && !platform.isLocal) return;

  const safe = safeRecipients(tracker.adminUsers, await profilesRepository.getAll());
  if (!safe.has(recipient.trim().toLowerCase())) {
    throw new UnsafeRecipientError(environment === 'Production' ? 'Local development' : environment, recipient);
  }
}
