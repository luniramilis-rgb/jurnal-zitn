// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { translate } from '@jurnal-zitn/shared';

import { apiErrorCode, apiErrorMessage } from './api-error';

const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) =>
  translate('id', k, v);

describe('apiErrorCode', () => {
  it('membaca kode dari amplop { error: { code } }', () => {
    expect(apiErrorCode({ error: { code: 'UNAUTHORIZED' } })).toBe('UNAUTHORIZED');
  });
  it('menerima code datar dan menolak non-objek', () => {
    expect(apiErrorCode({ code: 'FORBIDDEN' })).toBe('FORBIDDEN');
    expect(apiErrorCode(null)).toBeUndefined();
    expect(apiErrorCode('boom')).toBeUndefined();
  });
});

describe('apiErrorMessage', () => {
  it('memetakan kode dikenal ke salinan Indonesia', () => {
    expect(apiErrorMessage({ error: { code: 'UNAUTHORIZED' } }, t)).toBe(
      'Email atau kata sandi salah.',
    );
    expect(apiErrorMessage({ error: { code: 'RATE_LIMITED' } }, t)).toBe(
      'Terlalu banyak permintaan — coba lagi nanti.',
    );
  });

  it('kode tak dikenal / tanpa kode → pesan generik (bukan pesan Inggris server)', () => {
    const err = { error: { code: 'SOMETHING_NEW' }, message: 'English server text' };
    expect(apiErrorMessage(err, t)).toBe('Terjadi kesalahan. Silakan coba lagi.');
    expect(apiErrorMessage(new Error('English server text'), t)).toBe(
      'Terjadi kesalahan. Silakan coba lagi.',
    );
  });
});
