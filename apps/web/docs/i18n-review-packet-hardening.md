# Paket tinjau i18n — pengerasan F5 (calculator · positions · fee-rollup · account-deletion)

- **Reference:** `ZITN-TECH-021` §5.21 (residu tak-terpeta), §5.22 (reconnaissance F5), §5.14 (D5).
  Brief pemilik/peninjau F5 SUB-C.
- **Basis:** `l10n-f5`; commit F5-SUB-C `634d567`. Tanggal: 2026-09-29.
- **Cakupan:** hanya **item yang disebut brief** (bukan seluruh literal rute) — sisa yang belum
  dikerjakan didaftarkan eksplisit di bawah agar tidak tersembunyi.
- **Manifest:** `calculator` (53 kunci), `positions/$positionId` (82), `accounting/fee-rollup` (14),
  `settings/account` (48) — tetap `belum` (gelombang rutenya belum `sah`); `settings/billing` `sedang`.

## (a) Worksheet `key → en → id` dengan salinan setelah substitusi

Sumber mesin: `apps/web/docs/i18n-coverage-hardening.md` (12 kunci baru gelombang ini).

## Lembar kerja (`^(calc\.placeholder\.amount|calc\.options\.selectFromChain|calc\.sizing\.limitedByBuyingPower|fee\.enterRate|pos\.fill\.none|pos\.detail\.editTags|pos\.detail\.addFill|pos\.shots\.unavailable|pos\.shots\.tooLarge|pos\.occ\.strikePlaceholder|pos\.placeholder\.amount|pos\.fill\.enterPriceQty)$`)

| Key                                | en                                            | id                                         | id (substitusi contoh)                     | en (substitusi contoh)                        |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------ | ------------------------------------------ | --------------------------------------------- |
| `calc.options.selectFromChain`     | Select from options chain                     | Pilih dari rantai opsi                     | Pilih dari rantai opsi                     | Select from options chain                     |
| `calc.placeholder.amount`          | 0.00                                          | 0,00                                       | 0,00                                       | 0.00                                          |
| `calc.sizing.limitedByBuyingPower` | Position size limited by account buying power | Ukuran posisi dibatasi oleh daya beli akun | Ukuran posisi dibatasi oleh daya beli akun | Position size limited by account buying power |
| `fee.enterRate`                    | Enter rate                                    | Masukkan kurs                              | Masukkan kurs                              | Enter rate                                    |
| `pos.detail.addFill`               | Add Fill                                      | Tambah Fill                                | Tambah Fill                                | Add Fill                                      |
| `pos.detail.editTags`              | Edit tags                                     | Ubah tag                                   | Ubah tag                                   | Edit tags                                     |
| `pos.fill.enterPriceQty`           | Enter price and quantity                      | Masukkan harga dan kuantitas               | Masukkan harga dan kuantitas               | Enter price and quantity                      |
| `pos.fill.none`                    | No fills yet                                  | Belum ada fill                             | Belum ada fill                             | No fills yet                                  |
| `pos.occ.strikePlaceholder`        | 150.00                                        | 150,00                                     | 150,00                                     | 150.00                                        |
| `pos.placeholder.amount`           | 0.00                                          | 0,00                                       | 0,00                                       | 0.00                                          |
| `pos.shots.tooLarge`               | That image is too large to upload.            | Gambar itu terlalu besar untuk diunggah.   | Gambar itu terlalu besar untuk diunggah.   | That image is too large to upload.            |
| `pos.shots.unavailable`            | Image no longer available                     | Gambar tidak lagi tersedia                 | Gambar tidak lagi tersedia                 | Image no longer available                     |

## (b) Keadaan yang benar-benar dijalankan (mana + bukti, kapan, oleh apa)

Dijalankan **2026-09-29** oleh sesi drafter F5 (cabang `l10n-f5`) via
`node node_modules/vitest/vitest.mjs run --project web calculator positions account-deletion FeeRollup`

- `ProposedPositions`. Hasil gabungan: **35 berkas / 332 uji lulus** (satu kegagalan awal
  `ProposedPositions.pnl` — **diperbaiki**, lihat §c #7).

| Keadaan                                                                                  | Dijalankan? | Bukti                                                                      |
| ---------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| PositionDetail: P&L, klasifikasi, double-fee; harga rata-rata lewat `formatPriceDecimal` | ya          | `PositionDetail.pnl.test.tsx` (7), `.classification` (3), `.doubleFee` (3) |
| FillDialog: placeholder & field                                                          | tidak       | tak ada uji khusus FillDialog                                              |
| FillTable: teks "No fills yet" + `formatDateTime`                                        | ya (render) | tersentuh lewat `PositionDetail.*`                                         |
| OptionContractFields: placeholder strike                                                 | tidak       | tak ada uji khusus                                                         |
| PositionScreenshots / PositionImageLightbox: "Image no longer available"                 | tidak       | tak ada uji khusus                                                         |
| BuyingPowerBasisSelect (calculator)                                                      | ya          | `BuyingPowerBasisSelect.test.tsx` (6)                                      |
| CalculatorForm/Results: placeholder R14 + 2 teks                                         | tidak       | tak ada uji komponen Calculator                                            |
| FeeRollupPage: "Enter rate"                                                              | tidak       | tak ada uji khusus                                                         |
| account-deletion: DeleteAccountDialog timing (locale-aware)                              | ya          | `DeleteAccountDialog.test.tsx`                                             |
| account-deletion: DeleteAccountSection scheduled date (locale-aware)                     | ya          | `DeleteAccountSection.test.tsx`                                            |
| `ProposedPositions` (helper bersama)                                                     | ya          | `ProposedPositions.pnl` (4), `.contract` (3)                               |

**Dijalankan juga:** `tsc --noEmit` shared **0**, web **0**; `vitest --project shared` 741 lulus.

## (c) Temuan (berkutipan, dengan kolom Terjangkau?)

| #   | Locus                                                              | SEBELUM                                                         | SETELAH (ID)                                                                        | Butir    | Terjangkau? |
| --- | ------------------------------------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------- | ----------- |
| 1   | `CalculatorForm.tsx` (7×)                                          | `placeholder="0.00"`                                            | `placeholder={t('calc.placeholder.amount')}` = "0,00"                               | R14      | ya          |
| 2   | `CalculatorForm.tsx:604`                                           | `Select from options chain`                                     | `calc.options.selectFromChain` = "Pilih dari rantai opsi"                           | §5.21    | ya          |
| 3   | `CalculatorResults.tsx:196`                                        | `Position size limited by account buying power`                 | `calc.sizing.limitedByBuyingPower` = "Ukuran posisi dibatasi oleh daya beli akun"   | §5.21    | ya          |
| 4   | `FillDialog.tsx:274,391`                                           | `placeholder="0.00"` (harga, fee)                               | `pos.placeholder.amount` = "0,00"                                                   | R14      | ya          |
| 5   | `FillDialog.tsx:385`                                               | `placeholder="Enter price and quantity"`                        | `pos.fill.enterPriceQty` = "Masukkan harga dan kuantitas"                           | §5.21    | ya          |
| 6   | `OptionContractFields.tsx:91`                                      | `placeholder="150.00"`                                          | `pos.occ.strikePlaceholder` = "150,00"                                              | R14      | ya          |
| 7   | `FillTable.tsx:68`                                                 | `No fills yet`                                                  | `pos.fill.none` = "Belum ada fill"                                                  | §5.21    | ya          |
| 8   | `FillTable.tsx:82`                                                 | `new Date(fill.filledAt).toLocaleString()`                      | `formatDateTime(fill.filledAt)`                                                     | R13-b    | ya          |
| 9   | `PositionDetail.tsx:158`                                           | `Edit tags`                                                     | `pos.detail.editTags` = "Ubah tag"                                                  | §5.21    | ya          |
| 10  | `PositionDetail.tsx:411`                                           | `Add Fill`                                                      | `pos.detail.addFill` = "Tambah Fill"                                                | §5.21    | ya          |
| 11  | `PositionDetail.tsx:233,245`                                       | `position.avgEntryPrice.toFixed(4)` / `avgExitPrice.toFixed(4)` | `formatPriceDecimal(...)` (shared, satu mekanisme)                                  | D5/§5.21 | ya          |
| 12  | `PositionScreenshots.tsx:158,162` + `PositionImageLightbox.tsx:88` | `Image no longer available` (aria + teks, ×3)                   | `pos.shots.unavailable` / `pos.lightbox.unavailable` = "Gambar tidak lagi tersedia" | §5.21    | ya          |
| 13  | `PositionScreenshots.tsx:75`                                       | `toast.error('That image is too large to upload.')`             | `pos.shots.tooLarge` = "Gambar itu terlalu besar untuk diunggah."                   | §5.21    | ya          |
| 14  | `FeeRollupPage.tsx:162`                                            | `Enter rate`                                                    | `fee.enterRate` = "Masukkan kurs"                                                   | §5.21    | ya          |
| 15  | `DeleteAccountDialog.tsx:72`                                       | `periodEnd.toLocaleDateString()`                                | `formatDate(periodEnd, locale)`                                                     | R13-b    | ya          |
| 16  | `DeleteAccountSection.tsx:69`                                      | `new Date(scheduledFor).toLocaleDateString()`                   | `formatDate(scheduledFor, locale)`                                                  | R13-b    | ya          |
| 17  | `packages/shared`                                                  | `formatDot` lokal di `ProposedPositions`                        | `formatPriceDecimal` bersama (diangkat)                                             | D5/§5.22 | ya          |

**Catatan kejujuran proses (#17 → 7).** Saat mengangkat helper, satu berkas sempat rusak encoding
oleh operasi tulis shell non-UTF-8 (em dash `—`, `§`, `↔` menjadi mojibake). Terdeteksi lewat
kegagalan uji `ProposedPositions.pnl` (`expected … to contain '—'`). **Diperbaiki** dan diverifikasi
byte-level (kini `U+2014`, `U+00A7`, `U+2194`). Uji hijau setelah perbaikan. Pelajaran: jangan
menulis berkas berisi non-ASCII lewat `Set-Content` PS5.1.

## (d) Nilai setelah format (D5)

| Situs                            | Nilai mentah               | Mekanisme                                             | Hasil (id)            | Hasil (en)               |
| -------------------------------- | -------------------------- | ----------------------------------------------------- | --------------------- | ------------------------ |
| `PositionDetail` harga rata-rata | `1234.5`                   | `formatPriceDecimal` (`formatNumber(…,'en',{max:8})`) | `1234.5`              | `1234.5`                 |
| `PositionDetail` harga rata-rata | `0.15`                     | idem                                                  | `0.15`                | `0.15`                   |
| `FillTable` waktu                | `2026-05-01T09:30:00.000Z` | `formatDateTime` (locale tampilan)                    | `1 Mei 2026, 16.30`\* | `May 1, 2026, 4:30 PM`\* |
| `DeleteAccount*` tanggal jadwal  | `2026-10-01T00:00:00.000Z` | `formatDate` (UTC-pinned)                             | `1 Okt 2026`\*        | `Oct 1, 2026`\*          |

\* Zona waktu lingkungan `+07:00`; `formatDateTime` memakai zona lokal (instant), `formatDate`
UTC-pinned (tanggal-saja).

**Prinsip satu mekanisme:** `formatPriceDecimal` (gaya titik, tanpa grouping) kini satu-satunya
formatter kelas "harga/kuantitas"; `toFixed(4)` di `PositionDetail` **dihapus**.

## (e) Baris ledger

| Rute                    | Kelas   | Keadaan diuji                                                 | Peninjau | Tanggal    | Commit    | Status  | Catatan                                     |
| ----------------------- | ------- | ------------------------------------------------------------- | -------- | ---------- | --------- | ------- | ------------------------------------------- |
| `calculator`            | Lapis 1 | placeholder R14 (7) + 2 teks; sisa literal belum              | —        | 2026-09-29 | `634d567` | `belum` | SUB-C; sisa milik gelombang rute calculator |
| `positions/$positionId` | Lapis 1 | teks + R13-b + placeholder + `formatPriceDecimal`; sisa belum | —        | 2026-09-29 | `634d567` | `belum` | SUB-C; sisa milik gelombang rute positions  |
| `accounting/fee-rollup` | Lapis 1 | "Enter rate"                                                  | —        | 2026-09-29 | `634d567` | `belum` | SUB-C                                       |
| `settings/account`      | Lapis 1 | account-deletion date locale-aware                            | —        | 2026-09-29 | `634d567` | `belum` | SUB-C                                       |

## Sisa yang BELUM dikerjakan (residu terlihat, dinyatakan eksplisit)

Reproduksi: `node scripts/i18n-coverage.mjs --route calculator` dan `--route positions`.

- **calculator** (di luar 9 item brief): `BuyingPowerBasisSelect.tsx` (1 jsx-text + 2 literal),
  `CalculatorPage.tsx` (subjudul), `CalculatorForm.tsx` (dialog desc, "No last trade…", `Selected
contract:`, tab "Dollar"/"Percent"), `CalculatorResults.tsx` (9 `label=` Row + "Enter trade
  parameters…"), `useBuyingPowerBasis.ts` (2 toast).
- **positions** (di luar item brief): `CreatePositionDialog.tsx` (pesan validasi + limit), `FillDialog.tsx`
  ("Enter a valid date and time"), `PositionDetail.tsx` (peringatan double-fee), `FillTable.tsx`
  (angka mentah price/qty/fees — R13-c), `PositionScreenshots.tsx` (alt rakit +), `usePositionImages.ts`
  (toast), `drawer/OpenPositionsTab.tsx`.
- **onboarding/lib/steps/calculator.ts** — banyak literai (rute onboarding, di luar F5).

## Blocker & langkah rekomendasi selanjutnya

1. **Memblokir `sah` rute-rute ini:** gelombang rute calculator/positions/fee-rollup/settings-account
   harus menutup residu di atas lalu paket + ratifikasi.
2. Tinjau manual berscreenshot untuk calculator/positions (tidak ada uji komponen).
3. Tidak memblokir: `formatPriceDecimal` tersedia untuk dipakai lebih luas (mis. FillTable) saat
   gelombang positions dikerjakan.
