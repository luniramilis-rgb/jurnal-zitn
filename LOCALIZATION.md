# Lokalisasi Indonesia — Jurnal ZITN

Fork `ZITN-TECH-017` (runtime A). Produk menyasar pengguna Indonesia; basis upstream
berbahasa Inggris. Dokumen ini menetapkan pendekatan dan tahapan sebelum kode diterapkan.

## Keadaan saat ini (2026-09-26)

- **Tidak ada framework i18n** (tidak ada `i18next`/`react-intl`/`@lingui` di dependensi).
- Salinan UI **hardcoded Inggris** di ratusan komponen `apps/web/src/**`.
- Pemformatan angka/tanggal memakai `Intl.*(undefined, …)` (`apps/web/src/lib/format.ts`),
  jadi **ikut locale browser** — peramban `id-ID` sudah menghasilkan format Indonesia, tapi
  tidak dipaksa.
- Email transaksional (`apps/api/src/lib/email-templates.ts`) berbahasa Inggris.
- `taxJurisdiction` hanya `US | CA | other` (`users.schema.ts`) — belum ada `ID`.

## Keputusan (pemilik, 2026-09-26)

1. **Locale default**: **paksa `id-ID`** (`apps/web/src/lib/locale.ts` → `APP_LOCALE`).
2. **Mesin terjemahan**: **kamus TS ringan** (`apps/web/src/lib/i18n.ts`), tanpa dependensi baru.
3. **Zona reporting pengguna baru**: **`Asia/Jakarta`** (`DEFAULT_SIGNUP_TIMEZONE`); fallback baris
   pra-migrasi tetap `DEFAULT_REPORTING_TIMEZONE = 'UTC'` agar riwayat lama tidak ter-rebucket.

## Rencana bertahap

| Tahap | Isi                                                                  | Status                                         |
| ----- | -------------------------------------------------------------------- | ---------------------------------------------- |
| L0    | `<html lang="id">`, meta description ID                              | ✅ selesai                                     |
| L1    | Locale pemformatan `id-ID` (`format.ts`, `Numeric.tsx`) + uji format | ✅ selesai                                     |
| L2    | Mesin i18n ringan + ekstraksi string pertama (waktu relatif)         | ✅ fondasi selesai                             |
| L3    | Terjemahkan UI + email + pesan galat ke kamus                        | ⏳ sebagian (chunk fallback + prompt update)   |
| L4    | Disclaimer pajak ID (`taxJurisdiction` kini punya `ID`)              | ✅ selesai                                     |
| L5    | Uji locale (`id-ID`) di CI + tinjauan istilah keuangan ID            | ⏳ penjaga locale (`locale.test.ts`) sudah ada |

## A5 — Lokalisasi UI: Pesan galat + email (sebagian) — 2026-09-27

- Kamus `email.*` dan `web.*` (ID + EN).
- **Email transaksional** (`email-templates.ts`): semua salinan (subject, preheader, heading, intro,
  CTA, expiry, notice), baris “tempel tautan”, footer (tagline + “pesan transaksional otomatis”),
  dan atribut `<html lang>` kini mengikuti locale. `buildEmail(kind, token, locale)` dan
  `dispatchEmail(kind, to, token, locale)` menerima locale; ketiga pemanggil
  (`auth.service` registrasi, `verification.service` resend, `password-reset.service`) meneruskan
  `users.locale` (fallback `id`).
- **Root error/404** (`__root.tsx`): “Terjadi kesalahan” + Coba lagi, “Halaman tidak ditemukan” +
  deskripsi + tautan **Masuk**, dan status memuat.
- **Verifikasi:** `check-types` 0 error; `eslint` bersih; **29 uji rute** (`routes/__tests__`) hijau;
  uji runtime murni email (tsx) memverifikasi ID dan EN (`lang`, subject, expiry, tautan).
  Uji harness `apps/api` butuh Postgres test di `:5433` (tidak tersedia) → dijalankan di CI.
- **Tambahan A5-sisa (2026-09-27):**
  - **Disclaimer pajak (server)**: seluruh paragraf (preamble, klausa per yurisdiksi US/CA/ID/lainnya,
    rekonsiliasi, heuristik, stabilitas kurs, year-bucketing, filing) kini dari kamus `tax.disc.*`
    dan dipilih per `users.locale` (query `selectUserLocaleById`); smoke lokal memverifikasi ID & EN.
  - **Copy galat Changelog** (`changelog.error`, `changelog.empty`) dan **dialog admin**
    (`adm.delete.*`, `adm.error.*`, termasuk peta kode galat → kunci kamus).
  - **Format admin locale-aware**: `features/admin/lib/format.ts` memakai `getAppLocale()` (bukan
    locale peramban yang tertangkap saat modul dimuat) → menghapus 7 kegagalan uji pra-eksisting.
- **Sisa A5 — selesai (2026-09-27):** pemetaan **kode galat API → salinan lokal** di `apps/web/src/lib/api-error.ts`
  (`UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `INVALID_OR_EXPIRED_TOKEN`,
  `ALREADY_VERIFIED`, `EMAIL_NOT_CONFIGURED`, `REGISTRATION_DISABLED`, `INVALID_TIMEZONE`,
  `RATE_LIMITED`); kode tak dikenal → pesan generik lokal (bukan `error.message` Inggris). Dipakai di
  `login`/`register`. Uji unit `api-error.test.ts` (4 kasus).
- **Verifikasi A5:** `check-types` 0 error; `eslint` bersih; **188+4 uji** hijau (rute/changelog/admin/api-error);
  tsx email ID+EN; smoke disclaimer ID/EN. (Dua kegagalan tersisa di `src/lib` — `api.test.ts`
  pemisah path Windows dan `theme-bootstrap.test.ts` drift guard — **pra-eksisting**, bukan dari A5.)

## A4 — Lokalisasi UI: Kalkulator & Pajak — ✅ selesai 2026-09-27

- Kamus `calc.*`, `tax.*`, `expense.cat.*` (ID + EN).
- **Kalkulator**: judul halaman, label (Akun, Arah, Mode, Simbol, Kontrak, Harga masuk, Stop loss,
  Harga target, Risiko, Nilai risiko, Saldo, Persen risiko, Biaya, Biaya manual), placeholder
  (memuat/gagal/pilih), galat kutipan (4 kode + fallback), “Pilih broker untuk melihat estimasi biaya”,
  tombol **Ambil harga terakhir/Mengambil…**, kartu hasil (Nilai Risiko Terhitung, Ukuran Posisi,
  Daya beli, Risiko/Imbalan, Dampak Biaya, Setelah biaya) dan **pesan sizing** (4 kasus),
  serta **BuyingPowerBasisSelect** (Judul, Batasi ukuran berdasarkan, Kas/Saldo).
- **TaxSummaryPage**: judul, subjudul, filter Tahun/Yurisdiksi (termasuk “Lainnya”), trigger disclaimer,
  banner kurs hilang + Masukkan kurs, galat muat, empty state, rates-as-of/excluded, **P&L Realisasi**
  (per mata uang, Jangka pendek/panjang), **Pengeluaran Tercatat** (per kategori), **PPh Final**
  (Penjualan/Catatan/kosong), **Wash sales/Superficial losses**; label kategori pengeluaran dari kamus.
- **Catatan:** badan **disclaimer** masih dari server (Inggris) → diterjemahkan di A5 (galat + email).
- **Verifikasi:** `check-types` 0 error, `eslint` bersih, **176 uji** (kalkulator + akuntansi + rute) hijau.
  Uji kalkulator disetel `en` dan helper uangnya memakai `getAppLocale()` agar konsisten dengan aplikasi.
- **Tambahan A4-sisa:** **FeeRollupPage** (judul, filter tahun, banner kurs, tabel per-akun/per-mata uang,
  empty, galat), **ExpensesPage** (judul, filter tahun + “Semua tahun”, Total, kolom, tambah/ubah/hapus,
  empty, dialog hapus), **ExpenseFormDialog** (judul, label, placeholder, Simpan perubahan/Menyimpan),
  **AccountingSubNav** (Pengeluaran/Rekap Biaya/Ringkasan Pajak), **WashSaleFlagsTable** (kolom + alasan
  diterjemahkan + “+n lagi”).

## A3 — Lokalisasi UI: Posisi & Fills — ✅ selesai 2026-09-27

- Kamus `pos.*`, `page.positions` (ID + EN) — mencakup daftar, detail, fill, dialog, filter, OCC, lightbox.
- **PositionList**: judul, tombol **Posisi Baru** (+ tooltip “Buat akun dulu”), empty state + **Hapus filter**,
  seluruh header kolom (termasuk **Tanggal**).
- **PositionStatusChip**: Draf/Terbuka/Tertutup. **BreakevenBadge**: label + aria (Impas).
- **PositionDetail**: not-found, tooltip, kartu metrik (Harga Masuk/Keluar Rata-rata, Harga Target,
  R/R Target/Aktual, P&L Kotor/Bersih, Biaya Broker, Return %), **Catatan**, **Fill**, tombol
  **Tutup posisi/Buka kembali** + status pending, dan dialog hapus (judul + dua varian isi).
- **FillDialog/FillTable**: label & header, **Hapus fill**, tombol **Batal/Simpan/Tambah**.
- **PositionRowActions**: aria aksi, menu (Tambah/Kurangi/Buka/Buka kembali/Hapus) + dialog hapus.
- **CreatePositionDialog/PositionEditDialog**: judul, label (Simbol/Sisi/Jenis Aset/Akun/Catatan/Target/Stop Loss),
  SelectItem (Long/Short/Saham/Opsi), placeholder, tombol **Batal/Buat/Menyimpan**.
- **ClassificationFilter**: label **Hasil** + opsi Semua/Untung/Rugi/Impas.
- **PositionScreenshots + PositionImageLightbox**: judul, tambah, batas, kosong, aria buka/hapus, dialog hapus,
  judul/deskripsi lightbox, gambar tidak tersedia.
- **OptionContractFields**: Aset Dasar/Kedaluwarsa/Tipe/Strike + Call/Put.
- **Verifikasi:** `check-types` 0 error, `eslint` bersih, **221 uji posisi** hijau.

## A2 — Lokalisasi UI: Navigasi + Dashboard — ✅ selesai 2026-09-27

- Kamus `nav.*`, `page.*`, `widget.*`, `dashboard.*`, `w.*` (tubuh widget), `common.retry` (ID + EN).
- **Sidebar**: seluruh label item + label grup + aria-label + Keluar + sr-only pembaruan.
- **Header dashboard**: judul + tombol/dialog **Atur ulang tata letak**.
- **Judul widget**: `registry.ts` (`displayNameKey`) dipakai `WidgetCard`/`AddWidgetPopover`.
- **Tubuh widget**: StatsSummary (5 tile + empty/error), EquityCurve & PerformanceChart (empty/error +
  Retry), OpenPositions (tabel + empty), AccountBalances (empty, banner kurs hilang, total, link
  terhitung, CTA mata uang tampilan), CrossCurrencyTotal (judul, tooltip kurs hilang, Enter rate).
- Uji dipin ke `en` via `setAppLocale('en')` di module scope.
- **Verifikasi:** `check-types` 0 error, `eslint` bersih, **129 uji** navigasi/dashboard/widget hijau.

## A1 — Lokalisasi UI: Auth & Akun — ✅ selesai 2026-09-27

- Kamus `auth.*`, `settings.*`, `retention.*` (ID + EN) di `packages/shared/src/i18n.ts`.
- **Auth:** `login`, `register` (termasuk notice pendaftaran ditutup/peluncuran & status “periksa email”),
  `forgot-password`, `reset-password`, `verify-email`.
- **Akun:** `_auth.settings.account` (judul, badge terverifikasi, kirim ulang, keluar) +
  **alur hapus akun**: `DeleteAccountSection`, `DeleteAccountDialog` (peta galat per kode → kunci kamus,
  baris waktu dengan `{date}`), `RetentionSummary` (termasuk baris kredit dompet dengan `Numeric`).
- Pesan mismatch sandi (register/reset) mengikuti bahasa via `useMemo`.
- `useT()` jatuh ke locale modul tanpa `LocaleProvider`, sehingga uji mengunci bahasa dengan
  `setAppLocale('en')` + `afterEach` reset ke `id`.
- **Verifikasi:** `check-types` 0 error, `eslint` bersih; **56 uji** rute/komponen A1 hijau
  (termasuk uji salinan ID default pada login).

## A0 — Infrastruktur dua bahasa (ID/EN + toggle) — ✅ selesai 2026-09-27

- **Kamus bersama** `packages/shared/src/i18n.ts`: `SUPPORTED_LOCALES=['id','en']`, `DEFAULT_LOCALE='id'`,
  `AppLocaleEnum` (zod), `MESSAGES`, `translate(locale,key,vars)`, `resolveLocale`, `catalogsComplete()`.
- **Preferensi pengguna**: kolom `users.locale` (migrasi `0041`), endpoint
  `GET/PUT /api/users/me/locale` (`{locale, stored}`), mengikuti pola preferensi lain.
- **Web**: `lib/locale.ts` menyimpan locale aktif; `lib/i18n.ts` adapter; `hooks/useLocale.tsx`
  (`LocaleProvider`, `useLocale`, `useT`) — sumber: server → localStorage → default `id`;
  menyetel `document.documentElement.lang`.
- **Formatter**: `format.ts` + `Numeric.tsx` memakai `getAppLocale()` (bukan locale peramban);
  `format.test.ts` (id-ID) + `locale.test.ts` (beralih en) hijau.
- **UI**: pemilih bahasa di **Settings → Profile** (`UILanguageSelect`).
- **Verifikasi**: `check-types` 0 error, `eslint` bersih, uji shared+web A0 hijau (42+11),
  smoke lokal: `GET {locale:'id',stored:false}` → `PUT en` → `GET {locale:'en',stored:true}`.
- **Perbaikan reaktivitas (2026-09-27)**: `LocaleProvider` menyetel locale modul **secara sinkron saat
  render** (bukan di `useEffect`, yang tertinggal satu render) dan me-`key={locale}` subtree agar
  React merender ulang. Uji `useLocale.test.tsx` membuktikan format berubah seketika
  (`US$1.234,50` → `$1,234.50`) tanpa reload.

## Fase IDX (pasar Indonesia) — ZITN-TECH-017

Basis Tradr berorientasi AS (USD, NYSE, fee per saham, opsi OCC, wash-sale). Rencana adaptasi IDX:

| Fase     | Isi                                                                                                                                                                                                                                                                                                                                                                        | Status                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **1**    | **IDR** ditambahkan ke `SUPPORTED_CURRENCIES`; default akun **IDR**; default zona akun **`Asia/Jakarta`** (konstanta + kolom `accounts.timezone`, migrasi `0039`); yurisdiksi pajak `ID` (migrasi `0038`)                                                                                                                                                                  | ✅ selesai                                |
| **2a**   | **Fee persentase IDX**: `stockPercentBuy`/`stockPercentSell` di `FeeScheduleSchema` + `fee_schedules` (migrasi `0040`); `calculateFees` memakai persen bila > 0 (min/max tetap), jatuh ke per-saham bila 0; field UI di `FeeScheduleFields`; uji shared + web                                                                                                              | ✅ selesai                                |
| **2b-1** | **PPh final IDX**: `pphFinal` (0,1% nilai penjualan) di `TaxSummaryResponseSchema`; query `listIdxSellProceedsByCurrency`; komputasi di service + kartu di `TaxSummaryPage`; wash-sale/superficial-loss dibatasi US/CA (tidak lagi bocor ke ID); skema respons jurisdiksi memakai enum bersama (ID diterima); uji shared + smoke test lokal (1.000.000 IDR → PPh 1.000,00) | ✅ selesai                                |
| **2b-2** | **Lot (1 = 100 saham) + tick size**: helper murni `packages/shared/src/idx.ts` + uji; **disambungkan ke `FillDialog`** — toggle “Lot (100)” (lot→saham saat submit) dan pembulatan harga ke tick IDX saat blur, aktif saat jadwal fee memakai persentase; uji `FillDialog`                                                                                                 | ✅ selesai (impor CSV menyusul di Fase 3) |
| 3        | Pencarian/kutipan IDX (mis. `.JK`) menggantikan vendor AS; preset impor CSV broker ID                                                                                                                                                                                                                                                                                      | ⏳ opsional                               |
| 4        | Sembunyikan/disable fitur opsi gaya AS untuk konteks IDX                                                                                                                                                                                                                                                                                                                   | ⏳                                        |

**Catatan Fase 1:** preset broker ID **belum** ditambahkan karena `fee_schedules` masih model per-saham/per-kontrak; menambah preset dengan model itu akan menghasilkan fee yang salah untuk broker IDX — ikut Fase 2.

**Verifikasi Fase 1:** `pnpm -r check-types` + `eslint` bersih; `idx-defaults.test.ts` + `AccountDialog.test.tsx` hijau; DB lokal menerapkan `0039` (default `Asia/Jakarta`, check `expenses_currency_chk` memuat `IDR`).

## F2 — draf ID brokerages + accounts (ZITN-TECH-021 §5.7/§5.13) — 2026-09-28

- **Cabang:** `l10n-f2` (dari `l10n-id`). Commit kamus `4b125ea`, brokerages `15ae67d`,
  accounts + rute `160143d`, koreksi review §5.16 `87d6a3f`, dokumen ini + paket.
- **Status:** **diratifikasi `sah`** (pemilik "F2 OK", 2026-09-28) untuk ketiga rute; entri manifest
  `brokerages`/`accounts`/`accounts/$accountId` = `sah`, hash dijaga `i18n-review.test.ts`.
- **Kamus:** `broker.*`, `acct.*`, `common.*` (chrome umum: Nama/Catatan/Mata uang/Tutup/Lihat/Ubah/
  Hapus/Simpan/Buat/Konfirmasi/Lanjutkan/Tidak ada), `page.accounts`, `page.brokerages`.
- **Taat §5.13:** entity (`&apos;`/`&#39;`) → karakter asli di kamus; kalimat tak dirakit di JSX
  (plural EN pakai kunci `…One`/`…Many`, ID satu kunci); judul halaman lewat `t()` (bukan prop literal);
  `DISCLAIMER` preset IDX dipindah ke `broker.preset.idxNotes` (id/en) dengan persen dari
  `formatNumber`, dan kalimat keraguan "perkiraan… periksa dan sesuaikan" **dipertahankan** (R8).
- **Glosarium tidak diubah**; entri lapis `broker` tetap `provisional`.
- **Verifikasi:** `eslint` bersih; `tsc --noEmit` 0 error (shared+web); uji web F2 **51** + uji shared
  **740** hijau. Paket: `apps/web/docs/i18n-review-packet-{brokerages,accounts}.md`; lembar mesin
  `apps/web/docs/i18n-coverage-{brokerages,accounts}*.md`.
- **Sisa (temuan paket):** toast hooks (`useBrokerages`/`useAccounts`) & galat server masih EN;
  badan F3 `LedgerView`/`AccountBalance` belum dilokalisasi; `DeleteBrokerageDialog` belum tersambung
  (salinannya ditandai tidak-relevan, bug menu Hapus jadi tiket produk terpisah).

## F3 — draf ID ledger/buku besar + kurs/mata uang tampilan (ZITN-TECH-021 §5.7/§5.14) — 2026-09-28

- **Cabang:** `l10n-f3` (dari `l10n-id`). Lingkup: `features/accounting/components` (7 komponen) yang
  dirender di dua rute: `accounts/$accountId` (AccountBalance + LedgerView + dua dialog) dan
  `settings/profile` (DisplayCurrencySelect + ExchangeRatesPage + RateChangeConfirmModal).
- **Status:** **`sedang`** (belum diratifikasi). Entri manifest `accounts/$accountId` turun
  `sah` → `sedang` (hash `497a9d36` → `3ccfb1af`); entri baru `settings/profile` (Lapis 1) `sedang`.
  Karena status disetel `sedang` lebih dulu, `--emit-manifest` tidak auto-membalik ke `perlu-ulang`
  (bila `sah`, guard `i18n-review.test.ts` akan membaliknya). Rute `sah` lain tidak drift.
- **Kamus:** `acct.balance.*`, `acct.reconcile.*`, `cash.*`, `ledger.*`, `fx.*`, `displayCur.*`,
  `page.exchangeRates`, `placeholder.amount`, `action.reset`.
- **Taat §5.13/§5.14:** entity (`&apos;`/`&amp;` di ReconcileBalanceDialog & RecordCashMovementDialog)
  → karakter asli; `LedgerView` baris kalimat dirakit (`formatMoney` + `{' '}`) → satu kunci
  `ledger.delete.body` `{amount}`/`{entryType}`; `formatNumber` lokal → `formatLedgerAmount`;
  R13-b `LedgerView.tsx:147` → `formatDateTime` (`lib/format.ts`); R13-c `row.rate` →
  `formatNumber` presisi tinggi (id `0,000065`); R14 `0.00`×2 + `e.g., 0.92` ikut locale.
- **Glosarium tidak diubah**; istilah broker (saldo/kas/penarikan/deposit) mengikuti lapis ii, tidak
  ditambahkan ke `glossary.ts`.
- **Verifikasi:** `eslint` bersih; `tsc --noEmit` 0 error (shared+web); uji web F3 + guard
  **8 berkas / 63 uji** hijau; uji shared **740** hijau; entity 0 di lingkup F3.
  Paket: `apps/web/docs/i18n-review-packet-accounting.md`; lembar mesin
  `apps/web/docs/i18n-coverage-accounting.md` + `i18n-coverage-accounting-scan.md`.
- **Sisa (temuan paket):** toast hooks (`useCashMovements`/`useReconcileBalance`/`useExchangeRates`/
  `useDisplayCurrency`) & galat server masih EN; pesan zod `occurredAt` tidak-relevan (R0);
  nama mata uang `SUPPORTED_CURRENCIES[].name` EN (keputusan produk); angka before/after modal kurs
  kehilangan tebal (keputusan pemilik).

## Catatan uji

- `format.test.ts` + `i18n.test.ts` **hijau** dengan `id-ID`.
- Suite web lain masih memuat ekspektasi format lama (mis. `$1,234.50`) dan sebagian gagal
  **pra-eksisting** di lingkungan ini (mis. `tour-engine`, `OptionsChainViewer`). Memindahkan
  suite web ke `id-ID` perlu pembaruan ekspektasi bertahap di CI ber-baseline bersih.

## Prinsip

- Istilah keuangan tetap presisi (mis. "posisi", "fill", "realized P&L"); jangan mengarang
  padanan yang menyesatkan.
- Angka/harga tetap dari sumber kanonik; lokalisasi hanya format tampilan.
- Tidak menambah klaim; disclaimer tetap.

## Tinjauan manual per halaman (ZITN-TECH-021) — mulai 2026-09-28

Kebijakan: **istilah pasar tetap EN, kalimat penjelas ID, chrome ID**; tinjauan manual per
halaman **wajib**, dengan penegakan otomatis anti-busuk. Rujukan: `ZITN-TECH-021` §2/§4/§5.

- **Gate rilis:** `DEFAULT_LOCALE` ditahan `'en'` (`packages/shared/src/i18n.ts`) selama jendela
  tinjau agar pengguna melihat salinan EN yang koheren, bukan campuran mentah; dikembalikan ke
  `'id'` setelah Lapis 1 `sah` penuh. Uji: `packages/shared/src/i18n.test.ts`.
- **Glosarium:** `packages/shared/src/glossary.ts` — satu-satunya tempat keputusan istilah
  (`policy: keep-en | translate | free`, plus `source` tiga lapis: regulasi / broker / metrik).
  Namespace `term.*` di kamus (nilai identik `id`/`en`). Lint: `glossary.test.ts`.
- **Alat:** `node scripts/i18n-coverage.mjs` (lembar kerja `key → en → id` + salinan ID setelah
  substitusi + literal JSX belum-terekstrak: teks JSX, atribut, dan placeholder numerik R14;
  tulis UTF-8 eksplisit). Overlay dev `VITE_I18N_DEBUG=1` menandai fallback / kalimat `id === en`.
- **R13 (nilai kanonik):** angka/tanggal diformat per locale **sebelum** masuk `translate()` —
  `formatNumber`/`formatDate` di `packages/shared/src/i18n.ts` (dipakai web **dan** server, karena
  disclaimer dirender server). Bukti: `{rate}` → "0,1" (id). Tanpa ini nilai kanonik "0.1"
  bocor jadi "0.1%" di salinan ID.
- **R14 (placeholder):** placeholder numerik/tanggal di form harus ikut locale (mis. "0,00" bukan
  "0.00") — dicatat oleh alat, perbaikan menyusul per halaman.
- **Paket tinjau halaman kalibrasi:** `apps/web/docs/i18n-review-packet-tax-summary.md`
  (+ lampiran mesin `apps/web/docs/i18n-coverage-tax-summary.md`).
- **Penegak:** `apps/web/src/i18n-review.manifest.json` + `i18n-review.test.ts` — hash himpunan
  kunci per rute; drift pada rute `sah`/Lapis 1 → CI gagal sampai ditinjau ulang.
  Regenerasi: `node scripts/i18n-coverage.mjs --emit-manifest`.

### Lembar tinjau per rute

| Rute                     | Kelas    | Keadaan diuji                                                                                  | Peninjau                                                | Tanggal    | Commit           | Status   | Catatan                                                                                                                                                               |
| ------------------------ | -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------- | ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accounting/tax-summary` | Lapis 1  | kosong/loading/galat/1 baris/penuh + kurs hilang                                               | sesi `ses_f1614741bffeFv4Hxmb2QQGGz0`                   | 2026-09-28 | `c5cf71f`        | `sedang` | Verdict kalibrasi: diterima dengan perbaikan (6 temuan + R0 subjudul); paket di `apps/web/docs/i18n-review-packet-tax-summary.md`; menunggu ratifikasi pemilik        |
| `accounting/fee-rollup`  | Lapis 1  | —                                                                                              | —                                                       | —          | —                | `belum`  |                                                                                                                                                                       |
| `accounting/expenses`    | Lapis 1  | —                                                                                              | —                                                       | —          | —                | `belum`  |                                                                                                                                                                       |
| `settings/billing`       | Lapis 1  | —                                                                                              | —                                                       | —          | —                | `belum`  | Salinan masih literal EN (belum masuk kamus)                                                                                                                          |
| `calculator`             | Lapis 1  | —                                                                                              | —                                                       | —          | —                | `belum`  |                                                                                                                                                                       |
| `positions/$positionId`  | Lapis 1  | —                                                                                              | —                                                       | —          | —                | `belum`  |                                                                                                                                                                       |
| `import`                 | Lapis 1  | —                                                                                              | —                                                       | —          | —                | `belum`  |                                                                                                                                                                       |
| `settings/account`       | Lapis 1  | —                                                                                              | —                                                       | —          | —                | `belum`  |                                                                                                                                                                       |
| `brokerages`             | 1+chrome | buat + preset (2 uji); lain lihat paket                                                        | pemilik (F2 OK) + sesi `ses_f1614741bffeFv4Hxmb2QQGGz0` | 2026-09-28 | `87d6a3f`        | `sah`    | F2; paket `apps/web/docs/i18n-review-packet-brokerages.md`; disclaimer preset IDX pindah ke kamus (R8 terjaga); §5.16 koreksi (inventaris, `$`→netral, label risiko)  |
| `accounts`               | 3        | 26 uji daftar/dialog (cap, demo, default, risiko)                                              | pemilik (F2 OK) + sesi `ses_f1614741bffeFv4Hxmb2QQGGz0` | 2026-09-28 | `87d6a3f`        | `sah`    | F2; paket `apps/web/docs/i18n-review-packet-accounts.md`; perakitan `account{s}`/klausa writable → 4 kunci (`acct.cap.body*`); label risiko locale                    |
| `accounts/$accountId`    | 3        | 11 uji komponen ledger/akun + e2e render + reconcile/deposit (lihat paket)                     | — (menunggu ratifikasi; F2 chrome pemilik "F2 OK")      | 2026-09-28 | `f3` (lihat git) | `sedang` | F2 chrome (judul + Kembali/Buku besar) sempat `sah`; badan F3 (AccountBalance/LedgerView/dialog) kini lewat kamus → status turun `sedang`. Hash `497a9d36`→`3ccfb1af` |
| `settings/profile`       | Lapis 1  | `ExchangeRatesPage`/`DisplayCurrencySelect`/modal kurs (e2e `ledger-balances.spec.ts:658,722`) | — (menunggu ratifikasi)                                 | 2026-09-28 | `f3` (lihat git) | `sedang` | F3; paket `apps/web/docs/i18n-review-packet-accounting.md`; R13-b/R13-c/R14 (kurs presisi tinggi, tanggal berlaku, placeholder 0,92)                                  |

**Urutan Lapis:** 1 = angka/uang/klaim (tabel di atas + disclaimer pajak + email); 2 = dashboard +
widget, `positions/index`, `performance`, drawer; 3 = chrome, settings umum, changelog, admin,
tour/onboarding. Rute opsi gaya AS ditinjau terakhir atau ditandai "EN sengaja" (Fase 4).

**Catatan gate (perlu diketahui pemilik):** `DEFAULT_LOCALE` sendiri belum cukup memaksa EN untuk
pengguna — `LocaleProvider` menyemai bahasa dari browser (`detectBrowserLocale`) saat `users.locale`
NULL, sehingga peramban `id` tetap mendapat `id`. Bila tujuan gate adalah "semua pengguna melihat EN
selama jendela", penyemaian itu perlu ditahan sementara; keputusan ada di pemilik.

### Glosarium ringkas (awal; sementara)

| Istilah                                                                 | id                      | policy      | Lapis sumber                                |
| ----------------------------------------------------------------------- | ----------------------- | ----------- | ------------------------------------------- |
| Position                                                                | **Posisi**              | `translate` | broker (sementara)                          |
| Fill                                                                    | Fill                    | `keep-en`   | metrik                                      |
| Stop Loss / Take Profit                                                 | Stop Loss / Take Profit | `keep-en`   | metrik                                      |
| Lot                                                                     | Lot                     | `free`      | regulasi (IDX)                              |
| PPh Final                                                               | PPh Final               | `free`      | regulasi                                    |
| P&L / Drawdown / Slippage / Tick / Win rate / Risk of ruin / Wash sales | (EN)                    | `keep-en`   | metrik                                      |
| Equity                                                                  | **Ekuitas**             | `translate` | metrik (koreksi: copy lama pakai "Ekuitas") |
| Breakeven                                                               | **Impas**               | `translate` | metrik (koreksi: copy lama pakai "Impas")   |
| Win rate / Risk of ruin / Wash sales                                    | (EN)                    | `keep-en`   | metrik (hasil = milik pengguna, K11)        |

Istilah yang copy lamanya sudah mapan dan mengalahkan usulan keep-en awal ditulis sebagai
**keputusan final** di `GLOSSARY_RECONCILIATION` (`packages/shared/src/glossary.ts`), bukan
sekadar catatan: `equity → "Ekuitas"`, `breakeven → "Impas"`. Daftar `keep-en` selebihnya masih
**menunggu konfirmasi pemilik** (`ZITN-TECH-021` §7 butir 2).

**F7 — parkir (arahan prioritas "bahasa dulu, pengaman menyusul"):** R13-b 9 situs tanggal,
R14 (tool `scripts/i18n-coverage.mjs` melaporkan **19** placeholder numerik bergaya EN — 12× `"0.00"`,
2× `"100.00"`, 2× `"150.00"`, 1× `"0.0822"`, 1× `"0.30"`, 1× `"0.0440"`; hitungan manual peninjau
(11–12× `"0.00"` + `"150.00"`) **BERBEDA** — selaraskan sebelum F7), dan lint otomatis tambahan
(`toLocaleDateString()` tanpa locale; kalimat template literal).
Gelombang **F2 selesai & diratifikasi** (`brokerages`, `accounts`, `accounts/$accountId` → `sah`),
jadi bukan lagi butir parkir. Butir stale "keputusan gate `DEFAULT_LOCALE`" dihapus (sudah diputuskan
B1: default tetap `id` + penyemian browser). Tercatat sebagai `parkedItems` di
`apps/web/src/i18n-review.manifest.json`.
