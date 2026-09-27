# Rebrand — Tradr → Jurnal ZITN

Fork `ZITN-TECH-017` (runtime A). Tujuan: memakai kode Tradr (Apache-2.0) **tanpa** memakai merek
"Tradr" sebagai nama produk. Aturan dan inventaris di bawah dipakai saat mengganti nama.

## Aturan (jangan dilanggar)

- **Jangan ubah** `LICENSE`, `NOTICE`, `TRADEMARK.md` (atribusi upstream wajib dipertahankan).
- **Jangan ganti** tautan/atribusi upstream yang menyebut asal: `github.com/madmatt112/tradr`,
  `tradr.cloud`, `app.tradr.cloud`, `docs.tradr.cloud` — ini justru bagian dari atribusi.
- Ganti **nama tampilan produk** `Tradr` → `Jurnal ZITN` di UI, email, wordmark, judul halaman,
  dan pesan CLI. Dokumen/komentar internal boleh ikut berganti.
- Prefiks paket internal `@tradr/*` → `@jurnal-zitn/*` (identifier teknis; harus konsisten agar
  build/`pnpm`/tsconfig tidak putus).
- Prefiks global & penyimpanan: `__TRADR_CONFIG__` → `__JURNAL_ZITN_CONFIG__`,
  cookie `tradr_theme` → `jurnal_zitn_theme`, penanda boot `tradr:boot-theme` → `jurnal-zitn:boot-theme`.

## Inventaris (2026-09-26, base `bcc917c`)

- 262 kemunculan `Tradr` (kapital) di 70 berkas `apps/**` (UI, email, komentar, tes).
- 503 rujukan `@tradr/*` (workspace + impor).
- Area lain: `README.md`, `TRADEMARK.md`, `.github/**`, `docker/**`, `docs/**`, `packages/**`.

## Status

- [x] Fork dari upstream (remote `upstream` dipertahankan) + `MODIFICATIONS.md`/`NOTICE-ZITN`.
- [x] Ganti nama tampilan + scope paket (`@jurnal-zitn/*`) + identitas global
      (`__JURNAL_ZITN_CONFIG__`, `jurnal_zitn_theme`, bin `jurnal-zitn`, metrik `jurnal_zitn_*`,
      env `JURNAL_ZITN_*`).
- [x] Regenerasi `pnpm-lock.yaml` (`pnpm install`).
- [x] `pnpm -r check-types` lulus (apps/api, apps/web, apps/docs, packages/shared: 0 error).
- [x] Verifikasi tak ada lagi "tradr" kecuali **berkas atribusi** (`LICENSE`/`NOTICE`/
      `TRADEMARK.md`/`MODIFICATIONS.md`/`NOTICE-ZITN`/`REBRAND.md`/`AGENTS.md`) dan **baris
      tautan/atribusi upstream** (`madmatt112/tradr`, `tradr.cloud`).

## Catatan sisa (bukan kelalaian)

- Default `CHANGELOG_GITHUB_REPO=madmatt112/tradr`, `SEC_USER_AGENT=tradr (+https://tradr.cloud)`,
  dan `site: 'https://docs.tradr.cloud'` sengaja dibiarkan sampai domain produk ditetapkan.
- Perubahan belum di-commit (menunggu perintah); `git status` = 544 jalur.
