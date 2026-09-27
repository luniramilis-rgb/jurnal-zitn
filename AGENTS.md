# AGENTS.md — Jurnal ZITN (fork Tradr, Apache-2.0)

Repo ini adalah **fork Tradr** untuk produk **Jurnal ZITN** (ZITN-TECH-017, runtime A: host
terpisah + SSO). Bahasa kerja: **Indonesia** untuk permukaan pengguna; kode/komentar boleh Inggris
mengikuti basis upstream.

## Aturan

- Atribusi wajib: pertahankan `LICENSE`, `NOTICE`, `TRADEMARK.md` apa adanya; perubahan dicatat di
  `MODIFICATIONS.md`. Jangan pakai merek "Tradr" sebagai nama produk (lihat `REBRAND.md`).
- Jangan hapus tautan atribusi upstream (`github.com/madmatt112/tradr`, `tradr.cloud`).
- SSO: ZITN adalah _identity provider_ (lihat `docs/product/HANDOFF_technical_17.md` di repo ZITN);
  token `purpose: journal_sso`, TTL 120 dtk, **nonce `jti` wajib dikonsumsi satu kali** di sisi ini.
- Entitlement journal = langganan bulanan aktif (tanpa kolom baru di ZITN).
- Metrik hasil (P&L, win-rate, dst.) hanya untuk pengguna atas datanya sendiri; bukan klaim/kinerja
  atau materi jual ZITN (K11). Data pengguna privat, dapat diekspor & dihapus.
- Tanpa notifikasi yang dipicu hasil.

## Perintah

```bash
pnpm install
pnpm -r check-types
pnpm -r lint
pnpm test            # unit; uji yang butuh DB perlu Postgres (docker compose)
```

## Referensi ZITN

- `ZITN-TECH-017` — integration & decisions (di repo ZITN).
- `docs/product/HANDOFF_technical_17_lisensi.md` — audit lisensi (repo ZITN).
