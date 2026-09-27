import { describe, expect, it } from 'vitest';

import { SSO_PURPOSE, signSsoToken, verifySsoToken } from './sso-token';

const SECRET = 'rahasia-sso-uji-jangan-dipakai';
const NOW = Date.parse('2026-09-26T12:00:00Z');

function payload(overrides: Record<string, unknown> = {}) {
  return {
    purpose: SSO_PURPOSE,
    uid: 'zitn-user-1',
    email: 'a@b.c',
    iat: NOW,
    exp: NOW + 120_000,
    jti: 'nonce-1234567890',
    ...overrides,
  } as Parameters<typeof signSsoToken>[0];
}

describe('verifySsoToken', () => {
  it('menerima token yang sah dan mengembalikan payload', () => {
    const token = signSsoToken(payload(), SECRET);
    const out = verifySsoToken(token, SECRET, NOW);
    expect(out?.uid).toBe('zitn-user-1');
    expect(out?.purpose).toBe(SSO_PURPOSE);
    expect(out?.jti).toBe('nonce-1234567890');
  });

  it('menolak rahasia salah, token diubah, dan bentuk cacat', () => {
    const token = signSsoToken(payload(), SECRET);
    expect(verifySsoToken(token, 'rahasia-lain', NOW)).toBeNull();
    expect(verifySsoToken(token.slice(0, -1) + 'A', SECRET, NOW)).toBeNull();
    expect(verifySsoToken('', SECRET, NOW)).toBeNull();
    expect(verifySsoToken('tanpa-titik', SECRET, NOW)).toBeNull();
    expect(verifySsoToken('.sig', SECRET, NOW)).toBeNull();
    expect(verifySsoToken('body.', SECRET, NOW)).toBeNull();
    expect(verifySsoToken(undefined, SECRET, NOW)).toBeNull();
  });

  it('fail-closed tanpa secret', () => {
    const token = signSsoToken(payload(), SECRET);
    expect(verifySsoToken(token, '', NOW)).toBeNull();
  });

  it('menolak kedaluwarsa', () => {
    const token = signSsoToken(payload({ exp: NOW - 1 }), SECRET);
    expect(verifySsoToken(token, SECRET, NOW)).toBeNull();
  });

  it('menolak purpose lain (token sesi ZITN tidak boleh dipakai)', () => {
    const token = signSsoToken(payload({ purpose: 'session' }), SECRET);
    expect(verifySsoToken(token, SECRET, NOW)).toBeNull();
  });

  it.each([
    ['uid kosong', { uid: '' }],
    ['uid bukan string', { uid: 42 }],
    ['jti pendek', { jti: 'x' }],
    ['exp bukan angka', { exp: 'nanti' }],
    ['email salah tipe', { email: 123 }],
  ])('menolak payload cacat: %s', (_label, patch) => {
    const token = signSsoToken(payload(patch), SECRET);
    expect(verifySsoToken(token, SECRET, NOW)).toBeNull();
  });

  it('kompatibel dengan format ZITN (base64url.tanda tangan HMAC)', () => {
    const token = signSsoToken(payload(), SECRET);
    const [body, sig] = token.split('.');
    expect(body).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(sig).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).not.toContain('=');
  });
});
