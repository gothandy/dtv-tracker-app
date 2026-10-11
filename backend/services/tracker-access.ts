/** Microsoft Tracker tier implied by Profile `User` + `TRACKER_ADMIN_USERS`. Trusted API responses only. */

import type { TrackerAccess } from '../../types/api-responses';
import { isAdminEmail } from '../config';

export function trackerAccessForProfileUser(userField: string | undefined | null): TrackerAccess {
  const u = userField?.trim().toLowerCase();
  if (!u) return 'none';
  if (isAdminEmail(u)) return 'admin';
  return 'checkin';
}
