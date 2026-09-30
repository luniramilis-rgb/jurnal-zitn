/**
 * Layanan jembatan konteks (ZITN-TECH-019): siapkan cuplikan lembar untuk pengguna yang
 * masuk lewat SSO ZITN. Hanya membaca; tidak menyimpan apa pun.
 *
 * Fail-closed di tiga titik:
 *   1. `ZITN_BASE_URL`/`JOURNAL_SSO_SECRET` belum diisi  -> 503 `konteks_nonaktif`;
 *   2. akun belum tertaut ke ZITN (`zitn_user_id` kosong) -> 409 `belum_tertaut`;
 *   3. ZITN menolak (gerbang jurnal/D12 mati)             -> status ZITN diteruskan apa adanya.
 */

import { db } from '@/db';
import { selectZitnIdByUserId, selectEntitlementByUserId } from '@/features/auth/sso.query';
import { config } from '@/lib/config';

import {
  emptyCandles,
  fetchCandles,
  fetchSheetContext,
  isContextConfigured,
  withChartLinks,
  type CandlePayload,
  type SheetContext,
} from './journal-context';

export interface SheetContextResult {
  status: number;
  body: SheetContext;
}

function unavailable(status: number, tanggal: string | null, error: string): SheetContextResult {
  return {
    status,
    body: { ok: false, tersedia: false, tanggal, asof: null, simbol: [], level_watch: [], error },
  };
}

/**
 * Gerbang lunak (Fase 4): entitlement sah bila `entitled_until` ada dan masih di masa depan.
 * `null` (belum pernah di-sync / tidak berhak) = lapse → 402 `paywall`.
 */
async function entitlementLapsed(userId: string): Promise<boolean> {
  const until = await selectEntitlementByUserId(db, userId);
  return until === null || until.getTime() <= Date.now();
}

export async function getSheetContextForUser(
  userId: string,
  tanggal: string | null,
): Promise<SheetContextResult> {
  if (!isContextConfigured(config)) return unavailable(503, tanggal, 'konteks_nonaktif');

  const zitnUserId = await selectZitnIdByUserId(db, userId);
  if (!zitnUserId) return unavailable(409, tanggal, 'belum_tertaut');
  if (await entitlementLapsed(userId)) return unavailable(402, tanggal, 'paywall');

  const result = await fetchSheetContext({
    baseUrl: config.ZITN_BASE_URL as string,
    secret: config.JOURNAL_SSO_SECRET as string,
    uid: zitnUserId,
    tanggal,
  });

  // Opsi B (keputusan pemilik 2026-09-28): jurnal tidak menggambar chart; tiap simbol IDX diberi
  // tautan ke chart Lembar Harian ZITN. Murni menambah URL, bukan data pasar.
  return {
    status: result.status,
    body: withChartLinks(result.body, config.ZITN_BASE_URL as string),
  };
}

export interface CandleResult {
  status: number;
  body: CandlePayload;
}

/** Deret OHLCV satu emiten lewat jembatan yang sama (Fase 3c). Fail-closed seperti konteks. */
export async function getCandlesForUser(
  userId: string,
  market: string,
  ticker: string,
): Promise<CandleResult> {
  const normalizedMarket = market === 'us' ? 'us' : 'id';
  if (!isContextConfigured(config)) {
    return { status: 503, body: emptyCandles(normalizedMarket, ticker, 'konteks_nonaktif') };
  }
  const zitnUserId = await selectZitnIdByUserId(db, userId);
  if (!zitnUserId) {
    return { status: 409, body: emptyCandles(normalizedMarket, ticker, 'belum_tertaut') };
  }
  if (await entitlementLapsed(userId)) {
    return { status: 402, body: emptyCandles(normalizedMarket, ticker, 'paywall') };
  }
  return fetchCandles({
    baseUrl: config.ZITN_BASE_URL as string,
    secret: config.JOURNAL_SSO_SECRET as string,
    uid: zitnUserId,
    market: normalizedMarket,
    ticker,
  });
}
