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

describe('ssoRedirectTarget — redirect lokal pasca-login (ZITN-TECH-029)', () => {
  it('menghormati redirect lokal yang aman', () => {
    expect(ssoRedirectTarget(undefined, '/advertising')).toBe('/advertising');
    expect(ssoRedirectTarget(undefined, '/lembar?tanggal=2026-09-25')).toBe(
      '/lembar?tanggal=2026-09-25',
    );
  });

  it('redirect yang aman menang atas tanggal', () => {
    expect(ssoRedirectTarget('2026-09-25', '/advertising')).toBe('/advertising');
  });

  it('jatuh ke perilaku tanggal bila redirect kosong', () => {
    expect(ssoRedirectTarget('2026-09-25', '')).toBe('/lembar?tanggal=2026-09-25');
    expect(ssoRedirectTarget('2026-09-25', undefined)).toBe('/lembar?tanggal=2026-09-25');
  });

  it('mengabaikan redirect tak aman lalu jatuh ke tanggal/`/`', () => {
    expect(ssoRedirectTarget('2026-09-25', 'https://evil.example')).toBe(
      '/lembar?tanggal=2026-09-25',
    );
    expect(ssoRedirectTarget(undefined, '//evil.example')).toBe('/');
    expect(ssoRedirectTarget(undefined, 'javascript:alert(1)')).toBe('/');
  });
});
