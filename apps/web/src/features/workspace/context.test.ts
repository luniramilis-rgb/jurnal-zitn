import { describe, expect, it } from 'vitest';

import { hasContext, parseContext } from './context';

describe('parseContext (ZITN-TECH-029 Fase 3)', () => {
  it('membaca tanggal/symbol/tf/akun dari query', () => {
    expect(parseContext('?tanggal=2026-09-29&symbol=bbri&tf=1Y&akun=Utama')).toEqual({
      tanggal: '2026-09-29',
      symbol: 'BBRI',
      tf: '1Y',
      account: 'Utama',
    });
  });

  it('menerima alias account dan mengabaikan tanggal tak sah', () => {
    expect(parseContext('?tanggal=29-09-2026&account=US').tanggal).toBe('');
    expect(parseContext('?account=US').account).toBe('US');
  });

  it('kosong saat tak ada konteks', () => {
    const ctx = parseContext('');
    expect(hasContext(ctx)).toBe(false);
    expect(ctx).toEqual({ tanggal: '', symbol: '', tf: '', account: '' });
  });
});
