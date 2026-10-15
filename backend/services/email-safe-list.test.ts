import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./repositories/profiles-repository', () => ({
  profilesRepository: {
    getAll: vi.fn(async () => [
      { ID: 1, User: 'Andrew.Davies@dtv.org.uk', Email: 'andrew@example.com, Andy.Test@example.com' },
      { ID: 2, User: 'staff@dtv.org.uk', Email: 'staff.personal@example.com' },
      { ID: 3, Email: 'volunteer@example.com' },
    ]),
  },
}));

import { assertSafeRecipient, safeRecipients, UnsafeRecipientError } from './email-safe-list';
import { platform } from '../config';

const LIVE = 'https://dtvolunteers.sharepoint.com/sites/tracker';
const PREVIEW = 'https://dtvolunteers.sharepoint.com/sites/tracker-preview';

describe('safeRecipients', () => {
  const admins = new Set(['andrew.davies@dtv.org.uk']);

  it('includes admin accounts and every address on their own profiles', () => {
    const safe = safeRecipients(admins, [
      { User: 'Andrew.Davies@dtv.org.uk', Email: 'andrew@example.com, Andy.Test@example.com' },
    ]);
    expect([...safe].sort()).toEqual(['andrew.davies@dtv.org.uk', 'andrew@example.com', 'andy.test@example.com']);
  });

  it('ignores profiles of other users and profiles with no User', () => {
    const safe = safeRecipients(admins, [
      { User: 'staff@dtv.org.uk', Email: 'staff.personal@example.com' },
      { Email: 'volunteer@example.com' },
    ]);
    expect([...safe]).toEqual(['andrew.davies@dtv.org.uk']);
  });

  it('does not allow plus-addresses or other variants', () => {
    const safe = safeRecipients(admins, [{ User: 'andrew.davies@dtv.org.uk', Email: 'andrew@example.com' }]);
    expect(safe.has('andrew+test@example.com')).toBe(false);
    expect(safe.has('andrew.davies+test@dtv.org.uk')).toBe(false);
  });
});

describe('assertSafeRecipient', () => {
  beforeEach(() => {
    vi.stubEnv('TRACKER_ADMIN_USERS', 'andrew.davies@dtv.org.uk');
  });
  afterEach(() => { vi.unstubAllEnvs(); platform.isLocal = false; });

  it('allows anyone in production', async () => {
    vi.stubEnv('TRACKER_SHAREPOINT_SITE_URL', LIVE);
    await expect(assertSafeRecipient('volunteer@example.com')).resolves.toBeUndefined();
  });

  it('treats a local run as not production, even pointed at the live site', async () => {
    vi.stubEnv('TRACKER_SHAREPOINT_SITE_URL', LIVE);
    platform.isLocal = true;
    await expect(assertSafeRecipient('volunteer@example.com')).rejects.toThrow(/^Local development only sends email/);
    await expect(assertSafeRecipient('andrew.davies@dtv.org.uk')).resolves.toBeUndefined();
  });

  it('allows safe-list addresses on a slot, ignoring case and spaces', async () => {
    vi.stubEnv('TRACKER_SHAREPOINT_SITE_URL', PREVIEW);
    await expect(assertSafeRecipient(' Andy.Test@Example.com ')).resolves.toBeUndefined();
    await expect(assertSafeRecipient('andrew.davies@dtv.org.uk')).resolves.toBeUndefined();
  });

  it('refuses everyone else on a slot, naming the environment and address', async () => {
    vi.stubEnv('TRACKER_SHAREPOINT_SITE_URL', PREVIEW);
    await expect(assertSafeRecipient('volunteer@example.com')).rejects.toThrow(UnsafeRecipientError);
    await expect(assertSafeRecipient('staff.personal@example.com')).rejects.toThrow(
      /^Preview only sends email .* not to staff\.personal@example\.com/
    );
  });
});
