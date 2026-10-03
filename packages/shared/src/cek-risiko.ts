import Decimal from 'decimal.js';

import { calculateFees } from './fees';
import type { FeeScheduleInput } from './fees';
import { computePphFinal, IDX_SHARES_PER_LOT, roundToIdxTick } from './idx';

/**
 * Mesin hitung permukaan **Cek Risiko** (ZITN-TECH-017 §12 / Fase H).
 *
 * Fungsi murni — tanpa React, tanpa jaringan — supaya bisa diuji golden dan
 * dipakai ulang oleh web. Semua **aturan pasar IDX** diambil dari modul kanonik
 * `idx.ts` (lot 100, fraksi harga/tick, PPh final), **bukan** angka yang diketik
 * ulang di permukaan. Fee platform memakai mesin `calculateFees` yang sama
 * dengan jurnal (persentase per sisi).
 *
 * Pagar doktrin: ini **alat hitung dari angka pengguna**, bukan saran. Tidak ada
 * prediksi, sinyal, atau "target"; verdict bersifat deskriptif.
 */

// ---------------------------------------------------------------------------
// Verdict risiko (D-H2): tiga tingkat aman/kuning/tinggi, ambang 1%/2%.
// ---------------------------------------------------------------------------

export type CekRisikoVerdictLevel = 'aman' | 'kuning' | 'tinggi';

export interface CekRisikoVerdict {
  level: CekRisikoVerdictLevel;
  /** Persentase risiko yang dinilai (apa adanya dari pengguna). */
  riskPercent: number;
}

/** Tombol risiko yang disarankan (D-H2: 1% / 2% / 3%). */
export const CEK_RISIKO_RISK_PRESETS = ['1', '2', '3'] as const;

/**
 * Verdict deskriptif dari persentase risiko per transaksi.
 *
 * Ambang (D-H2): ≤ 1% **aman**, > 1%–2% **kuning**, > 2% **tinggi** — sehingga
 * tombol 1/2/3 memetakan tepat ke satu tingkat masing-masing.
 */
export function verdictRisiko(riskPercent: string | number): CekRisikoVerdict {
  const p = Number(riskPercent);
  if (!Number.isFinite(p) || p <= 1) {
    return { level: 'aman', riskPercent: Number.isFinite(p) && p > 0 ? p : 0 };
  }
  if (p <= 2) return { level: 'kuning', riskPercent: p };
  return { level: 'tinggi', riskPercent: p };
}

// ---------------------------------------------------------------------------
// Mode "Hitung Lot"
// ---------------------------------------------------------------------------

export interface HitungLotInput {
  /** Modal (ekuitas akun) dalam Rupiah. */
  modal: string | number;
  /** Risiko per transaksi dalam persen. */
  riskPercent: string | number;
  /** Harga beli per saham. */
  hargaBeli: string | number;
  /** Harga stop per saham (di bawah harga beli untuk posisi beli). */
  hargaStop: string | number;
}

export type HitungLotErrorCode =
  | 'modal-tidak-valid'
  | 'risiko-tidak-valid'
  | 'harga-tidak-valid'
  | 'stop-tidak-valid'
  | 'lot-nol';

export interface HitungLotSuccess {
  ok: true;
  /** Anggaran risiko = modal × risiko%. */
  anggaranRisiko: string;
  /** Selisih harga beli − stop per saham. */
  risikoPerSaham: string;
  lots: number;
  shares: number;
  /** Rugi maksimal bila stop tersentuh = shares × risiko per saham. */
  rugiMaksimal: string;
  /** Nilai posisi = shares × harga beli. */
  nilaiPosisi: string;
  /** Harga jual bila imbal 2× risiko (R:R 1:2), dibulatkan ke tick IDX. */
  hargaJualRR2: string;
  verdict: CekRisikoVerdict;
}

export type HitungLotResult = HitungLotSuccess | { ok: false; code: HitungLotErrorCode };

export function hitungLot(input: HitungLotInput): HitungLotResult {
  const modal = toDec(input.modal);
  const riskPercent = toDec(input.riskPercent);
  const hargaBeli = toDec(input.hargaBeli);
  const hargaStop = toDec(input.hargaStop);

  if (modal === null || modal.lte(0)) return { ok: false, code: 'modal-tidak-valid' };
  if (riskPercent === null || riskPercent.lte(0) || riskPercent.gt(100)) {
    return { ok: false, code: 'risiko-tidak-valid' };
  }
  if (hargaBeli === null || hargaBeli.lte(0)) return { ok: false, code: 'harga-tidak-valid' };
  if (hargaStop === null || hargaStop.lte(0) || hargaStop.gte(hargaBeli)) {
    return { ok: false, code: 'stop-tidak-valid' };
  }

  const anggaranRisiko = modal.times(riskPercent).div(100);
  const risikoPerSaham = hargaBeli.minus(hargaStop);
  const sharesRaw = anggaranRisiko.div(risikoPerSaham).toDecimalPlaces(0, Decimal.ROUND_DOWN);
  // IDX memperdagangkan dalam lot 100 saham; sisakan lot utuh saja.
  const lots = sharesRaw.div(IDX_SHARES_PER_LOT).toDecimalPlaces(0, Decimal.ROUND_DOWN).toNumber();

  if (lots <= 0) return { ok: false, code: 'lot-nol' };

  const shares = lots * IDX_SHARES_PER_LOT;
  const rugiMaksimal = risikoPerSaham.times(shares);
  const nilaiPosisi = hargaBeli.times(shares);
  const hargaJualRaw = hargaBeli.plus(risikoPerSaham.times(2));

  return {
    ok: true,
    anggaranRisiko: to2dp(anggaranRisiko),
    risikoPerSaham: to2dp(risikoPerSaham),
    lots,
    shares,
    rugiMaksimal: to2dp(rugiMaksimal),
    nilaiPosisi: to2dp(nilaiPosisi),
    hargaJualRR2: roundToIdxTick(hargaJualRaw),
    verdict: verdictRisiko(input.riskPercent),
  };
}

// ---------------------------------------------------------------------------
// Mode "Biaya & Pajak"
// ---------------------------------------------------------------------------

export interface BiayaPajakInput {
  hargaBeli: string | number;
  lots: string | number;
  hargaJual: string | number;
  /** Fee beli platform dalam persen (mis. 0,15). */
  percentBuy: string | number;
  /** Fee jual platform dalam persen (mis. 0,25). */
  percentSell: string | number;
}

export type BiayaPajakErrorCode = 'harga-tidak-valid' | 'lots-tidak-valid';

export interface BiayaPajakSuccess {
  ok: true;
  shares: number;
  nilaiBeli: string;
  biayaBeli: string;
  nilaiJual: string;
  biayaJual: string;
  /** PPh final penjualan 0,1% (modul kanonik `idx.ts`). */
  pphFinal: string;
  /** Hasil penjualan setelah fee jual + PPh. */
  nilaiBersih: string;
  /** Total biaya (fee beli + fee jual + PPh). */
  totalBiaya: string;
  /** Untung/rugi bersih = nilai bersih − nilai beli − fee beli. */
  untungRugi: string;
}

export type BiayaPajakResult = BiayaPajakSuccess | { ok: false; code: BiayaPajakErrorCode };

export function hitungBiayaPajak(input: BiayaPajakInput): BiayaPajakResult {
  const hargaBeli = toDec(input.hargaBeli);
  const lots = toDec(input.lots);
  const hargaJual = toDec(input.hargaJual);

  if (hargaBeli === null || hargaBeli.lte(0) || hargaJual === null || hargaJual.lte(0)) {
    return { ok: false, code: 'harga-tidak-valid' };
  }
  if (lots === null || lots.lte(0)) return { ok: false, code: 'lots-tidak-valid' };

  const shares = lots.times(IDX_SHARES_PER_LOT);
  const sharesStr = shares.toString();
  const nilaiBeli = hargaBeli.times(shares);
  const nilaiJual = hargaJual.times(shares);

  const schedule: FeeScheduleInput = {
    stockPerShareCommission: '0',
    stockMinPerFill: '0',
    stockMaxPerFill: '0',
    stockPercentBuy: String(input.percentBuy),
    stockPercentSell: String(input.percentSell),
    optionsPerContractCommission: '0',
    optionsPerContractExchangeFee: '0',
    optionsMinPerFill: '0',
    optionsMaxPerFill: '0',
  };

  const { totalFees: biayaBeli } = calculateFees(
    [{ quantity: sharesStr, price: hargaBeli.toString(), type: 'stock', side: 'buy' }],
    schedule,
  );
  const { totalFees: biayaJual } = calculateFees(
    [{ quantity: sharesStr, price: hargaJual.toString(), type: 'stock', side: 'sell' }],
    schedule,
  );

  // PPh final memakai modul kanonik — jangan diketik ulang di sini.
  const pphFinal = computePphFinal(nilaiJual);

  const biayaBeliDec = new Decimal(biayaBeli);
  const biayaJualDec = new Decimal(biayaJual);
  const pphDec = new Decimal(pphFinal);
  const nilaiBersih = nilaiJual.minus(biayaJualDec).minus(pphDec);
  const untungRugi = nilaiBersih.minus(nilaiBeli).minus(biayaBeliDec);
  const totalBiaya = biayaBeliDec.plus(biayaJualDec).plus(pphDec);

  return {
    ok: true,
    shares: shares.toNumber(),
    nilaiBeli: to2dp(nilaiBeli),
    biayaBeli: to2dp(biayaBeliDec),
    nilaiJual: to2dp(nilaiJual),
    biayaJual: to2dp(biayaJualDec),
    pphFinal: to2dp(pphDec),
    nilaiBersih: to2dp(nilaiBersih),
    totalBiaya: to2dp(totalBiaya),
    untungRugi: to2dp(untungRugi),
  };
}

// ---------------------------------------------------------------------------
// Harga rata-rata setelah average down
// ---------------------------------------------------------------------------

export interface AverageDownInput {
  lotsAwal: string | number;
  hargaAwal: string | number;
  lotsTambah: string | number;
  hargaTambah: string | number;
}

export type AverageDownResult =
  | { ok: true; lotsTotal: number; hargaRataRata: string; nilaiTotal: string }
  | { ok: false; code: 'input-tidak-valid' };

export function hitungHargaRataRata(input: AverageDownInput): AverageDownResult {
  const lotsAwal = toDec(input.lotsAwal);
  const hargaAwal = toDec(input.hargaAwal);
  const lotsTambah = toDec(input.lotsTambah);
  const hargaTambah = toDec(input.hargaTambah);
  if (
    lotsAwal === null ||
    hargaAwal === null ||
    lotsTambah === null ||
    hargaTambah === null ||
    lotsAwal.lt(0) ||
    hargaAwal.lt(0) ||
    lotsTambah.lt(0) ||
    hargaTambah.lt(0)
  ) {
    return { ok: false, code: 'input-tidak-valid' };
  }

  const lotsTotal = lotsAwal.plus(lotsTambah);
  const nilaiAwal = lotsAwal.times(hargaAwal);
  const nilaiTambah = lotsTambah.times(hargaTambah);
  const nilaiTotal = nilaiAwal.plus(nilaiTambah);
  if (lotsTotal.lte(0)) return { ok: false, code: 'input-tidak-valid' };

  return {
    ok: true,
    lotsTotal: lotsTotal.toNumber(),
    // Harga rata-rata bukan harga tawar, jadi tampil 2 desimal (bukan tick).
    hargaRataRata: to2dp(nilaiTotal.div(lotsTotal)),
    nilaiTotal: to2dp(nilaiTotal),
  };
}

// ---------------------------------------------------------------------------
// Batas ARA/ARB (auto rejection) — informasi, bukan saran
// ---------------------------------------------------------------------------

/**
 * Batas ARA (auto rejection atas) per pita harga acuan, menurut ketentuan BEI
 * yang berlaku sejak normalisasi 2023 (tetap pada 2025): 35% (Rp50–200),
 * 25% (>Rp200–Rp5.000), 20% (>Rp5.000).
 *
 * Sejak **8 April 2025** ARB (auto rejection bawah) diseragamkan **15%** untuk
 * seluruh rentang harga (Kep-00003/BEI/04-2025).
 *
 * Catatan: saham hari pertama IPO memakai kelipatan; papan pemantauan khusus
 * bisa berbeda. Angka ini **perkiraan** untuk alat hitung, bukan acuan resmi.
 */
const ARA_ARB_ARB_PERCENT = '15';

function persenAra(h: Decimal): string {
  if (h.lte(200)) return '35';
  if (h.lte(5000)) return '25';
  return '20';
}

export function hitungAraArb(
  hargaAcuan: string | number,
): { ara: string; arb: string; persenAra: string; persenArb: string } | null {
  const h = toDec(hargaAcuan);
  if (h === null || h.lte(0)) return null;
  const pAra = new Decimal(persenAra(h));
  const pArb = new Decimal(ARA_ARB_ARB_PERCENT);
  return {
    ara: roundToIdxTick(h.times(pAra.plus(100)).div(100)),
    arb: roundToIdxTick(h.times(new Decimal(100).minus(pArb)).div(100)),
    persenAra: pAra.toString(),
    persenArb: pArb.toString(),
  };
}

/**
 * Decimal dari nilai pengguna, atau `null` bila tidak bisa diurai. `decimal.js`
 * melempar galat untuk masukan seperti `"1,5"` atau `"10.000.000"`, jadi parsing
 * dibungkus supaya permukaan mengembalikan verdict/error biasa, bukan crash.
 */
function toDec(value: string | number): Decimal | null {
  try {
    const d = new Decimal(value);
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
}

function to2dp(value: Decimal): string {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}
