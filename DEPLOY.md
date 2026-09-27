# Deploy & aktivasi — Jurnal ZITN

Fork Tradr (Apache-2.0). Runtime terpisah dari ZITN; ZITN adalah _identity provider_ lewat SSO
sekali-pakai (lihat `MODIFICATIONS.md`, `AGENTS.md`).

## 1. Prasyarat

- Node ≥ 22, `pnpm` 9.15.
- PostgreSQL + `DATABASE_URL` (+ `DIRECT_DATABASE_URL` bila pakai transaction pooler).
- `SESSION_SECRET` (sesi journal), kredensial SMTP bila email diaktifkan.
- Migrasi dijalankan otomatis saat boot (`apps/api/src/db/migrate.ts`), termasuk
  `0037_flowery_morgan_stark.sql` (tabel SSO + `users.zitn_user_id`).

## 1b. Domain: `jurnal.zeninthenoise.com` (zona Cloudflare)

Zona `zeninthenoise.com` ada di **Cloudflare** (NS `eleanor`/`will.ns.cloudflare.com`), apex sudah
dipakai ZITN (Pages). Journal diletakkan di **subdomain** `jurnal.zeninthenoise.com`; **jangan** apex.

Pilih salah satu jalur:

**A. Cloudflare Tunnel (disarankan — origin tanpa IP publik)**

Opsi A1 — Docker (paling cepat). Overlay `docker-compose.cloudflare.yml` disediakan:

1. Zero Trust → **Networks → Tunnels → Create a tunnel** → copy **token**.
2. Tambahkan **Public Hostname**: `jurnal.zeninthenoise.com` → service `http://web:80`
   (dashboard **membuat record CNAME proxied `jurnal` otomatis**).
3. Di host:
   ```bash
   # .env: POSTGRES_*/secret terisi + TUNNEL_TOKEN=eyJ...
   docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d
   ```

Opsi A2 — `cloudflared` native di host (bukan Docker):

```bash
# di server journal
cloudflared tunnel login
cloudflared tunnel create jurnal-zitn
cloudflared tunnel route dns jurnal-zitn jurnal.zeninthenoise.com   # membuat CNAME proxied
# /etc/cloudflared/config.yml
#   tunnel: jurnal-zitn
#   credentials-file: /root/.cloudflared/<UUID>.json
#   ingress:
#     - hostname: jurnal.zeninthenoise.com
#       service: http://localhost:80
#     - service: http_status:404
cloudflared service install
```

`cloudflared tunnel login` bersifat **interaktif** (buka peramban) dan harus dijalankan di host/akun yang benar.

**B. A record ke VPS (origin punya IP publik)**

- Dashboard → zona → **DNS → Records → Add record**: Type `A`, Name `jurnal`, IPv4 = IP origin,
  **Proxied**. Pasang **Cloudflare Origin Certificate** di origin, SSL/TLS = **Full (strict)**,
  dan batasi firewall ke rentang IP Cloudflare.

**C. CNAME ke PaaS (Railway/Fly/Render)**

- Deploy journal, tambah custom domain di platform, lalu di Cloudflare: CNAME `jurnal` → target
  platform, **Proxied** (atau DNS-only bila platform menerbitkan sertifikatnya sendiri).

Catatan:

- Universal SSL Cloudflare mencakup `jurnal.zeninthenoise.com` (subdomain satu tingkat) — tak perlu
  sertifikat tambahan; zona harus di akun Cloudflare yang sama.
- Jangan pakai **wildcard** dan jangan tinggalkan CNAME menggantung (risiko subdomain takeover).

**Status terpasang (2026-09-26, via API):**

- Tunnel `jurnal-zitn` dibuat (remote-managed), id `71dbdc39-94fe-404e-8695-82b1399419f4`,
  status `inactive` (belum ada connector — normal).
- Ingress remote: `jurnal.zeninthenoise.com → http://web:80`, fallback `http_status:404`.
- `TUNNEL_TOKEN` sudah ditulis ke `.env` repo journal (gitignored).
- `JOURNAL_SSO_SECRET` sudah ditulis ke `.env` repo journal (gitignored) — **nilai yang sama** di-set
  sebagai secret Cloudflare Pages `trutova` (production) bersama `JOURNAL_SSO_URL`.
- **Terverifikasi fail-closed (2026-09-26):** `GET https://trutova.pages.dev/api/journal/sso` →
  **503** `{"ok":false,"error":"journal_nonaktif"}` (juga via `zeninthenoise.com`); `/pelajaran/` 200.
  `JOURNAL_ENABLED` sengaja **belum** diisi.
- **Belum:** connector jalan di host (kini 530) → lalu set `JOURNAL_ENABLED=true` + redeploy, dan
  `pnpm test` di lingkungan ber-Postgres.

Setelah aktif:

- Journal: `WEB_BASE_URL=https://jurnal.zeninthenoise.com`, `EMAIL_FROM` (subdomain pengirim +
  SPF/DKIM/DMARC), cookie `Secure`, `CORS_ALLOWED_ORIGINS=https://zeninthenoise.com` bila ada
  panggilan lintas-origin.
- ZITN: `JOURNAL_SSO_URL=https://jurnal.zeninthenoise.com/api/auth`.

Verifikasi: `curl -I https://jurnal.zeninthenoise.com` (200/redirect) + TLS valid, lalu §3–§4.

## 2. Env SSO

**Sisi journal (repo ini):**

| Var                  | Isi                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `JOURNAL_SSO_SECRET` | Rahasia HMAC-SHA256 bersama dengan ZITN. **Unset ⇒ `/api/auth/sso` menjawab 503** (fail-closed). |

**Sisi ZITN (`D:\trutova`, Cloudflare Pages):**

| Var                  | Isi                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `JOURNAL_ENABLED`    | `true` untuk membuka `/api/journal/sso`.                                                                             |
| `JOURNAL_SSO_SECRET` | **Harus identik** dengan sisi journal.                                                                               |
| `JOURNAL_SSO_URL`    | Base API journal, mis. `https://jurnal.example.com/api/auth` → ZITN mengarahkan ke `${JOURNAL_SSO_URL}/sso?token=…`. |

> Rotasi: ganti kedua sisi bersamaan. Token ber-TTL 120 detik, jadi rotasi singkat aman.

## 3. Alur masuk (verifikasi)

1. Pengguna membuka `https://trutova.pages.dev/api/journal/sso` (punya sesi ZITN + langganan bulanan aktif).
2. ZITN memverifikasi sesi + entitlement lalu mengarahkan ke
   `https://jurnal.example.com/api/auth/sso?token=…`.
3. Journal memverifikasi tanda tangan, **mengonsumsi `jti` sekali**, menyetel cookie `session`,
   lalu mengarahkan ke `/`.
4. Token dipakai ulang ⇒ `401 SSO_TOKEN_REPLAYED`.

## 4. Smoke test

- `GET /api/health` → 200.
- SSO di atas → berakhir di dashboard journal (cookie `session` ada).
- `GET /api/users/me/export` → unduhan JSON `jurnal-zitn-export-YYYY-MM-DD.json`.
- `GET/POST/DELETE /api/users/me/deletion` → status/hapus akun (dengan konfirmasi sandi).

## 5. Uji

```bash
pnpm install
pnpm -r check-types
pnpm test        # butuh Postgres (harness vitest menyambung DB)
```

## 6. Catatan keamanan

- Tanpa `JOURNAL_SSO_SECRET`, jalur SSO mati (503) — tidak ada token yang diterima.
- Ekspor meredaksi kolom kredensial/token dan menolak tabel sesi/audit/kunci API.
- Tidak ada notifikasi yang dipicu hasil transaksi (K11-d).

## 7. Menjalankan di host (VPS + Docker)

**Spesifikasi minimum:** Ubuntu 22.04/24.04, 2 vCPU, 4 GB RAM, 40 GB disk. Port masuk yang perlu:
**SSH (22) saja** — Tunnel mendail keluar, jadi **tidak** perlu membuka 80/443.

### 7.1 Pindahkan kode

Perubahan fork ini **belum di-commit**; `git clone` upstream akan kehilangan rebrand/SSO/ekspor.
Pilih salah satu:

- **Commit + push** ke repo privat, lalu `git clone <repo> jurnal-zitn` di host, atau
- **rsync salinan kerja** (kecualikan `node_modules`, `.git`, `dist`):
  ```bash
  rsync -av --exclude node_modules --exclude .git --exclude dist \
    /path/lokal/jurnal-zitn/ user@HOST:/opt/jurnal-zitn/
  ```

### 7.2 Pasang Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # logout/login agar berlaku
docker compose version
```

### 7.3 Siapkan `.env` (jangan di-commit)

Salin `.env.example` → `.env`, lalu isi minimal:

```
POSTGRES_USER=zitn
POSTGRES_PASSWORD=<kuat>
POSTGRES_DB=jurnal
SESSION_SECRET=<kuat>
WEB_BASE_URL=https://jurnal.zeninthenoise.com
EMAIL_FROM=<opsional>            # bila email diaktifkan, tambah SMTP_*
# dari mesin lokal (D:\jurnal-zitn\.env), salin apa adanya:
TUNNEL_TOKEN=<dari .env lokal>
JOURNAL_SSO_SECRET=<dari .env lokal>
```

`DATABASE_URL` **tidak** diisi di `.env` — compose menyusunnya dari `POSTGRES_*`.

### 7.4 Jalankan

```bash
cd /opt/jurnal-zitn
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d
docker compose logs -f api        # tunggu migrasi otomatis (0037/0038) + "Config loaded"
```

### 7.5 Verifikasi

```bash
docker compose ps                                   # postgres/api/web/cloudflared healthy
curl -I http://localhost:8080                       # web merespons (jangan buka 8080 ke publik)
curl -I https://jurnal.zeninthenoise.com            # harus 200/3xx, BUKAN 530
```

Lalu di ZITN: aktifkan SSO —

```bash
echo true | wrangler pages secret put JOURNAL_ENABLED --project-name trutova
python scripts/publish_site.py --no-build
```

Uji: `https://zeninthenoise.com/api/journal/sso` → **302** ke `/api/auth/sso` (bukan 503), lalu
alur masuk end-to-end.

### 7.6 Uji

```bash
docker compose run --rm api pnpm test     # harness butuh Postgres; gunakan DB compose
```

### 7.7 Operasional

- **Backup**: `docker compose exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql`
- **Update**: `git pull` (atau rsync) → `docker compose ... up -d --build`
- **Log**: `docker compose logs -f web api cloudflared`
- **Rahasia**: `.env` gitignored; token Tunnel & SSO jangan pernah masuk git atau chat.

### 7.8 Alternatif tanpa VPS (PaaS)

Railway/Fly/Render bisa menjalankan `docker/Dockerfile.web` + `Dockerfile.api` + Postgres terkelola.
Karena Tunnel menuntut container `cloudflared`, biasanya lebih mudah pakai **domain platform**
lalu arahkan `jurnal.zeninthenoise.com` sebagai CNAME ke host platform (DEPLOY §1b jalur C) —
tanpa overlay Cloudflare. Pilih salah satu; jangan campur Tunnel dan CNAME ke platform.
