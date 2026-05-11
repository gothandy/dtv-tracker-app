/** Microsoft Tracker tier implied by Profile `User` + `ADMIN_USERS`. Trusted API responses only. */

import type { TrackerAccess } from '../../types/api-responses';

export function adminUsersSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_USERS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function trackerAccessForProfileUser(userField: string | undefined | null): TrackerAccess {
  const u = userField?.trim().toLowerCase();
  if (!u) return 'none';
  if (adminUsersSet().has(u)) return 'admin';
  return 'checkin';
}
