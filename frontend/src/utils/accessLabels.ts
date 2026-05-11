/** User-facing names for access tiers (UI copy only). */

export const ACCESS_LABEL_PUBLIC = 'Public'
export const ACCESS_LABEL_SELF_SERVICE = 'My Tracker'
export const ACCESS_LABEL_CHECK_IN = 'Tracker Assist'
export const ACCESS_LABEL_ADMIN = 'Tracker Admin'

/** Burger menu + `/tools` page heading only (utilities). Badges, welcome, and legal copy use {@link ACCESS_LABEL_ADMIN}. */
export const ACCESS_LABEL_ADMIN_TOOLS_PAGE = 'Tools'

/** Snapshot for the About modal “Logged in” row — same flags as `useViewer().context`. */
export interface LoginTierSnapshot {
  ready: boolean
  isAdmin: boolean
  isCheckIn: boolean
  isSelfService: boolean
  isPublic: boolean
}

/** User-facing tier: Public, My Tracker, Tracker Assist, or Tracker Admin. */
export function loginTierLabel(s: LoginTierSnapshot): string {
  if (!s.ready) return 'Loading…'
  if (s.isPublic) return ACCESS_LABEL_PUBLIC
  if (s.isAdmin) return ACCESS_LABEL_ADMIN
  if (s.isCheckIn) return ACCESS_LABEL_CHECK_IN
  if (s.isSelfService) return ACCESS_LABEL_SELF_SERVICE
  return ACCESS_LABEL_PUBLIC
}
