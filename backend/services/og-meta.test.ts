import { describe, it, expect } from 'vitest';
import {
  buildOgHeadTags,
  escapeHtmlAttr,
  isAuthGatedPath,
  isSandboxPath,
  pageTitle,
  resolveOgMeta,
  SITE_NAME,
  truncateDescription,
} from './og-meta';

describe('og-meta', () => {
  it('escapeHtmlAttr encodes special characters', () => {
    expect(escapeHtmlAttr('a & b "c"')).toBe('a &amp; b &quot;c&quot;');
  });

  it('truncateDescription shortens long text', () => {
    const long = 'word '.repeat(80).trim();
    expect(truncateDescription(long, 50).endsWith('…')).toBe(true);
    expect(truncateDescription(long, 50).length).toBeLessThanOrEqual(50);
  });

  it('pageTitle appends site name', () => {
    expect(pageTitle('Groups')).toBe(`Groups | ${SITE_NAME}`);
  });

  it('buildOgHeadTags includes fb:app_id when provided', () => {
    const html = buildOgHeadTags({
      title: 'Test | DTV Tracker',
      description: 'Desc',
      canonicalUrl: 'https://tracker.dtv.org.uk/groups',
      imageUrl: 'https://tracker.dtv.org.uk/img/logo-930.jpg',
    }, '12345');
    expect(html).toContain('property="fb:app_id" content="12345"');
    expect(html).toContain('property="og:site_name"');
  });

  it('buildOgHeadTags omits fb:app_id when empty', () => {
    const html = buildOgHeadTags({
      title: 'Test',
      description: 'Desc',
      canonicalUrl: 'https://example.com/',
      imageUrl: 'https://example.com/img.png',
    }, '');
    expect(html).not.toContain('fb:app_id');
  });

  it('isSandboxPath matches sandbox routes', () => {
    expect(isSandboxPath('/sandbox')).toBe(true);
    expect(isSandboxPath('/sandbox/session-card')).toBe(true);
    expect(isSandboxPath('/groups')).toBe(false);
  });

  it('isAuthGatedPath matches protected SPA routes', () => {
    expect(isAuthGatedPath('/profiles')).toBe(true);
    expect(isAuthGatedPath('/profiles/jane-doe')).toBe(true);
    expect(isAuthGatedPath('/entries')).toBe(true);
    expect(isAuthGatedPath('/tools')).toBe(true);
    expect(isAuthGatedPath('/projects/foo/upload')).toBe(true);
    expect(isAuthGatedPath('/groups')).toBe(false);
    expect(isAuthGatedPath('/sessions/sat/2026-06-27')).toBe(false);
  });

  it('resolveOgMeta returns null for sandbox', async () => {
    const meta = await resolveOgMeta('/sandbox', 'https://tracker.dtv.org.uk');
    expect(meta).toBeNull();
  });

  it('resolveOgMeta returns static list page meta', async () => {
    const meta = await resolveOgMeta('/groups', 'https://tracker.dtv.org.uk');
    expect(meta?.title).toBe(`Groups | ${SITE_NAME}`);
    expect(meta?.canonicalUrl).toBe('https://tracker.dtv.org.uk/groups');
    expect(meta?.imageUrl).toContain('/img/logo-930.jpg');
  });

  it('resolveOgMeta returns site default for auth-gated paths', async () => {
    const meta = await resolveOgMeta('/profiles', 'https://tracker.dtv.org.uk');
    expect(meta?.title).toBe(SITE_NAME);
    expect(meta?.description).toContain('Volunteer hours');
  });
});
