/**
 * What each role can do, in one place. Code asks `can(role, 'viewTemplates')`, never
 * "is this an Admin?", so moving a permission to another role is a one-line change here.
 * The server checks the same table (backend/middleware/require-permission.ts), so the
 * screens and the API always agree.
 *
 * Today this covers email templates only; the rest of the app still checks roles directly
 * and moves over as each page is next touched (#293).
 */

export type Role = 'admin' | 'checkin' | 'selfservice';

export const PERMISSIONS = {
  /** See the Templates pages: each template's subject, text and a preview. */
  viewTemplates: ['checkin', 'admin'],
  /** Edit a template (for now, a link to its row in SharePoint). */
  editTemplates: ['admin'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return !!role && (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
