/**
 * Preset broker IDX (ZITN-TECH-017 Fase 3b / ROADMAP D3).
 *
 * Komisi IDX lazim dinyatakan sebagai **persentase per sisi**, bukan per saham
 * (model AS). Angka di bawah adalah **perkiraan umum** 0,15% beli / 0,25% jual
 * (sudah termasuk levy) — tiap sekuritas punya tier/promo sendiri, jadi nilainya
 * dapat berbeda dan pengguna harus memeriksa serta menyesuaikannya. Tidak ada
 * klaim tarif resmi.
 *
 * Catatan keraguan itu **tidak lagi disimpan di sini** (sebelumnya `DISCLAIMER`
 * berbahasa Indonesia di luar kamus, ZITN-TECH-021 §5.13 butir 5): kini ia hidup
 * sebagai kunci kamus `broker.preset.idxNotes` (id + en) di
 * `packages/shared/src/i18n.ts`, dengan nilai persen disubstitusi lewat
 * `formatNumber` agar "0,15%" (id) konsisten dengan locale. Saat mengubah preset,
 * jangan menghapus kalimat keraguan "perkiraan… periksa dan sesuaikan" — itulah
 * yang menjaga rubrik R8.
 */
export interface IdxBrokerPreset {
  id: string;
  name: string;
  percentBuy: string;
  percentSell: string;
}

export const IDX_BROKER_PRESETS: IdxBrokerPreset[] = [
  { id: 'mirae', name: 'Mirae Asset Sekuritas', percentBuy: '0.15', percentSell: '0.25' },
  { id: 'stockbit', name: 'Stockbit Sekuritas', percentBuy: '0.15', percentSell: '0.25' },
  { id: 'sinarmas', name: 'Sinarmas Sekuritas', percentBuy: '0.15', percentSell: '0.25' },
  { id: 'bni', name: 'BNI Sekuritas', percentBuy: '0.15', percentSell: '0.25' },
  { id: 'indopremier', name: 'Indo Premier Sekuritas', percentBuy: '0.15', percentSell: '0.25' },
];
