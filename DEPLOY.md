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
  Saat itu `JOURNAL_ENABLED` sengaja belum diisi.

**Status tayang (2026-09-28):** host NEO Lite `jurnal-zitn` (West Java, Ubuntu 22.04, 1 vCPU /
2 GB + swap 4 GB / 58 GB); Docker 29.8.1; image GHCR `:sha-…` ditarik (`--no-build`); migrasi
otomatis selesai; `https://jurnal.zeninthenoise.com` **200** (tunnel `cloudflared` aktif);
`JOURNAL_ENABLED=true` di-set + Pages diterbitkan ulang → `GET /api/journal/sso` **302** ke
`/masuk/?next=…` (bukan 503), `GET /api/auth/sso` tanpa token **401**; backup `pg_dump -Fc` harian
02:00 WIB (retensi 14 hari) + **uji restore lulus**; SSH **key-only** (bawaan NEO Lite).
**Uji SSO end-to-end lulus 2026-09-28 (akun pemilik, `ADMIN_EMAILS`):** ZITN `/api/journal/sso`
**302** → jurnal `/api/auth/sso` **302** (`sso_login created=true`) → sesi aktif; `users=1` dengan
`zitn_user_id` terisi; `sso_consumed_tokens=1`. **Belum:** cabang **langganan berbayar**
(`journalEntitled`) sampai ada akun pelanggan; salinan backup off-host; batasi Security Group port 22.

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

Salin `.env.example` → `.env`. Minimal yang dipakai compose:

```
POSTGRES_USER=jurnal-zitn
POSTGRES_PASSWORD=<kuat>         # openssl rand -hex 24
POSTGRES_DB=jurnal-zitn
SESSION_SECRET=<kuat>            # openssl rand -hex 32
ENCRYPTION_KEY=<kuat>            # openssl rand -hex 32
NODE_ENV=production
DISABLE_REGISTRATION=true        # masuk lewat SSO ZITN, bukan pendaftaran mandiri
# dari mesin lokal (D:\jurnal-zitn\.env), salin apa adanya:
TUNNEL_TOKEN=<dari .env lokal>
JOURNAL_SSO_SECRET=<dari .env lokal>
# jembatan konteks (ZITN-TECH-019) — opsional, fail-closed bila kosong:
ZITN_BASE_URL=https://zeninthenoise.com
```

`DATABASE_URL` **tidak** diisi di `.env` — compose menyusunnya dari `POSTGRES_*`.

> **Email bersifat all-or-nothing.** Jangan set `WEB_BASE_URL` sendirian: bila diisi tanpa
> `SMTP_HOST` **dan** `EMAIL_FROM`, api **gagal boot** ("Partial email config: WEB*BASE_URL set, but
> required email var(s) missing…"). Untuk menyalakan email isi **ketiganya** (+ `SMTP*\*`); untuk
> mematikannya kosongkan semuanya (postur saat ini — reset kata sandi memakai CLI operator).

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

Paket GHCR repo privat **tetap privat** (keputusan produk: image memuat aplikasi ter-build).
Host login dengan **classic PAT** scope **`read:packages`** saja — fine-grained token sering tidak
mengekspos permission `Packages` untuk GHCR, jadi pakai classic; dan jangan pakai token sesi `gh`
pribadi:

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u luniramilis-rgb --password-stdin
```

Kredensial tersimpan di `~/.docker/config.json` host (hanya-baca paket). Rotasi: §8.3.

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

Ringkasan cepat (`$COMPOSE` seperti di §7.4); detail di **§8**.

- **Update**: `git pull` (atau rsync) → pin tag baru di `docker-compose.ghcr.yml` → `$COMPOSE pull && $COMPOSE up -d --no-build` (§7.10).
- **Log**: `$COMPOSE logs -f web api cloudflared`.
- **Backup & restore, monitoring, rotasi rahasia, insiden**: §8.

### 7.8 Alternatif tanpa VPS (PaaS)

Railway/Fly/Render bisa menjalankan `docker/Dockerfile.web` + `Dockerfile.api` + Postgres terkelola.
Karena Tunnel menuntut container `cloudflared`, biasanya lebih mudah pakai **domain platform**
lalu arahkan `jurnal.zeninthenoise.com` sebagai CNAME ke host platform (DEPLOY §1b jalur C) —
tanpa overlay Cloudflare. Pilih salah satu; jangan campur Tunnel dan CNAME ke platform.

### 7.9 Kapasitas & kapan naik (checklist)

Ambang di bawah **heuristik**, bukan hasil load-test; validasi dengan baseline minggu pertama.
Pantau rutin, dan **wajib** pada dua puncak: impor statement nyata pertama, dan menjelang tutup bulan.

| Sinyal         | Cara lihat                                          | Ambang naik (tindakan)                                 |
| -------------- | --------------------------------------------------- | ------------------------------------------------------ |
| CPU            | `uptime` (load average), `docker stats --no-stream` | load avg **> 1** (1 core) persisten → **+vCPU (ke 2)** |
| RAM            | `free -h`, `docker stats --no-stream`               | tersedia **< ~300 MB** persisten → **+RAM (ke 4 GB)**  |
| Swap           | `vmstat 1` (kolom `si`/`so`)                        | `si/so` **aktif rutin** (bukan sesaat) → +RAM          |
| OOM            | `dmesg \| grep -i oom`                              | ada **OOM-kill** / container restart → +RAM            |
| Disk           | `df -h`                                             | terpakai **> 80%** → tambah disk/prune                 |
| Koneksi DB     | `psql -c "SELECT count(*) FROM pg_stat_activity;"`  | mendekati `max_connections=50` / pool menunggu → tune  |
| Latensi origin | Cloudflare analytics                                | p95 naik / request origin melambat → +vCPU             |

Urutan tindakan: **tambah vCPU dulu** (ke 2), lalu **RAM** (ke 4 GB). Skala vertikal cukup jauh di
atas 50 user; belum perlu arsitektur horizontal.

Ekspektasi beban: per-user ringan (CRUD jurnal; data per-user orde MB). Puncak CPU hanya saat
**impor statement** — dibatasi `CSV_IMPORT_MAX_FILE_BYTES` 10 MB / `CSV_IMPORT_MAX_ROWS` 10.000 —
dan impor berjalan **di proses `api` yang sama** (tak ada worker/queue terpisah), jadi dua impor
berbarengan mengunci satu core: itulah kenapa vCPU adalah penambah pertama.

Syarat tetap yang menahan lonjakan: **swap 4 GB** (§7.2b), **batas log Docker** (§7.2c), **tuning
Postgres** (§7.4b). Dan **jangan build atau `pnpm test` di host** — build hanya di CI (itulah
alasan "$7" pernah menyaratkan 4 GB; dengan `--no-build` angka itu tidak perlu).

Override image **`docker-compose.ghcr.yml`** sudah ada di repo; pin tag di dua baris `image:`-nya,
lalu tetap pakai `--no-build`. **Rilis** (tag `v*`) membangun `:vX.Y.Z`/`:latest` (multi-arch) lewat
`release.yml`; **`:edge`/`:sha-<commit>`** (amd64) kini dibangun **manual** (Actions → _Images (edge)_
→ Run workflow) karena tiap push dulu memakan kuota Actions repo privat. Bila paket GHCR privat
(default repo privat), host perlu `docker login ghcr.io` (§7.4).

### 7.10 Update & rollback image

```bash
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.cloudflare.yml"
# pin tag baru di docker-compose.ghcr.yml (rilis :vX.Y.Z, atau :sha-<commit> dari
# run manual Images (edge)), lalu:
$COMPOSE pull && $COMPOSE up -d --no-build
# rollback: kembalikan tag lama, ulangi perintah di atas
```

Migrasi berjalan otomatis saat `api` boot; perhatikan log `Config loaded`.
Rilis (`v*`) membangun image multi-arch + GitHub Release; `:edge`/`:sha-<commit>` hanya dari run
manual **Images (edge)** (hemat kuota — lihat catatan di header workflow itu).

## 8. Operasional (A11)

Referensi keputusan pemilik yang menunggu: jam backup, retensi, dan region hosting (residensi data)
— `ROADMAP.md` "Keputusan yang perlu pemilik".

### 8.1 Monitoring

- **Rutin (harian/mingguan):** `free -h`, `df -h`, `uptime`, `docker stats --no-stream`, `vmstat 1`.
- **Otomatis (terpasang 2026-09-28):** cron **per jam** `/home/ubuntu/jurnal-monitor.sh` →
  `/home/ubuntu/jurnal-monitor.log` (disk/mem/swap/load/health, plus `ALERT:` bila melewati ambang);
  **backup harian** 19:00 UTC (= 02:00 WIB) `/home/ubuntu/jurnal-backup.sh` → `/home/ubuntu/jurnal-backups`.
- **Health:** `curl -fsS http://localhost:8080/api/health` (via web; §4) dan `$COMPOSE ps` untuk
  status container.
- **Ambang & tindakan:** tabel §7.9 (load avg, RAM tersedia, swap si/so, OOM, disk, koneksi DB).
- **Puncak yang wajib diukur:** impor statement nyata pertama; menjelang tutup bulan.
- Simpan baseline minggu pertama sebagai pembanding.

### 8.2 Backup

- **Manual:** `$COMPOSE exec -T postgres pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > jurnal-$(date +%F).dump`
  (`-Fc` = custom format, dipakai `pg_restore`).
- **Terjadwal:** cron harian pada jam yang dipilih pemilik; retensi sesuai keputusan (mis. 14
  harian + 1 bulanan).
- **Off-host:** salin hasil dump keluar host (object storage/SCP). Backup di host yang sama **bukan**
  backup — bila host hilang, ikut hilang.
  **Terpasang 2026-09-28:** `rclone` (v1.75.1) + `/home/ubuntu/jurnal-offsite.sh`, dipanggil di akhir
  `jurnal-backup.sh` (**gagal-lunak**: keluar 0 dengan pesan bila remote belum dikonfigurasi).
  Retensi off-site 30 hari (`rclone delete --min-age 30d`). **Menunggu kredensial**: isi
  `~/.config/rclone/rclone.conf` dari `~/rclone.conf.example` (endpoint + access/secret key bucket
  NEO Object Storage, NSS single region, 10 GB tahunan). Setelah terisi: `rclone lsd
jurnal-offsite:jurnal-zitn-backup` harus hijau, lalu **uji unggah + unduh ulang** sekali.
- **Uji restore** (bagian dari DoD Fase B):
  ```bash
  $COMPOSE exec -T postgres createdb -U "$POSTGRES_USER" jurnal_restore_test
  $COMPOSE exec -T postgres pg_restore -U "$POSTGRES_USER" -d jurnal_restore_test < jurnal-YYYY-MM-DD.dump
  $COMPOSE exec postgres psql -U "$POSTGRES_USER" -d jurnal_restore_test -c "SELECT count(*) FROM users;"
  $COMPOSE exec postgres dropdb -U "$POSTGRES_USER" jurnal_restore_test
  ```
- **Sensitif:** dump memuat data pengguna; perlakukan sebagai rahasia (jangan ke git/chat).

### 8.3 Rotasi rahasia

| Rahasia              | Cara rotasi                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `JOURNAL_SSO_SECRET` | Ganti **kedua sisi bersamaan** (`.env` journal + Pages secret `trutova`); token TTL 120s → aman (§2)                                                                                                               |
| `TUNNEL_TOKEN`       | Zero Trust → rotate token → perbarui `.env` → `$COMPOSE up -d cloudflared`                                                                                                                                         |
| `SESSION_SECRET`     | Ganti di `.env` → `$COMPOSE up -d api`; semua sesi journal invalid (user masuk lagi via SSO) — lakukan di luar jam ramai                                                                                           |
| `POSTGRES_PASSWORD`  | Perbarui `.env` **dan** `ALTER USER` di DB → `$COMPOSE up -d`                                                                                                                                                      |
| `GHCR pull token`    | **Classic PAT** scope **`read:packages`** saja. Rotasi: token baru → `docker login ghcr.io -u luniramilis-rgb --password-stdin` di host → cabut token lama. Hanya-baca paket; jangan pakai token sesi `gh` pribadi |
| SSH                  | Key-only, nonaktifkan auth kata sandi, firewall hanya port 22                                                                                                                                                      |

Aturan tetap: token Tunnel & SSO **jangan pernah** masuk git atau chat.

### 8.4 Insiden dasar

- Restart satu layanan: `$COMPOSE restart <api|web|postgres|cloudflared>`.
- Setelah mengubah `.env`: `$COMPOSE up -d --no-build`.
- Log: `$COMPOSE logs --since 1h web api cloudflared`.
- **Jangan** buka port 8080 ke publik — satu-satunya jalan masuk adalah Tunnel (§7).
