import { describe, expect, it } from 'vitest';

import { ssoRedirectTarget } from './sso-redirect';

describe('ssoRedirectTarget — konteks tanggal dari tautan lembar', () => {
  it('membawa tanggal sah ke halaman konteks lembar', () => {
    expect(ssoRedirectTarget('2026-09-25')).toBe('/lembar?tanggal=2026-09-25');
  });

  it('memangkas spasi di sekitar tanggal', () => {
    expect(ssoRedirectTarget(' 2026-09-25 ')).toBe('/lembar?tanggal=2026-09-25');
  });

  it('mengabaikan tanggal kosong atau tak sah (bukan error)', () => {
    expect(ssoRedirectTarget(undefined)).toBe('/');
    expect(ssoRedirectTarget(null)).toBe('/');
    expect(ssoRedirectTarget('')).toBe('/');
    expect(ssoRedirectTarget('25-09-2026')).toBe('/');
    expect(ssoRedirectTarget('2026-9-5')).toBe('/');
    expect(ssoRedirectTarget('../../etc/passwd')).toBe('/');
  });
});
