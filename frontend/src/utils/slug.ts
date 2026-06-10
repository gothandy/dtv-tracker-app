/**
 * URL-safe slug — mirrors nameToSlug() in backend/services/data-layer.ts
 */
export function nameToSlug(name: string | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
