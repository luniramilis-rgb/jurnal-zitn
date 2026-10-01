import { describe, expect, it } from 'vitest';

import { safeLocalRedirect } from './redirect';

describe('safeLocalRedirect (ZITN-TECH-029)', () => {
  it('keeps a safe local path (with query and hash)', () => {
    expect(safeLocalRedirect('/advertising')).toBe('/advertising');
    expect(safeLocalRedirect('/x?y=1#z')).toBe('/x?y=1#z');
    expect(safeLocalRedirect('/lembar?tanggal=2026-09-29')).toBe('/lembar?tanggal=2026-09-29');
  });

  it('falls back for absolute URLs and schemes', () => {
    expect(safeLocalRedirect('https://evil.example')).toBe('/dashboard');
    expect(safeLocalRedirect('javascript:alert(1)')).toBe('/dashboard');
    expect(safeLocalRedirect('/a:b')).toBe('/dashboard');
  });

  it('falls back for protocol-relative and backslash tricks', () => {
    expect(safeLocalRedirect('//evil.example')).toBe('/dashboard');
    expect(safeLocalRedirect('/\\evil')).toBe('/dashboard');
    expect(safeLocalRedirect('/%2F%2Fevil')).toBe('/dashboard');
    expect(safeLocalRedirect('/%3Aescaped')).toBe('/dashboard');
  });

  it('falls back for non-paths, empty and non-strings', () => {
    expect(safeLocalRedirect('evil')).toBe('/dashboard');
    expect(safeLocalRedirect('')).toBe('/dashboard');
    expect(safeLocalRedirect('   ')).toBe('/dashboard');
    expect(safeLocalRedirect(undefined)).toBe('/dashboard');
    expect(safeLocalRedirect(null)).toBe('/dashboard');
    expect(safeLocalRedirect(42)).toBe('/dashboard');
  });

  it('honours a custom fallback', () => {
    expect(safeLocalRedirect('https://evil.example', '/')).toBe('/');
  });
});
