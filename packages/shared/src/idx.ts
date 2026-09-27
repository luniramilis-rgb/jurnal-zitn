import Decimal from 'decimal.js';

/**
 * Aturan pasar IDX (ZITN-TECH-017 Fase 2b).
 *
 * * **Lot**: 1 lot = 100 saham. Kuantitas di jurnal disimpan dalam saham; helper ini
 *   mengonversi untuk tampilan/entri.
 * * **Tick size**: harga wajib kelipatan tick menurut pita harga (aturan IDX).
 * * **PPh final**: 0,1% dari nilai penjualan (bukan wash-sale/superficial-loss).
 */

export const IDX_SHARES_PER_LOT = 100;

/** Pita tick size IDX: [batas bawah inklusif, tick]. */
const TICK_BANDS: { min: Decimal; tick: Decimal }[] = [
  { min: new Decimal(0), tick: new Decimal(1) },
  { min: new Decimal(200), tick: new Decimal(2) },
  { min: new Decimal(500), tick: new Decimal(5) },
  { min: new Decimal(2000), tick: new Decimal(10) },
  { min: new Decimal(5000), tick: new Decimal(25) },
];

/** Tick size untuk sebuah harga (pita tertinggi yang `min`-nya ≤ harga). */
export function idxTickSize(price: string | number | Decimal): string {
  const p = new Decimal(price);
  let tick = TICK_BANDS[0].tick;
  for (const band of TICK_BANDS) {
    if (p.gte(band.min)) tick = band.tick;
  }
  return tick.toString();
}

/** Bulatkan harga ke tick IDX terdekat (setengah ke atas). */
export function roundToIdxTick(price: string | number | Decimal): string {
  const p = new Decimal(price);
  const tick = new Decimal(idxTickSize(p));
  return p.div(tick).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).times(tick).toString();
}

/** Apakah harga sudah kelipatan tick IDX yang sah. */
export function isValidIdxTick(price: string | number | Decimal): boolean {
  const p = new Decimal(price);
  const tick = new Decimal(idxTickSize(p));
  return p.mod(tick).isZero();
}

export function lotsToShares(lots: string | number | Decimal): string {
  return new Decimal(lots).times(IDX_SHARES_PER_LOT).toString();
}

export function sharesToLots(shares: string | number | Decimal): string {
  return new Decimal(shares).div(IDX_SHARES_PER_LOT).toString();
}

/** Tarif PPh final penjualan saham Indonesia. */
export const PPH_FINAL_RATE_PERCENT = '0.1';

/** PPh final = 0,1% × nilai penjualan (2 desimal, half-up). */
export function computePphFinal(sellProceeds: string | number | Decimal): string {
  const proceeds = new Decimal(sellProceeds);
  return proceeds
    .times(PPH_FINAL_RATE_PERCENT)
    .div(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toString();
}
