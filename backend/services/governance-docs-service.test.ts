import { describe, it, expect } from 'vitest';
import { fileSlug } from './governance-docs-service';

describe('fileSlug', () => {
  it('slugifies PDF basename like profile nameToSlug and keeps .pdf', () => {
    expect(fileSlug('(#2305774137) Certificate - C&SO Select Renewal Policy from Zurich.pdf'))
      .toBe('2305774137-certificate-c-so-select-renewal-policy-from-zurich.pdf');
  });

  it('slugifies simple filenames', () => {
    expect(fileSlug('sds1-aspen4.pdf')).toBe('sds1-aspen4.pdf');
  });
});
