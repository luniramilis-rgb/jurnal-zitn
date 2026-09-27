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

**Spesifikasi:** Ubuntu 22.04/24.04, **2 GB RAM, 60 GB disk** — lantai di `ROADMAP.md` B1
(1 core/2 GB/60 GB) — plus **2 vCPU** (1 core jalan; 2 vCPU lebih nyaman) dan **swap 4 GB**
(§7.2b). Port masuk yang perlu: **SSH (22) saja** — Tunnel mendail keluar, jadi **tidak** perlu
membuka 80/443.

2 GB cukup untuk menjalankan stack (postgres + api + web + cloudflared). Yang membuat 2 GB sempit
bukan trafik, melainkan **build atau `pnpm test` di host** — untuk itu siapkan 4 GB RAM (§7.9).

### 7.1 Pindahkan kode

Fork ini sudah ada di repo privat `github.com/luniramilis-rgb/jurnal-zitn`; **jangan** `git clone`
upstream `madmatt112/tradr` (kehilangan rebrand/SSO/ekspor). Pilih salah satu:

- **clone** repo privat di host (butuh deploy key atau token baca), atau
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

### 7.2b Swap 4 GB (wajib di 2 GB)

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### 7.2c Batas log Docker (cegah disk penuh)

Tulis `/etc/docker/daemon.json`:

```json
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
```

lalu `sudo systemctl restart docker`.

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

**Tarik image, jangan build di host** (§7.9). `docker-compose.yml` hanya punya blok `build:`; pakai
override kecil yang menambahkan `image:` GHCR yang di-pin ke commit:

```yaml
# docker-compose.ghcr.yml
services:
  api:
    image: ghcr.io/luniramilis-rgb/jurnal-zitn-api:sha-<commit>
  web:
    image: ghcr.io/luniramilis-rgb/jurnal-zitn-web:sha-<commit>
```

Paket GHCR repo privat default-nya privat, jadi login dulu di host (PAT dengan scope
`read:packages`), atau jadikan paketnya publik di setelan repo:

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u <username> --password-stdin
```

```bash
cd /opt/jurnal-zitn
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.cloudflare.yml"
$COMPOSE pull
$COMPOSE up -d --no-build
$COMPOSE logs -f api        # tunggu migrasi otomatis (0037/0038) + "Config loaded"
```

`--no-build` memakai image hasil `pull` dan tidak pernah membangun di host. Bila memilih membangun
di host, hilangkan `-f docker-compose.ghcr.yml` dan pakai `up -d --build` — tetapi lihat §7.9.

### 7.4b Tuning Postgres untuk 2 GB

Setelah boot pertama (nilai konservatif; validasi dengan `free -h` dan `docker stats`):

```bash
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.cloudflare.yml"
$COMPOSE exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "ALTER SYSTEM SET shared_buffers='256MB';" \
  -c "ALTER SYSTEM SET effective_cache_size='768MB';" \
  -c "ALTER SYSTEM SET work_mem='8MB';" \
  -c "ALTER SYSTEM SET maintenance_work_mem='64MB';" \
  -c "ALTER SYSTEM SET max_connections=50;"
$COMPOSE restart postgres
$COMPOSE exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SHOW shared_buffers;"
```

`ALTER SYSTEM` menulis `postgresql.auto.conf` di dalam volume PGDATA, jadi bertahan lintas restart.

### 7.5 Verifikasi

```bash
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.cloudflare.yml"
$COMPOSE ps                                          # postgres/api/web/cloudflared healthy
curl -I http://localhost:8080                        # web merespons (jangan buka 8080 ke publik)
curl -I https://jurnal.zeninthenoise.com             # harus 200/3xx, BUKAN 530
```

Lalu di ZITN: aktifkan SSO —

```bash
echo true | wrangler pages secret put JOURNAL_ENABLED --project-name trutova
python scripts/publish_site.py --no-build
```

Uji: `https://zeninthenoise.com/api/journal/sso` → **302** ke `/api/auth/sso` (bukan 503), lalu
alur masuk end-to-end.

### 7.6 Uji

Harness butuh Postgres; jalankan lewat service `api`. Ini **berat** di 2 GB (§7.9) — CI sudah
menjalankannya otomatis, jadi pakai ini hanya bila perlu:

```bash
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.cloudflare.yml"
$COMPOSE run --rm api pnpm test
```

### 7.7 Operasional

(`$COMPOSE` seperti didefinisikan di §7.4.)

- **Backup**: `$COMPOSE exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql`
  (jadwalkan via cron; simpan salinannya di luar host)
- **Update**: `git pull` (atau rsync) → `$COMPOSE pull && $COMPOSE up -d --no-build`
- **Log**: `$COMPOSE logs -f web api cloudflared`
- **Rahasia**: `.env` gitignored; token Tunnel & SSO jangan pernah masuk git atau chat. Rotasi
  `JOURNAL_SSO_SECRET` mengikuti §2 (ganti kedua sisi bersamaan).

### 7.8 Alternatif tanpa VPS (PaaS)

Railway/Fly/Render bisa menjalankan `docker/Dockerfile.web` + `Dockerfile.api` + Postgres terkelola.
Karena Tunnel menuntut container `cloudflared`, biasanya lebih mudah pakai **domain platform**
lalu arahkan `jurnal.zeninthenoise.com` sebagai CNAME ke host platform (DEPLOY §1b jalur C) —
tanpa overlay Cloudflare. Pilih salah satu; jangan campur Tunnel dan CNAME ke platform.

### 7.9 Catatan sumber daya (2 GB)

- **Jangan build image di host** — `vite`/`tsc` bisa OOM di 2 GB. Pakai image GHCR yang di-pin
  bareng `--no-build`; build hanya terjadi di CI.
- **`pnpm test` di host juga berat**; biarkan CI yang menjalankannya.
- Kalau tetap mau build atau uji di host, naikkan ke **4 GB RAM** — angka inilah yang dulu tertulis
  di dokumen ini sebelum diselaraskan dengan `ROADMAP.md` B1.
- Penyangga: **swap 4 GB** (§7.2b), **batas log Docker** (§7.2c), **tuning Postgres** (§7.4b).
- `docker-compose.ghcr.yml` (override `image:`) ditambahkan bersama langkah kode; sebelum itu ada,
  ganti manual blok `build:` service `api`/`web` dengan `image:` (lihat komentar di
  `docker-compose.yml`) dan tetap pakai `--no-build`.
