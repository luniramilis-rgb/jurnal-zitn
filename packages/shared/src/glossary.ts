/**
 * Glosarium istilah Jurnal ZITN (ZITN-TECH-021) — **satu-satunya tempat keputusan istilah**.
 *
 * Latar: pasar utama Indonesia, bahasa utama Indonesia, EN sebagai fallback teknis.
 * Istilah pasar tetap EN, kalimat penjelas ID, chrome/navigasi ID (keputusan pemilik
 * 2026-09-28, `ZITN-TECH-021` §2). Glosarium mencatat keputusan itu sekali, bukan per-PR.
 *
 * Kebijakan (`policy`) per entri:
 * - `'keep-en'`  — istilah pasar tanpa padanan settled: nilai `id` = EN apa adanya.
 * - `'translate'`— ada padanan Indonesia mapan (mis. kosakata kolom broker IDX / copy lama): `id` berbeda.
 * - `'free'`     — diputuskan sadar kasus per kasus (mis. istilah regulasi yang identik di kedua bahasa).
 *
 * `source` mengikuti tiga lapis tie-break `ZITN-TECH-021` §7:
 * - `'regulation'` — regulasi/bursa (IDX/OJK/KSEI, PPh) → istilah resmi Indonesia.
 * - `'broker'`     — statement/UI broker IDX → kosakata kolom & transaksi (sementara sampai
 *                    preset impor broker ID ditambahkan; tandai `provisional`).
 * - `'metrics'`    — analisis/metrik tanpa padanan settled → EN.
 * - `'entity'`     — nama lembaga/tempat.
 *
 * `termKey` (bila ada) menautkan entri ke namespace `term.*` di `packages/shared/src/i18n.ts`;
 * untuk namespace itu nilai `id`/`en` **wajib identik** (`TERM_MESSAGES`).
 *
 * `forbidden` memuat bentuk di-Indonesiakan yang **tidak** boleh dipakai sebagai **label**
 * istilah ini. Semantiknya dipersempit: hanya diperiksa pada **posisi label** (nilai `id`
 * entri + nilai `term.*`), **bukan** pada kalimat penjelas (disclaimer/deskripsi/empty state).
 * Bukti: `tax.disc.recCA` memuat "laba/rugi realisasi" secara sah sebagai kalimat penjelas,
 * sementara `pnl` melarang bentuk label "Laba Rugi". Penegak: `glossary.test.ts`.
 *
 * Nilai kamus dan glosarium harus satu arah: keputusan final tidak boleh hanya hidup di
 * `note`. Lihat `GLOSSARY_RECONCILIATION` di bawah untuk istilah yang copy lamanya sudah
 * mapan dan menang atas usulan awal (tie-break §7 lapis ii).
 */

export type GlossaryPolicy = 'keep-en' | 'translate' | 'free';

export type GlossarySource = 'regulation' | 'broker' | 'metrics' | 'entity';

/**
 * Namespace `term.*` — istilah pasar yang tetap EN di kamus `id` maupun `en`
 * (nilai identik). Dipakai kalimat ID sebagai `{term.fill}` dsb.
 */
export const TERM_MESSAGES = {
  'term.drawdown': 'Drawdown',
  'term.fill': 'Fill',
  'term.lot': 'Lot',
  'term.pnl': 'P&L',
  'term.pphFinal': 'PPh Final',
  'term.riskOfRuin': 'Risk of ruin',
  'term.slippage': 'Slippage',
  'term.stopLoss': 'Stop Loss',
  'term.takeProfit': 'Take Profit',
  'term.tick': 'Tick',
  'term.washSales': 'Wash sales',
  'term.winRate': 'Win rate',
} as const;

export type TermMessageKey = keyof typeof TERM_MESSAGES;

export interface GlossaryEntry {
  /** Identitas entri glosarium (bukan kunci kamus). */
  readonly key: string;
  readonly en: string;
  readonly id: string;
  readonly policy: GlossaryPolicy;
  readonly source: GlossarySource;
  /** Bila ada: kunci `term.*` yang nilainya wajib sama dengan `en` di kedua kamus. */
  readonly termKey?: TermMessageKey;
  /** Entri dari korpus broker ID yang belum mapan → keputusan sementara. */
  readonly provisional?: boolean;
  /** Bentuk di-Indonesiakan yang dilarang pada **posisi label** (bukan kalimat penjelas). */
  readonly forbidden?: readonly string[];
  readonly note?: string;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  // -------------------------------------------------------------------------
  // Lapis (iii) — analisis/metrik tanpa padanan settled → EN apa adanya.
  // -------------------------------------------------------------------------
  {
    key: 'fill',
    en: 'Fill',
    id: 'Fill',
    policy: 'keep-en',
    source: 'metrics',
    termKey: 'term.fill',
    forbidden: ['Isian'],
    note: 'Satu eksekusi (sebagian/seluruh) atas sebuah posisi.',
  },
  {
    key: 'stopLoss',
    en: 'Stop Loss',
    id: 'Stop Loss',
    policy: 'keep-en',
    source: 'metrics',
    termKey: 'term.stopLoss',
    forbidden: ['Stop Kerugian'],
  },
  {
    key: 'takeProfit',
    en: 'Take Profit',
    id: 'Take Profit',
    policy: 'keep-en',
    source: 'metrics',
    termKey: 'term.takeProfit',
    forbidden: ['Ambil Untung'],
  },
  {
    key: 'tick',
    en: 'Tick',
    id: 'Tick',
    policy: 'keep-en',
    source: 'metrics',
    termKey: 'term.tick',
    note: 'IDX memakai "fraksi harga" untuk aturan pita harga; UI memakai "Tick" sebagai label.',
  },
  {
    key: 'pnl',
    en: 'P&L',
    id: 'P&L',
    policy: 'keep-en',
    source: 'metrics',
    termKey: 'term.pnl',
    forbidden: ['Laba Rugi'],
    note: 'Copy lama sudah memakai "P&L" pada label (mis. "P&L Bersih"), konsisten EN.',
  },
  {
    key: 'drawdown',
    en: 'Drawdown',
    id: 'Drawdown',
    policy: 'keep-en',
    source: 'metrics',
    termKey: 'term.drawdown',
    forbidden: ['Penurunan'],
  },
  {
    key: 'slippage',
    en: 'Slippage',
    id: 'Slippage',
    policy: 'keep-en',
    source: 'metrics',
    termKey: 'term.slippage',
    forbidden: ['Slipase'],
  },
  {
    key: 'winRate',
    en: 'Win rate',
    id: 'Win rate',
    policy: 'keep-en',
    source: 'metrics',
    termKey: 'term.winRate',
    forbidden: ['Rasio Kemenangan'],
    note: 'Label metrik hasil milik pengguna (K11) — dilarang dipakai di materi jual/permukaan publik ZITN.',
  },
  {
    key: 'riskOfRuin',
    en: 'Risk of ruin',
    id: 'Risk of ruin',
    policy: 'keep-en',
    source: 'metrics',
    termKey: 'term.riskOfRuin',
  },
  {
    key: 'washSales',
    en: 'Wash sales',
    id: 'Wash sales',
    policy: 'keep-en',
    source: 'metrics',
    termKey: 'term.washSales',
    note: 'Konsep yurisdiksi asing (US); tidak boleh tampil di UI ID tanpa penanda yurisdiksi (rubrik R11).',
  },

  // -------------------------------------------------------------------------
  // Istilah dengan copy ID mapan di kamus → keputusan final mengikuti bukti
  // (tie-break §7 lapis ii), menang atas usulan keep-en awal.
  // -------------------------------------------------------------------------
  {
    key: 'equity',
    en: 'Equity',
    id: 'Ekuitas',
    policy: 'translate',
    source: 'metrics',
    note: 'Bukti kamus: widget.equityCurve "Kurva Ekuitas", calc.basis.balance "total ekuitas". Usulan awal keep-en dibatalkan.',
  },
  {
    key: 'breakeven',
    en: 'Breakeven',
    id: 'Impas',
    policy: 'translate',
    source: 'metrics',
    note: 'Bukti kamus: pos.filter.breakeven "Impas", calc.result.breakevenWinRate "Win rate impas". Usulan awal keep-en dibatalkan.',
  },
  {
    key: 'position',
    en: 'Position',
    id: 'Posisi',
    policy: 'translate',
    source: 'broker',
    provisional: true,
    note: 'Kosakata kolom & transaksi broker IDX. Sementara sampai preset impor broker ID (LOCALIZATION.md Fase 2c); tanpa `termKey` karena `id` ≠ `en`.',
  },

  // -------------------------------------------------------------------------
  // Lapis (i) — regulasi/bursa: istilah resmi Indonesia (bisa identik dengan EN).
  // -------------------------------------------------------------------------
  {
    key: 'lot',
    en: 'Lot',
    id: 'Lot',
    policy: 'free',
    source: 'regulation',
    termKey: 'term.lot',
    note: 'IDX: 1 lot = 100 saham (`IDX_SHARES_PER_LOT`).',
  },
  {
    key: 'pphFinal',
    en: 'PPh Final',
    id: 'PPh Final',
    policy: 'free',
    source: 'regulation',
    termKey: 'term.pphFinal',
    note: 'PPh final atas penjualan saham; tarif dari `PPH_FINAL_RATE_PERCENT` dan diformat per locale (rubrik R8/R13).',
  },
];

/**
 * Rekonsiliasi glosarium ↔ kamus. Keputusan final (bukan catatan pinggir) untuk istilah
 * yang copy lamanya sudah mapan dan mengalahkan usulan awal. Setiap baris menautkan
 * istilah glosarium ke kunci kamus pembuktinya.
 */
export const GLOSSARY_RECONCILIATION: readonly {
  readonly term: string;
  readonly catalogKeys: readonly string[];
  readonly decision: string;
}[] = [
  {
    term: 'equity',
    catalogKeys: [
      'widget.equityCurve',
      'w.equity.empty',
      'w.equity.failed',
      'w.equity.errorTitle',
      'calc.basis.balance',
      'perf.risk.rolling',
    ],
    decision: 'policy translate; id "Ekuitas". Copy lama memakai istilah ID → keep-en dibatalkan.',
  },
  {
    term: 'breakeven',
    catalogKeys: ['pos.filter.breakeven', 'pos.breakeven.aria', 'calc.result.breakevenWinRate'],
    decision: 'policy translate; id "Impas". Copy lama memakai istilah ID → keep-en dibatalkan.',
  },
];

/** Entri dengan `termKey` — dipakai lint untuk menjaga `TERM_MESSAGES` tetap sinkron. */
export function glossaryTermKeys(): TermMessageKey[] {
  return GLOSSARY.flatMap((entry) => (entry.termKey === undefined ? [] : [entry.termKey])).sort();
}
