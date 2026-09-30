/**
 * Jembatan konteks Jurnal ZITN -> ZITN (lembar harian), sisi baca (ZITN-TECH-019).
 *
 * Jurnal **hanya membaca**: ia menandatangani token `purpose: journal_context` dengan
 * `JOURNAL_SSO_SECRET` yang dibagi, memanggil `GET {ZITN_BASE_URL}/api/journal/context`, lalu
 * meneruskan **cuplikan terpilih** (tanggal, asof, daftar simbol, level watch) ke UI.
 *
 * Batas mengikat:
 *   * **tanpa salinan data** — tidak pernah mengambil/menyimpan `signals_*.csv`, tidak merender
 *     ulang lembar, tidak memakai iframe; hanya empat bidang cuplikan yang di-whitelist.
 *   * **fail-closed** — tanpa `ZITN_BASE_URL`/`JOURNAL_SSO_SECRET` konteks tidak diambil.
 *   * **tanpa hitung ulang** — jurnal tidak menghitung angka; ZITN yang menyiapkan cuplikan.
 *   * Modul ini MURNI (tanpa DB): `fetch` dapat disuntik untuk uji.
 */

import { createHmac } from 'node:crypto';

export const CONTEXT_PURPOSE = 'journal_context';
const CONTEXT_TTL_MS = 300_000;
const TIMEOUT_MS = 5_000;
const MAX_ENTRIES = 500;

export interface SheetContextEntry {
  market: string;
  ticker: string;
  /**
   * Tautan ke **chart ZITN** bila entri ini dapat dipetakan ke panel chart (pasar **IDX** dan
   * **US**). IDX: `/daily/chart/?tanggal=…#TICKER`; US: `/daily/chart/?pasar=us#TICKER`
   * (ZITN-TECH-025). Jurnal **tidak** menggambar chart dan **tidak** menerima harga; tautan ini
   * hanya memindahkan pengguna ke permukaan Lembar Harian dengan entitlement yang sama.
   */
  chartUrl?: string;
}

/**
 * Baris lembar ber-harga (ZITN-TECH-029 Fase 3b, D-4(a)/(b)). Hanya untuk **workspace berbayar**;
 * bentuknya distabilkan oleh allowlist di kedua sisi (ZITN & jurnal). Angka boleh `null`.
 */
export interface SheetRow {
  market: string;
  ticker: string;
  name: string | null;
  kind: string | null;
  date: string | null;
  direction: string | null;
  order_type: string | null;
  rule: string | null;
  entry: number | null;
  target: number | null;
  stop: number | null;
  entry_prev_close: number | null;
  distance_pct: number | null;
  size_qty: number | null;
  size_unit: string | null;
  data_status: string | null;
  evidence_status: string | null;
}

export const SHEET_ROW_FIELDS: (keyof SheetRow)[] = [
  'market',
  'ticker',
  'name',
  'kind',
  'date',
  'direction',
  'order_type',
  'rule',
  'entry',
  'target',
  'stop',
  'entry_prev_close',
  'distance_pct',
  'size_qty',
  'size_unit',
  'data_status',
  'evidence_status',
];

export interface SheetContext {
  ok: boolean;
  tersedia: boolean;
  tanggal: string | null;
  asof: string | null;
  simbol: SheetContextEntry[];
  level_watch: SheetContextEntry[];
  /** Baris lembar ber-harga (workspace); `fetchSheetContext` selalu mengisinya, boleh absen di fixture. */
  rows?: SheetRow[];
  error?: string;
}

export interface ContextConfig {
  ZITN_BASE_URL?: string;
  JOURNAL_SSO_SECRET?: string;
}

/** Deret OHLCV satu emiten untuk chart workspace (ZITN-TECH-029 Fase 3c). */
export interface CandlePayload {
  ok: boolean;
  market: string;
  symbol: string;
  name: string;
  sector: string;
  asof: string | null;
  bars: number;
  t: unknown[];
  o: unknown[];
  h: unknown[];
  l: unknown[];
  c: unknown[];
  v: unknown[];
  error?: string;
}

export const CANDLE_MAX_BARS = 750;
const CANDLE_SERIES = ['t', 'o', 'h', 'l', 'c', 'v'] as const;
const TICKER_RE = /^[A-Z0-9][A-Z0-9.-]{0,19}$/;

/** Bentuk kosong yang stabil (dipakai error & fail-closed). */
export function emptyCandles(market: string, symbol: string, error?: string): CandlePayload {
  return {
    ok: false,
    market,
    symbol,
    name: '',
    sector: '',
    asof: null,
    bars: 0,
    t: [],
    o: [],
    h: [],
    l: [],
    c: [],
    v: [],
    error,
  };
}

/** Saring respons ZITN ke `t/o/h/l/c/v` (+ meta), batasi bar (pertahanan berlapis). */
function pickCandleBody(obj: Record<string, unknown>): CandlePayload {
  const series: Record<string, unknown[]> = {};
  for (const key of CANDLE_SERIES) {
    const arr = Array.isArray(obj[key]) ? (obj[key] as unknown[]) : [];
    series[key] = arr.length > CANDLE_MAX_BARS ? arr.slice(arr.length - CANDLE_MAX_BARS) : arr;
  }
  const symbol = typeof obj.symbol === 'string' ? obj.symbol : '';
  const market = typeof obj.market === 'string' ? obj.market : '';
  return {
    ok: obj.ok === true,
    market,
    symbol,
    name: typeof obj.name === 'string' ? obj.name : '',
    sector: typeof obj.sector === 'string' ? obj.sector : '',
    asof: typeof obj.asof === 'string' ? obj.asof : null,
    bars: series.t.length,
    t: series.t,
    o: series.o,
    h: series.h,
    l: series.l,
    c: series.c,
    v: series.v,
  };
}

export interface FetchCandlesInput {
  baseUrl: string;
  secret: string;
  uid: string;
  market: string;
  ticker: string;
  nowMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Panggil ZITN `/api/journal/candles` dan kembalikan deret yang sudah di-whitelist.
 * Status non-200 diteruskan apa adanya; kegagalan jaringan → 502 `tidak_tersedia`.
 */
export async function fetchCandles(
  input: FetchCandlesInput,
): Promise<{ status: number; body: CandlePayload }> {
  const market = input.market === 'us' ? 'us' : 'id';
  const ticker = input.ticker.trim().toUpperCase();
  if (!TICKER_RE.test(ticker)) {
    return { status: 400, body: emptyCandles(market, ticker, 'ticker_tidak_sah') };
  }
  const doFetch = input.fetchImpl ?? fetch;
  const url = new URL('/api/journal/candles', input.baseUrl);
  url.searchParams.set('market', market);
  url.searchParams.set('ticker', ticker);
  const token = signContextToken(input.uid, input.secret, input.nowMs);

  let res: Response;
  try {
    res = await doFetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { status: 502, body: emptyCandles(market, ticker, 'tidak_tersedia') };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const obj = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const error = typeof obj.error === 'string' ? obj.error : undefined;
  if (!res.ok) {
    return { status: res.status, body: emptyCandles(market, ticker, error ?? 'tidak_tersedia') };
  }
  return { status: 200, body: pickCandleBody(obj) };
}

/**
 * Bangun tautan chart ZITN untuk satu entri. Panel chart ZITN memuat emiten **IDX** (`?tanggal`
 * memilih lembar hari itu) dan **US** (`?pasar=us`, ZITN-TECH-023/025). Sejak ZITN-TECH-029
 * Fase 2, emiten + rentang dibawa sebagai **query** (`?symbol=&tf=`), bukan hash — bagian dari
 * spine konteks di URL. `null` bila pasar tak punya panel atau tanggal tidak tersedia.
 */
export function chartLink(
  baseUrl: string,
  tanggal: string | null,
  entry: SheetContextEntry,
): string | null {
  if (!tanggal) return null;
  const market = String(entry.market || '').toUpperCase();
  if (market !== 'ID' && market !== 'US') return null;
  const url = new URL('/daily/chart/', baseUrl);
  url.searchParams.set('symbol', entry.ticker);
  url.searchParams.set('tf', '1Y');
  if (market === 'US') url.searchParams.set('pasar', 'us');
  else url.searchParams.set('tanggal', tanggal);
  return url.toString();
}

/**
 * Tambahkan `chartUrl` ke cuplikan (murni): hanya saat `ok`, hanya bila tanggal tersedia, dan
 * hanya untuk pasar yang punya panel chart (IDX & US). Tidak menambah bidang data lain; ZITN
 * tetap satu-satunya pemegang angkanya.
 */
export function withChartLinks(body: SheetContext, baseUrl: string): SheetContext {
  if (!body.ok || !body.tanggal) return body;
  const link = (entry: SheetContextEntry): SheetContextEntry => {
    const chartUrl = chartLink(baseUrl, body.tanggal, entry);
    return chartUrl ? { ...entry, chartUrl } : entry;
  };
  return { ...body, simbol: body.simbol.map(link), level_watch: body.level_watch.map(link) };
}

function hmacBase64url(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

/**
 * Token konteks berumur pendek, **byte-compatible** dengan `functions/lib/session.mjs` di ZITN:
 * `base64url(utf8(JSON(payload))) "." base64url(HMAC-SHA256(secret, body))`.
 */
export function signContextToken(uid: string, secret: string, nowMs: number = Date.now()): string {
  const payload = { purpose: CONTEXT_PURPOSE, uid, iat: nowMs, exp: nowMs + CONTEXT_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${hmacBase64url(secret, body)}`;
}

/** Konteks hanya diambil bila basis ZITN dan rahasia bersama sama-sama terisi. */
export function isContextConfigured(cfg: ContextConfig): boolean {
  return Boolean(cfg.ZITN_BASE_URL && cfg.JOURNAL_SSO_SECRET);
}

function isEntry(value: unknown): value is SheetContextEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return typeof e.market === 'string' && typeof e.ticker === 'string';
}

/** Ambil hanya bidang yang diizinkan (pertahanan berlapis: apa pun dari ZITN disaring lagi). */
function pickEntries(value: unknown): SheetContextEntry[] {
  return Array.isArray(value)
    ? value
        .filter(isEntry)
        .slice(0, MAX_ENTRIES)
        .map((e) => ({ market: e.market, ticker: e.ticker }))
    : [];
}

/** Saring baris workspace ke allowlist; buang baris tanpa ticker; batasi jumlah. */
function pickRows(value: unknown): SheetRow[] {
  if (!Array.isArray(value)) return [];
  const out: SheetRow[] = [];
  for (const raw of value.slice(0, MAX_ENTRIES)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.ticker !== 'string' || r.ticker.trim() === '') continue;
    const row: Record<string, unknown> = {};
    for (const field of SHEET_ROW_FIELDS) {
      row[field] = Object.prototype.hasOwnProperty.call(r, field) ? (r[field] ?? null) : null;
    }
    row.market = typeof r.market === 'string' ? r.market : '';
    row.ticker = r.ticker.trim().toUpperCase();
    out.push(row as unknown as SheetRow);
  }
  return out;
}

function emptyContext(tanggal: string | null, error?: string): SheetContext {
  return {
    ok: false,
    tersedia: false,
    tanggal,
    asof: null,
    simbol: [],
    level_watch: [],
    rows: [],
    error,
  };
}

export interface FetchContextInput {
  baseUrl: string;
  secret: string;
  uid: string;
  tanggal?: string | null;
  nowMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Panggil ZITN dan kembalikan cuplikan yang sudah di-whitelist.
 * Status non-200 dari ZITN diteruskan apa adanya + `{ok:false,tersedia:false,error}`.
 */
export async function fetchSheetContext(
  input: FetchContextInput,
): Promise<{ status: number; body: SheetContext }> {
  const doFetch = input.fetchImpl ?? fetch;
  const url = new URL('/api/journal/context', input.baseUrl);
  if (input.tanggal) url.searchParams.set('tanggal', input.tanggal);

  const token = signContextToken(input.uid, input.secret, input.nowMs);

  let res: Response;
  try {
    res = await doFetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { status: 502, body: emptyContext(input.tanggal ?? null, 'tidak_tersedia') };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const obj = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const error = typeof obj.error === 'string' ? obj.error : undefined;

  if (!res.ok) {
    return {
      status: res.status,
      body: emptyContext(input.tanggal ?? null, error ?? 'tidak_tersedia'),
    };
  }

  return {
    status: 200,
    body: {
      ok: obj.ok === true,
      tersedia: obj.tersedia === true,
      tanggal: typeof obj.tanggal === 'string' ? obj.tanggal : (input.tanggal ?? null),
      asof: typeof obj.asof === 'string' ? obj.asof : null,
      simbol: pickEntries(obj.simbol),
      level_watch: pickEntries(obj.level_watch),
      rows: pickRows(obj.rows),
    },
  };
}
