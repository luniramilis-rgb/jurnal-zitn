/**
 * Preset broker IDX (ZITN-TECH-017 Fase 3b / ROADMAP D3).
 *
 * Komisi IDX lazim dinyatakan sebagai **persentase per sisi**, bukan per saham
 * (model AS). Angka di bawah adalah **perkiraan umum** 0,15% beli / 0,25% jual
 * (sudah termasuk levy) — tiap sekuritas punya tier/promo sendiri, jadi nilainya
 * dapat berbeda dan pengguna harus memeriksa serta menyesuaikannya. Karena itu
 * setiap preset membawa `notes` yang mengungkapkan ketidakpastian ini; tidak ada
 * klaim tarif resmi.
 */
export interface IdxBrokerPreset {
  id: string;
  name: string;
  percentBuy: string;
  percentSell: string;
  notes: string;
}

const DISCLAIMER =
  'Perkiraan komisi 0,15% beli / 0,25% jual (termasuk levy). Angka dapat berbeda ' +
  'per sekuritas/promo — periksa dan sesuaikan dengan tarif broker Anda.';

export const IDX_BROKER_PRESETS: IdxBrokerPreset[] = [
  {
    id: 'mirae',
    name: 'Mirae Asset Sekuritas',
    percentBuy: '0.15',
    percentSell: '0.25',
    notes: DISCLAIMER,
  },
  {
    id: 'stockbit',
    name: 'Stockbit Sekuritas',
    percentBuy: '0.15',
    percentSell: '0.25',
    notes: DISCLAIMER,
  },
  {
    id: 'sinarmas',
    name: 'Sinarmas Sekuritas',
    percentBuy: '0.15',
    percentSell: '0.25',
    notes: DISCLAIMER,
  },
  { id: 'bni', name: 'BNI Sekuritas', percentBuy: '0.15', percentSell: '0.25', notes: DISCLAIMER },
  {
    id: 'indopremier',
    name: 'Indo Premier Sekuritas',
    percentBuy: '0.15',
    percentSell: '0.25',
    notes: DISCLAIMER,
  },
];
