# ROADMAP — Jurnal ZITN (fork Tradr)

Rancangan kerja berurutan setelah Fase IDX 1–2 dan fondasi SSO/ekspor. Referensi: `ZITN-TECH-017`
(repo ZITN), `LOCALIZATION.md`, `DEPLOY.md`, `REBRAND.md`.

## Status ringkas (2026-09-27)

**Selesai:** fork + rebrand; SSO ZITN→journal (token `journal_sso`, `jti` sekali-pakai) + `/api/auth/sso`;
ekspor `/api/users/me/export` (hapus akun sudah ada di basis); IDR + zona `Asia/Jakarta` + pajak `ID`;
fee persentase + PPh final + lot/tick IDX (UI entri); Tunnel `jurnal-zitn` + DNS `jurnal` (proxied);
secret Pages ZITN (`JOURNAL_SSO_SECRET`, `JOURNAL_SSO_URL`) terpasang, endpoint **fail-closed 503**.

**Belum:** host produksi (VPS + Postgres), aktivasi `JOURNAL_ENABLED`, lokalisasi UI menyeluruh,
UI ekspor data, penyembunyian fitur opsi AS, impor CSV IDX, CI/uji ber-Postgres, integrasi kartu beranda.

## Keputusan yang perlu pemilik

1. **Bahasa**: paksa `id-ID` (sekarang) atau tambah **toggle ID/EN** di `/akun/`.
2. **Fitur opsi AS**: sembunyikan penuh untuk IDX, atau biarkan mati karena vendor tak dikonfigurasi.
3. **Nilai identitas ZITN** untuk mengganti default upstream: slug repo GitHub (changelog),
   URL docs, UA/URL kontak SEC.
4. **Backup & region**: retensi `pg_dump`, jam backup, region hosting (residensi data).

---

## Fase A — Bisa dikerjakan sekarang (tanpa host, lokal/CI)

| #      | Pekerjaan                                                                                                                                                                                                                                                                                                                                                                                       | Berkas utama                                                                                                                                                                       | Verifikasi                                                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| ~~A0~~ | ~~**Infrastruktur i18n dua bahasa (ID/EN + toggle)**~~ — **✅ selesai 2026-09-27**: kamus bersama `packages/shared/src/i18n.ts`, kolom `users.locale` (migrasi `0041`), endpoint `GET/PUT /users/me/locale`, `LocaleProvider`+`useT`, formatter locale-aware, pemilih bahasa di Settings → Profile                                                                                              | shared `i18n.ts`, `hooks/useLocale.tsx`, `components/UILanguageSelect.tsx`                                                                                                         | check-types/eslint bersih; uji A0 hijau; smoke lokal ✓                   |
| A1     | **Lokalisasi UI batch-1: Auth & Akun** — ✅ **selesai**: `login`, `register`, `forgot-password`, `reset-password`, `verify-email`, pengaturan akun + alur hapus akun (`DeleteAccountSection`/`Dialog`, `RetentionSummary`). Kamus `auth.*`/`settings.*`/`retention.*`; uji dipin ke `en` + uji salinan ID.                                                                                      | `apps/web/src/routes/*auth*`, `features/account-deletion/**`, kamus                                                                                                                | 56 uji hijau; `check-types`/`eslint` bersih                              |
| A2     | **Lokalisasi UI batch-2: Navigasi + Dashboard** — ✅ **selesai**: sidebar (label/grup/a11y), header dashboard + dialog atur ulang, **judul widget** (registry), dan **isi tubuh widget** (StatsSummary, EquityCurve, PerformanceChart, OpenPositions, AccountBalances, CrossCurrencyTotal)                                                                                                      | `components/layout/Sidebar.tsx`, `features/dashboard/**`                                                                                                                           | 129 uji hijau; `check-types`/`eslint` bersih                             |
| A3     | **Lokalisasi batch-3: Posisi & Fills** — ✅ **selesai**: `PositionList`, `PositionStatusChip`, `FillDialog`, `FillTable`, `PositionDetail`, `PositionRowActions` (menu + dialog hapus), `CreatePositionDialog`, `PositionEditDialog`, `ClassificationFilter`, `BreakevenBadge`, `PositionScreenshots`, `PositionImageLightbox`, `OptionContractFields`                                          | `features/positions/**`                                                                                                                                                            | 221 uji posisi hijau; `check-types`/`eslint` bersih                      |
| A4     | **Lokalisasi batch-4: Kalkulator & Pajak** — ✅ **selesai**: kalkulator (page/form/results/basis) + **TaxSummaryPage**, **FeeRollupPage**, **ExpensesPage**, **ExpenseFormDialog**, **AccountingSubNav**, **WashSaleFlagsTable**                                                                                                                                                                | `features/calculator/**`, `features/expenses/**`                                                                                                                                   | 176 uji (kalkulator+akuntansi+rute) hijau; `check-types`/`eslint` bersih |
| A5     | **Lokalisasi batch-5: Pesan galat + email** — ✅ **selesai**: **email transaksional**, **root error/404**, **disclaimer pajak** (server per `users.locale`), **copy Changelog**, **dialog admin**, **format admin locale-aware**, dan **pemetaan kode galat API → salinan lokal** (`lib/api-error.ts`)                                                                                          | `apps/api/src/lib/email-templates.ts`, `apps/api/src/features/expenses/expenses.service.ts`, `apps/web/src/lib/api-error.ts`, `routes/__root.tsx`, `features/{changelog,admin}/**` | tsx ID+EN; smoke disclaimer ID/EN; uji rute/lib hijau                    |
| A6     | **UI Ekspor data** (tombol di pengaturan akun → unduh `GET /api/users/me/export`)                                                                                                                                                                                                                                                                                                               | `features/settings/**`, `hooks`                                                                                                                                                    | uji komponen + smoke lokal                                               |
| A7     | **Fase 4 IDX**: sembunyikan/disable fitur opsi gaya AS (OCC, Options chain) untuk konteks IDX                                                                                                                                                                                                                                                                                                   | `routes`, `features/options/**`, flag                                                                                                                                              | uji rute + grep komponen                                                 |
| A8     | **Fase 3a IDX**: impor CSV — dukung **lot→saham** + fee persen; preset pemetaan kolom broker ID                                                                                                                                                                                                                                                                                                 | `features/csv-import/**`                                                                                                                                                           | uji parser + fixture CSV                                                 |
| A9     | **Identitas ZITN**: ganti 3 default upstream (A3 dari keputusan)                                                                                                                                                                                                                                                                                                                                | `config.ts`, `astro.config.mjs`                                                                                                                                                    | grep verifikasi                                                          |
| A10    | **CI**: GitHub Actions — ✅ **repo + workflows aktif**: `ci.yml` (jobs `checks` + `test-api` dengan Postgres service di **:5433** + lint/type/migrasi) dan **`images.yml` baru** (build & push image `jurnal-zitn-api`/`jurnal-zitn-web` ke **GHCR** `:edge` + `:sha-<commit>` pada tiap push ke main, agar host 1-core cukup `pull`). Repo: `github.com/luniramilis-rgb/jurnal-zitn` (privat). | `.github/workflows/{ci,images}.yml`                                                                                                                                                | jalankan pertama di tab Actions (lihat hasil)                            |
| A11    | **Dokumentasi ops**: perluas `DEPLOY.md` (backup, monitoring, rotasi rahasia)                                                                                                                                                                                                                                                                                                                   | `DEPLOY.md`                                                                                                                                                                        | tinjauan                                                                 |

Urutan disarankan: **A10 (CI) → A1–A5 (lokalisasi bertahap) → A6 → A7 → A8 → A9 → A11**.
A10 dulu agar setiap batch berikutnya terverifikasi otomatis (uji ber-Postgres di CI).

## Fase B — Aktivasi produksi (butuh VPS)

| #   | Pekerjaan                                                                                                 | Verifikasi                               |
| --- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| B1  | Provision VPS (1 Core/2 GB/60 GB) → swap 4 GB, batas log Docker, tuning Postgres, hardening SSH           | `free -h`, `df -h`                       |
| B2  | Deploy stack (pull image GHCR atau build), jalankan migrasi, smoke test lokal host                        | `docker compose ps`, `curl -I localhost` |
| B3  | Verifikasi `https://jurnal.zeninthenoise.com` **530 → 200** (tunnel sehat)                                | curl TLS                                 |
| B4  | **Aktivasi ZITN**: set `JOURNAL_ENABLED=true` + redeploy, uji **SSO end-to-end** (302 → sesi → dashboard) | alur manual + log                        |
| B5  | Aktifkan **ekspor/hapus** dari UI, uji di produksi                                                        | unduhan JSON                             |
| B6  | **Backup terjadwal** (`pg_dump` + retensi) & monitoring disk/RAM; **rotasi** kredensial + kunci key-only  | restore uji                              |
| B7  | Opsional: **Cloudflare Access** untuk `/admin`                                                            | uji akses                                |

## Fase C — Integrasi balik ke ZITN (#2)

| #   | Pekerjaan                                                                                   | Berkas (repo ZITN)                                        | Verifikasi           |
| --- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------- |
| C1  | Kartu utama #3 beranda → `/jurnal/`                                                         | `scripts/make_beranda.py`                                 | uji beranda          |
| C2  | Rute `/jurnal` (redirect/atau subdomain) + documentasi                                      | `web/site/_redirects`, `docs/product/struktur_halaman.md` | `build_site --check` |
| C3  | **D12**: bila journal menampilkan harga/OHLCV, pastikan gerbang `DATA_DISTRIBUTION_ALLOWED` | `functions/**`, docs                                      | uji D12              |
| C4  | Legal: tautan `/legal/` dari permukaan journal + catatan data pengguna                      | `web/jurnal`/journal footer                               | tinjauan             |
| C5  | Deploy + uji permukaan                                                                      | `publish_site.py`                                         | curl live            |

## Fase D — IDX lanjutan (opsional)

| #   | Pekerjaan                                                                                             | Catatan                               |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- |
| D1  | Sumber simbol/kutipan **IDX** (mis. `.JK`) menggantikan vendor AS                                     | bila mau harga live                   |
| D2  | Kalender/jam pasar IDX + libur nasional                                                               | bila ada fitur sesi                   |
| D3  | Preset broker ID lengkap (Mirae/Stockbit/Sinarmas/BNI/Indo Premier) + fee persen default + disclaimer | menuntut model fee persen (sudah ada) |
| D4  | Pajak: opsi perhitungan pajak lain (PPh badan) + ekspor CSV pajak                                     | bila diperlukan                       |

---

## Definition of done per fase

- **A**: `pnpm -r check-types` + `pnpm test` (CI dengan Postgres) hijau; `eslint` bersih; tiap batch
  lokalisasi punya uji komponen; tidak ada string Inggris yang tersisa pada permukaan yang diselesaikan.
- **B**: subdomain 200; SSO end-to-end; ekspor/hapus jalan; backup & restore terbukti; kredensial dirotasi.
- **C**: kartu beranda & rute tayang; `build_site --check` bersih; pagar doktrin (D12) dipatuhi.
- **D**: opsional, hanya setelah A–C stabil.
