import { createHmac } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import {
  fetchCandles,
  fetchSheetContext,
  isContextConfigured,
  signContextToken,
  withChartLinks,
} from './journal-context';

const SECRET = 'rahasia-uji';

function verifyToken(token: string, secret: string) {
  const [body, sig] = token.split('.');
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  return { body, sig, expected };
}

describe('signContextToken', () => {
  it('menandatangani payload journal_context dengan format yang sama seperti ZITN', () => {
    const token = signContextToken('u1', SECRET, 1_000_000);
    const { body, sig, expected } = verifyToken(token, SECRET);
    expect(sig).toBe(expected);

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    expect(payload).toEqual({
      purpose: 'journal_context',
      uid: 'u1',
      iat: 1_000_000,
      exp: 1_000_000 + 300_000,
    });
  });

  it('tanda tangan berbeda untuk rahasia berbeda', () => {
    const token = signContextToken('u1', SECRET, 0);
    const { sig, expected } = verifyToken(token, 'rahasia-lain');
    expect(sig).not.toBe(expected);
  });
});

describe('isContextConfigured', () => {
  it('butuh basis ZITN dan rahasia bersama', () => {
    expect(isContextConfigured({})).toBe(false);
    expect(isContextConfigured({ ZITN_BASE_URL: 'https://zitn.test' })).toBe(false);
    expect(isContextConfigured({ JOURNAL_SSO_SECRET: 's' })).toBe(false);
    expect(
      isContextConfigured({ ZITN_BASE_URL: 'https://zitn.test', JOURNAL_SSO_SECRET: 's' }),
    ).toBe(true);
  });
});

describe('fetchSheetContext', () => {
  it('memanggil ZITN dengan tanggal + Bearer, lalu mem-whitelist cuplikan', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          tersedia: true,
          tanggal: '2026-09-27',
          asof: '2026-09-27',
          simbol: [
            { market: 'ID', ticker: 'BBBB' },
            { market: 'US', ticker: 'CCCC' },
          ],
          level_watch: [{ market: 'ID', ticker: 'AAAA' }],
          // Bidang asing harus dibuang, bukan diteruskan.
          catatan: 'rahasia',
          harga: 1234,
        }),
        { status: 200 },
      ),
    );

    const { status, body } = await fetchSheetContext({
      baseUrl: 'https://zitn.test',
      secret: SECRET,
      uid: 'u1',
      tanggal: '2026-09-27',
      fetchImpl,
    });

    expect(status).toBe(200);
    expect(body).toEqual({
      ok: true,
      tersedia: true,
      tanggal: '2026-09-27',
      asof: '2026-09-27',
      simbol: [
        { market: 'ID', ticker: 'BBBB' },
        { market: 'US', ticker: 'CCCC' },
      ],
      level_watch: [{ market: 'ID', ticker: 'AAAA' }],
      rows: [],
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://zitn.test/api/journal/context?tanggal=2026-09-27');
    const auth = (init.headers as Record<string, string>).Authorization;
    expect(auth.startsWith('Bearer ')).toBe(true);
    const { body: tokenBody, sig, expected } = verifyToken(auth.slice(7), SECRET);
    expect(sig).toBe(expected);
    expect(JSON.parse(Buffer.from(tokenBody, 'base64url').toString('utf8')).purpose).toBe(
      'journal_context',
    );
  });

  it('meneruskan status non-200 sebagai ok:false + error (fail-closed)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: false, error: 'data_ditahan' }), { status: 503 }),
      );

    const { status, body } = await fetchSheetContext({
      baseUrl: 'https://zitn.test',
      secret: SECRET,
      uid: 'u1',
      fetchImpl,
    });

    expect(status).toBe(503);
    expect(body).toMatchObject({ ok: false, tersedia: false, error: 'data_ditahan' });
  });

  it('kegagalan jaringan -> 502 tanpa melempar', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('boom'));
    const { status, body } = await fetchSheetContext({
      baseUrl: 'https://zitn.test',
      secret: SECRET,
      uid: 'u1',
      fetchImpl,
    });
    expect(status).toBe(502);
    expect(body).toMatchObject({ ok: false, tersedia: false, error: 'tidak_tersedia' });
  });

  it('membuang entri berbentuk salah dan membatasi jumlah', async () => {
    const entries = Array.from({ length: 600 }, (_, i) => ({ market: 'ID', ticker: `T${i}` }));
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          tersedia: true,
          tanggal: '2026-09-27',
          asof: '2026-09-27',
          simbol: [...entries, { ticker: 'X' }, null],
          level_watch: 'bukan-array',
        }),
        { status: 200 },
      ),
    );

    const { body } = await fetchSheetContext({
      baseUrl: 'https://zitn.test',
      secret: SECRET,
      uid: 'u1',
      fetchImpl,
    });

    expect(body.simbol).toHaveLength(500);
    expect(body.level_watch).toEqual([]);
  });
});

describe('withChartLinks � tautan ke chart ZITN (opsi B)', () => {
  const base = 'https://zenitn.test';

  it('menautkan entri pasar ID ke chart dengan tanggal + ticker', () => {
    const body = {
      ok: true,
      tersedia: true,
      tanggal: '2026-09-27',
      asof: '2026-09-27',
      simbol: [{ market: 'ID', ticker: 'BBRI' }],
      level_watch: [{ market: 'ID', ticker: 'TLKM' }],
    };
    const out = withChartLinks(body, base);
    expect(out.simbol[0].chartUrl).toBe(
      'https://zenitn.test/daily/chart/?symbol=BBRI&tf=1Y&tanggal=2026-09-27',
    );
    expect(out.level_watch[0].chartUrl).toBe(
      'https://zenitn.test/daily/chart/?symbol=TLKM&tf=1Y&tanggal=2026-09-27',
    );
    // IDX memakai tanggal, bukan ?pasar (default pasar chart = id).
    expect(out.simbol[0].chartUrl).not.toContain('pasar=');
    // Tidak ada bidang data lain yang ditambah.
    expect(Object.keys(out.simbol[0]).sort()).toEqual(['chartUrl', 'market', 'ticker']);
  });

  it('menautkan pasar US ke chart dengan ?pasar=us (ZITN-TECH-025)', () => {
    const body = {
      ok: true,
      tersedia: true,
      tanggal: '2026-09-27',
      asof: '2026-09-27',
      simbol: [{ market: 'US', ticker: 'AAPL' }],
      level_watch: [{ market: 'US', ticker: 'MSFT' }],
    };
    const out = withChartLinks(body, base);
    expect(out.simbol[0].chartUrl).toBe(
      'https://zenitn.test/daily/chart/?symbol=AAPL&tf=1Y&pasar=us',
    );
    expect(out.level_watch[0].chartUrl).toBe(
      'https://zenitn.test/daily/chart/?symbol=MSFT&tf=1Y&pasar=us',
    );
    // US menandai pasar lewat ?pasar=us, bukan ?tanggal.
    expect(out.simbol[0].chartUrl).not.toContain('tanggal=');
    // Kode pasar dari ZITN boleh huruf kecil; tautan tetap dibangun.
    const lower = withChartLinks(
      { ...body, simbol: [{ market: 'us', ticker: 'AAPL' }], level_watch: [] },
      base,
    );
    expect(lower.simbol[0].chartUrl).toBe(
      'https://zenitn.test/daily/chart/?symbol=AAPL&tf=1Y&pasar=us',
    );
    // Tidak ada bidang data lain yang ditambah (tanpa harga).
    expect(Object.keys(out.simbol[0]).sort()).toEqual(['chartUrl', 'market', 'ticker']);
  });

  it('tidak menautkan pasar tanpa panel chart (bukan menambah data)', () => {
    const body = {
      ok: true,
      tersedia: true,
      tanggal: '2026-09-27',
      asof: '2026-09-27',
      simbol: [{ market: 'SG', ticker: 'D05' }],
      level_watch: [],
    };
    expect(withChartLinks(body, base).simbol[0].chartUrl).toBeUndefined();
  });

  it('tidak mengubah apa pun bila tak ok atau tanpa tanggal', () => {
    const off = {
      ok: false,
      tersedia: false,
      tanggal: '2026-09-27',
      asof: null,
      simbol: [],
      level_watch: [],
    };
    expect(withChartLinks(off, base)).toBe(off);

    const noDate = {
      ok: true,
      tersedia: true,
      tanggal: null,
      asof: null,
      simbol: [{ market: 'ID', ticker: 'BBRI' }],
      level_watch: [],
    };
    expect(withChartLinks(noDate, base).simbol[0].chartUrl).toBeUndefined();
  });
});

describe('fetchCandles — OHLCV melalui jembatan (Fase 3c)', () => {
  it('memanggil ZITN dan menyaring deret ke OHLCV saja', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          market: 'id',
          symbol: 'BBCA',
          name: 'Bank Contoh',
          sector: 'Financials',
          asof: '2026-09-29',
          bars: 2,
          t: ['2026-09-28', '2026-09-29'],
          o: [1, 2],
          h: [3, 4],
          l: [0.5, 1.5],
          c: [2, 3],
          v: [10, 20],
          extra_indicator_a: { '10': [1, 2] },
          extra_indicator_b: [1, 2],
        }),
        { status: 200 },
      ),
    );

    const { status, body } = await fetchCandles({
      baseUrl: 'https://zitn.test',
      secret: SECRET,
      uid: 'u1',
      market: 'id',
      ticker: 'bbca',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(status).toBe(200);
    expect(body.symbol).toBe('BBCA');
    expect(body.t).toEqual(['2026-09-28', '2026-09-29']);
    expect(body.c).toEqual([2, 3]);
    // Indikator tidak diteruskan (pertahanan berlapis) — kolom apa pun di luar
    // OHLCV dibuang; nama field indikator ZITN tidak disebut di repo publik.
    expect('extra_indicator_a' in body).toBe(false);
    expect('extra_indicator_b' in body).toBe(false);

    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toContain('/api/journal/candles?market=id&ticker=BBCA');
  });

  it('ticker tak sah -> 400 tanpa memanggil ZITN', async () => {
    const fetchImpl = vi.fn();
    const { status } = await fetchCandles({
      baseUrl: 'https://zitn.test',
      secret: SECRET,
      uid: 'u1',
      market: 'id',
      ticker: '../x',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
