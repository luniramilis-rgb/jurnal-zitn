# Paket tinjau — `accounting/tax-summary` (ZITN-TECH-021 §5.4/§5.5/§5.11)

**Rute:** `/_auth/accounting/tax-summary` · **Lapis:** 1 (angka/uang/klaim) · **Status manifest:** `sedang`
**Basis:** repo journal `c5cf71f` (branch kerja `l10n-id`) · **Sesi kalibrasi:** `ses_f1614741bffeFv4Hxmb2QQGGz0`
**Berkas:** `apps/web/src/features/expenses/components/TaxSummaryPage.tsx`,
`apps/web/src/features/expenses/components/WashSaleFlagsTable.tsx`;
badan disclaimer disusun server di `apps/api/src/features/expenses/expenses.service.ts:composeDisclaimer`.

**Ledger tinjau**

| Peran              | Siapa                                 | Tanggal    | Commit/keputusan                                |
| ------------------ | ------------------------------------- | ---------- | ----------------------------------------------- |
| Penyusun paket     | chat teknis (`l10n-id`)               | 2026-09-28 | `c5cf71f` + perubahan TECH-021                  |
| Kalibrasi/peninjau | sesi `ses_f1614741bffeFv4Hxmb2QQGGz0` | 2026-09-28 | verdict: diterima dengan perbaikan              |
| Ratifikasi `sah`   | **pemilik (belum)**                   | —          | dibutuhkan untuk menaikkan status dari `sedang` |

> Verdict Lapis 1 diratifikasi pemilik; chat teknis hanya menyediakan paket dan menjalankan perbaikan.

## (a) Lembar kerja `key → id → en` (+ salinan ID setelah substitusi)

Hasil `node scripts/i18n-coverage.mjs --worksheet "^(tax\.|wash\.|expense\.cat\.)" --out apps/web/docs/i18n-coverage-tax-summary.md`.
Kolom **id (subst.)** = salinan yang benar-benar dibaca pengguna (placeholder diganti nilai contoh);
**bukti R13:** `{rate}` dirender **"0,1"** untuk `id` (unit test `formatNumber('0.1','id') === '0,1'`), bukan "0.1".

**Kunci halaman (`TaxSummaryPage`)**

| Key                      | id                                                                             | en                                                                           | id (subst.)                                                            |
| ------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `tax.page.title`         | Ringkasan Pajak                                                                | Tax Summary                                                                  | —                                                                      |
| `tax.subtitle`           | P&L realisasi dan pengeluaran tercatat untuk tahun terpilih.                   | Realised P&L and tracked expenses for the selected year.                     | —                                                                      |
| `tax.subtitleFlags`      | P&L realisasi, pengeluaran tercatat, dan posisi bertanda untuk tahun terpilih. | Realised P&L, tracked expenses, and flagged positions for the selected year. | —                                                                      |
| `tax.field.year`         | Tahun                                                                          | Year                                                                         | —                                                                      |
| `tax.field.jurisdiction` | Yurisdiksi                                                                     | Jurisdiction                                                                 | —                                                                      |
| `tax.jurisdiction.us`    | United States                                                                  | United States                                                                | —                                                                      |
| `tax.jurisdiction.ca`    | Canada                                                                         | Canada                                                                       | —                                                                      |
| `tax.jurisdiction.id`    | Indonesia                                                                      | Indonesia                                                                    | —                                                                      |
| `tax.jurisdiction.other` | Lainnya                                                                        | Other                                                                        | —                                                                      |
| `tax.loadFailed`         | Gagal memuat ringkasan pajak. Silakan coba lagi.                               | Failed to load tax summary. Please try again.                                | —                                                                      |
| `tax.emptyTitle`         | Belum ada P&L realisasi atau pengeluaran tercatat untuk {year}                 | No realised P&L or tracked expenses for {year}                               | Belum ada … untuk **2026**                                             |
| `tax.emptyDesc`          | Tutup posisi atau catat pengeluaran untuk melihat agregatnya di sini.          | Close positions or record expenses to see them aggregated here.              | —                                                                      |
| `tax.ratesAsOf`          | Kurs per {date}.                                                               | Rates as of {date}.                                                          | Kurs per **31 Des 2026**.                                              |
| `tax.excluded`           | Dikecualikan (kurs hilang): {list}.                                            | Excluded (missing rate): {list}.                                             | Dikecualikan (kurs hilang): **USD, SGD**.                              |
| `tax.missingRates`       | Kurs tidak tersedia:                                                           | Missing exchange rate(s):                                                    | —                                                                      |
| `tax.enterRate`          | Masukkan kurs                                                                  | Enter rate                                                                   | —                                                                      |
| `tax.realisedPnl`        | P&L Realisasi                                                                  | Realised P&L                                                                 | —                                                                      |
| `tax.perCurrency`        | Per mata uang                                                                  | Per currency                                                                 | —                                                                      |
| `tax.trackedExpenses`    | Pengeluaran Tercatat                                                           | Tracked Expenses                                                             | —                                                                      |
| `tax.perCategory`        | Per kategori                                                                   | Per category                                                                 | —                                                                      |
| `tax.pphTitle`           | PPh Final ({rate}%)                                                            | PPh Final ({rate}%)                                                          | PPh Final (**0,1%**)                                                   |
| `tax.pphSell`            | Penjualan {currency}                                                           | Sales {currency}                                                             | Penjualan **IDR**                                                      |
| `tax.pphEmpty`           | Belum ada penjualan tahun ini.                                                 | No sales this year.                                                          | —                                                                      |
| `tax.pphNote`            | Estimasi {rate}% dari nilai penjualan; bukan perhitungan pajak resmi.          | Estimated {rate}% of sale proceeds; not an official tax computation.         | Estimasi **0,1%** dari nilai penjualan; bukan perhitungan pajak resmi. |
| `tax.disclaimer.trigger` | Disclaimer — baca sebelum memakai angka ini                                    | Disclaimer — please read before using these figures                          | —                                                                      |
| `tax.shortTerm`          | Jangka pendek                                                                  | Short-term                                                                   | —                                                                      |
| `tax.longTerm`           | Jangka panjang                                                                 | Long-term                                                                    | —                                                                      |
| `tax.washSales`          | Wash sales ({n})                                                               | Wash sales ({n})                                                             | Wash sales (**3**)                                                     |
| `tax.superficial`        | Kerugian superficial ({n})                                                     | Superficial losses ({n})                                                     | Kerugian superficial (**3**)                                           |

**Kunci tabel flag (`WashSaleFlagsTable`)** — hanya dirender US/CA (`data.flags.*.length > 0`)

| Key                       | id                                  | en                         |
| ------------------------- | ----------------------------------- | -------------------------- |
| `wash.col.opened`         | Dibuka                              | Opened                     |
| `wash.col.closed`         | Ditutup                             | Closed                     |
| `wash.col.underlying`     | Aset Dasar                          | Underlying                 |
| `wash.col.realisedLoss`   | Kerugian realisasi                  | Realised loss              |
| `wash.col.reason`         | Alasan                              | Reason                     |
| `wash.col.counterparties` | ID posisi lawan                     | Counterparty position ids  |
| `wash.reason.repurchase`  | Beli kembali dalam 30 hari          | Repurchase within 30 days  |
| `wash.reason.heldOpen`    | Tetap terbuka dalam jendela 30 hari | Held open in 30-day window |
| `wash.more`               | +{n} lagi                           | +{n} more                  |

**Kunci kategori pengeluaran (`expense.cat.*`, dipakai tabel per kategori)**

| Key                             | id              | en                |
| ------------------------------- | --------------- | ----------------- |
| `expense.cat.data_subscription` | Langganan data  | Data subscription |
| `expense.cat.platform_fee`      | Biaya platform  | Platform fee      |
| `expense.cat.software`          | Perangkat lunak | Software          |
| `expense.cat.education`         | Edukasi         | Education         |
| `expense.cat.hardware`          | Perangkat keras | Hardware          |
| `expense.cat.other`             | Lainnya         | Other             |

**Badan disclaimer (server, `tax.disc.*`) untuk yurisdiksi ID:** `tax.disc.preamble`,
`tax.disc.recID` (ber-interpolasi `{rate}` → **0,1%**), `tax.disc.reconcile`,
`tax.disc.stabilityPast`/`stabilityCurrent` (`{date}` → **31 Des 2026**, diformat locale di server),
`tax.disc.stabilityNone`, `tax.disc.yearBucket`, `tax.disc.filing`.

## (b) Keadaan wajib (terisi data)

`apps/web/src/features/expenses` **tidak punya uji unit (0 berkas .test.)** — bukti keadaan
bergantung pada e2e. Yang **benar-benar dijalankan** oleh `e2e/tests/expenses-tax.spec.ts`:

| Keadaan                      | Dijalankan? (bukti)                                                       | Pemicu                       | Kunci/elemen                                 |
| ---------------------------- | ------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------- |
| disclaimer terbuka           | **e2e** `expenses-tax.spec.ts:436` — `data-state="open"`                  | selalu (default)             | `tax.disclaimer.trigger` + badan server      |
| penuh + short/long (US)      | **e2e** `:436` — US lalu `:529` CA                                        | yurisdiksi US + posisi tutup | `tax.shortTerm`/`tax.longTerm`               |
| flag US→CA                   | **e2e** `:436` — "Wash sales" berganti "Superficial losses" bila ada flag | flag US/CA                   | `tax.washSales`/`tax.superficial` + `wash.*` |
| persistensi yurisdiksi       | **e2e** `:436` — reload → trigger "Canada"                                | PATCH sukses                 | selektor `tax.jurisdiction.*`                |
| kurs hilang                  | **e2e** `:544` — excluded-currency + deeplink "Enter rate"                | `missingRates.length > 0`    | `tax.missingRates` + `tax.enterRate`         |
| kosong                       | **belum** (tak ada uji)                                                   | realisasi & pengeluaran = 0  | `tax.emptyTitle`/`tax.emptyDesc`             |
| loading                      | **belum** (skeleton tak diassert)                                         | query berjalan               | 3× `Skeleton`                                |
| galat                        | **belum** (…`tax.loadFailed` tak diassert)                                | query gagal                  | `tax.loadFailed`                             |
| 1 baris (PPh satu mata uang) | **belum**                                                                 | satu mata uang PPh           | `tax.pphSell`+`tax.pphTitle`+`tax.pphNote`   |
| yurisdiksi ID                | **belum** otomatis                                                        | ID                           | subjudul `tax.subtitle` (tanpa klausa flag)  |

> `expenses-tax.spec.ts:321` (year filter) menjalankan EmptyState/populated pada halaman
> **Expenses**, bukan Tax Summary. Keadaan "belum" di atas wajib ditinjau manual sebelum `sah`.

**Bukti visual:** `e2e/tests/visual-design-reference.spec.ts-snapshots/accounting-tax-summary-{light,dark}-chromium-linux.png`.

## (c) Rubrik §5.5 + temuan

- **R0 reachability.** Untuk locale `id` + yurisdiksi `ID`: `tax.shortTerm`/`tax.longTerm`
  (`showShortLong = jurisdiction === 'US'`), `tax.washSales`/`tax.superficial` + seluruh `wash.*`
  (flag hanya dihitung US/CA), `tax.disc.recUS`/`recCA`/`heuristic` **tidak terjangkau** →
  `tidak-relevan`. **Perbaikan R0:** `tax.subtitle` dulu menjanjikan "posisi bertanda" bagi
  pengguna ID yang tak pernah melihat tabel flag → kini klausa itu dipindah ke
  `tax.subtitleFlags`, dipilih hanya bila `jurisdiction ∈ {US, CA}`
  (`TaxSummaryPage.tsx:showFlagCopy`).
- **R8.** Angka dari respons server/konstanta kanonik (`pphFinal.rate`, `PPH_FINAL_RATE_PERCENT`).
  Tidak ada literal tarif di kamus.
- **R11 (presisi).** Pemilih yurisdiksi memang menampilkan "United States"/"Canada" dan itu
  **sah** — pemilih itu sendiri penanda yurisdiksi. Yang disembunyikan adalah **metrik/konsep**
  yurisdiksi asing (jangka pendek/panjang, wash sale, superficial loss), dan itu sudah tidak
  dirender untuk ID.
- **R13.** Nilai kanonik diformat per locale **sebelum** masuk `translate()`: `{rate}` →
  "0,1" (id)/"0.1" (en); `{date}` → "31 Des 2026" (id)/"Dec 31, 2026" (en). Helper
  `formatNumber`/`formatDate` di `packages/shared/src/i18n.ts` (dipakai web + server).
- **R14.** `placeholder="0.00"` (13 situs) masih memakai pemisah EN — dicatat sebagai temuan,
  belum diperbaiki (di luar halaman kalibrasi).

| #   | Key i18n                              | Kutipan sebelum                                          | Pelanggaran                       | Terjangkau? | Perbaikan                                      | Dasar                                               |
| --- | ------------------------------------- | -------------------------------------------------------- | --------------------------------- | ----------- | ---------------------------------------------- | --------------------------------------------------- |
| 1   | `tax.jurisdiction.*`                  | `US: 'United States'` (literal di `JURISDICTION_LABELS`) | bahasa (label EN hardcode)        | ya          | pindah ke kamus                                | `TaxSummaryPage.tsx:45-50,190`                      |
| 2   | `tax.pphNote`                         | `Estimasi 0,1% dari nilai penjualan…`                    | R8 angka literal                  | ya          | `{rate}` dari `pphFinal.rate` + `formatNumber` | `i18n.ts:615`                                       |
| 3   | `tax.disc.recID`                      | `**PPh final 0,1% dari nilai penjualan**`                | R8 angka literal                  | ya (server) | `{rate}` + `formatNumber`                      | `i18n.ts:716`, `composeDisclaimer`                  |
| 4   | `tax.pphTitle`/`tax.pphNote` (widget) | `{ rate: pph.rate }` mentah                              | R13 (0.1 vs 0,1)                  | ya          | `formatNumber(pph.rate, locale)`               | `IdxTaxFeesWidget.tsx:54`                           |
| 5   | `tax.ratesAsOf`/`tax.disc.stability*` | `{date: ratesAsOf}` ISO mentah                           | R13 tanggal                       | ya          | `formatDate(..., locale)`                      | `expenses.service.ts:425`, `TaxSummaryPage.tsx:264` |
| 6   | `tax.subtitle`                        | menjanjikan "posisi bertanda"                            | R0 (deskripsi fitur tak-dirender) | ya          | `tax.subtitleFlags` kondisional                | `TaxSummaryPage.tsx:153`                            |

**Temuan tambahan (nyata, terdeteksi worksheet) — literal EN belum masuk kamus pada klaster akuntansi:**

| Berkas:baris                                                    | Literal                                                                              | Kelas  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------ |
| `features/expenses/components/ExpenseFormDialog.tsx:149`        | `Couldn't save expense. Try again.`                                                  | bahasa |
| `features/expenses/components/ExpenseFormDialog.tsx:189-190`    | `Record a deductible expense for your tax summary.` / `Update this expense entry.`   | bahasa |
| `features/expenses/components/ExpensesPage.tsx:128-129,138,194` | `Failed to delete expense`, `Track deductible expenses…`, `Failed to load expenses…` | bahasa |
| `features/expenses/components/FeeRollupPage.tsx:97,133,154`     | `Recorded fill fees aggregated by…`, `→ Tax Summary`, `Enter rate`                   | bahasa |

(`settings/billing`, Lapis 1, seluruhnya masih literal EN — dicatat di manifest.)

## (d) Keputusan glosarium (final untuk gelombang ini)

| Istilah                                                                                         | Keputusan                            | Dasar                                                                                     |
| ----------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| Fill, Stop Loss, Take Profit, P&L, Drawdown, Slippage, Tick, Win rate, Risk of ruin, Wash sales | `keep-en` (`term.*`)                 | metrik tanpa padanan mapan                                                                |
| Lot, PPh Final                                                                                  | `free` (identik)                     | regulasi IDX/OJK                                                                          |
| **Equity → "Ekuitas"**                                                                          | `translate` (koreksi: bukan keep-en) | copy lama `widget.equityCurve` "Kurva Ekuitas", `calc.basis.balance` "total ekuitas"      |
| **Breakeven → "Impas"**                                                                         | `translate` (koreksi: bukan keep-en) | copy lama `pos.filter.breakeven` "Impas", `calc.result.breakevenWinRate` "Win rate impas" |
| Position → "Posisi"                                                                             | `translate` (sementara)              | kosakata broker IDX                                                                       |

Rekonsiliasi lengkap (term → kunci kamus pembukti) ada di `GLOSSARY_RECONCILIATION`
(`packages/shared/src/glossary.ts`). Nama yurisdiksi tidak diduplikasi di glosarium — satu sumber
di kamus `tax.jurisdiction.*`.

## (e) Tindak lanjut tercatat — F7 (diparkir)

Lampiran mesin global `apps/web/docs/i18n-coverage.md` (UTF-8) memberi skala nyata:
**276 simpul teks JSX + 127 atribut = 403 salinan keras** belum masuk kamus (bukan "0%"),
dan **20 placeholder numerik R14**.

- R13-b tanggal: `toLocaleDateString()` tanpa locale di 9 situs (account-deletion, LedgerView,
  admin, FillTable, OpenPositionsWidget) → tunggu keputusan cakupan; perbaikan mekanis
  (formatter `formatDate` sudah tersedia di shared).
- R14: 20 placeholder numerik (mis. `0.00` ×12, `150.00` ×2, `100.00`, `0.0822`, `0.30`,
  `0.0440`) — lihat §R14 lampiran global.
- Lint otomatis tambahan (larangan `toLocaleDateString()` tanpa argumen; kalimat template literal
  seperti `admin/FactoryResetDialog.tsx:110` `Reset ${email} — ${total} rows deleted.`).
