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
import { selectZitnIdByUserId } from '@/features/auth/sso.query';
import { config } from '@/lib/config';

import {
  fetchSheetContext,
  isContextConfigured,
  withChartLinks,
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

export async function getSheetContextForUser(
  userId: string,
  tanggal: string | null,
): Promise<SheetContextResult> {
  if (!isContextConfigured(config)) return unavailable(503, tanggal, 'konteks_nonaktif');

  const zitnUserId = await selectZitnIdByUserId(db, userId);
  if (!zitnUserId) return unavailable(409, tanggal, 'belum_tertaut');

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
