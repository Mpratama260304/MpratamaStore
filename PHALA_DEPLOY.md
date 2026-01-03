# 🚀 MpratamaStore - PhalaCloud Deployment Guide (SQLite Edition)

Deploy MpratamaStore ke PhalaCloud dengan mudah. **TANPA DATABASE EXTERNAL!**

**Docker Hub Image:** `mpratamamail/mpratamastore:latest`

---

## 📋 Daftar Isi

1. [Keunggulan SQLite](#-keunggulan-sqlite)
2. [Prerequisites](#-prerequisites)
3. [Environment Variables](#-environment-variables)
4. [Cara Deploy](#-cara-deploy)
5. [Setup Payment Gateway](#-setup-payment-gateway)
6. [Health Check](#-health-check)
7. [Troubleshooting](#-troubleshooting)
8. [Update Image](#-update-image)

---

## ✨ Keunggulan SQLite

- ✅ **100% Internal** - Tidak butuh koneksi ke database external
- ✅ **Simple Deploy** - Cukup 1 container, langsung jalan
- ✅ **Persistent Data** - Data tersimpan di volume, tidak hilang saat restart
- ✅ **Auto Migration** - Schema otomatis teraplikasi saat startup
- ✅ **Auto Seed** - Data default (settings, admin user) otomatis dibuat
- ✅ **No Network Issues** - Tidak ada masalah koneksi DB yang sering gagal

---

## 📦 Prerequisites

- Akun PhalaCloud aktif
- (Opsional) Akun Stripe untuk payment gateway
- (Opsional) Akun PayPal Business untuk payment gateway

**Tidak perlu:**
- ❌ Database PostgreSQL external
- ❌ Supabase/Neon/Railway
- ❌ Koneksi DB yang ribet

---

## 🔑 Environment Variables

### WAJIB

| Variable | Deskripsi | Cara Generate |
|----------|-----------|---------------|
| `AUTH_SECRET` | Secret untuk auth (min 32 char) | `openssl rand -base64 32` |
| `JWT_SECRET` | Secret untuk JWT token | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | URL publik aplikasi | `https://your-app.phala.network` |

### OTOMATIS (Sudah Ada Default)

| Variable | Deskripsi | Default |
|----------|-----------|---------|
| `DATABASE_URL` | Path SQLite database | `file:/data/app.db` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Port aplikasi | `3000` |
| `HOSTNAME` | Hostname binding | `0.0.0.0` |

### ADMIN USER (Untuk Setup Pertama Kali)

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `ADMIN_EMAIL` | Email admin | `admin@example.com` |
| `ADMIN_USERNAME` | Username admin | `admin` |
| `ADMIN_PASSWORD` | Password admin | `SecurePassword123!` |

> ⚠️ **Penting:** Set ADMIN_EMAIL/USERNAME/PASSWORD untuk membuat admin user pertama kali. Setelah admin dibuat, bisa dikosongkan.

### PAYMENT (Opsional)

| Variable | Deskripsi |
|----------|-----------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `PAYPAL_CLIENT_ID` | PayPal client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal client secret |
| `PAYPAL_ENV` | `sandbox` atau `live` |

---

## 🚀 Cara Deploy

### Step 1: Buka PhalaCloud Dashboard

1. Login ke PhalaCloud
2. Create New Deployment
3. Pilih "Docker Compose"

### Step 2: Copy Compose File

Copy isi file `docker-compose.phala.yml` ke compose editor:

```yaml
version: "3.9"

services:
  web:
    image: mpratamamail/mpratamastore:latest
    container_name: mpratamastore-web
    restart: unless-stopped
    
    ports:
      - "80:3000"
    
    volumes:
      - mpratamastore_data:/data
    
    environment:
      NODE_ENV: "production"
      PORT: "3000"
      HOSTNAME: "0.0.0.0"
      DATABASE_URL: "file:/data/app.db"
      
      # GANTI DENGAN DOMAIN ANDA
      NEXT_PUBLIC_APP_URL: "https://YOUR-DOMAIN"
      NEXT_PUBLIC_SITE_URL: "https://YOUR-DOMAIN"
      NEXT_PUBLIC_BASE_URL: "https://YOUR-DOMAIN"
      
      # GENERATE SECRETS BARU
      AUTH_SECRET: "GANTI_DENGAN_openssl_rand_-base64_32"
      JWT_SECRET: "GANTI_DENGAN_openssl_rand_-base64_32"
      
      # ADMIN USER (untuk setup pertama)
      ADMIN_EMAIL: "admin@example.com"
      ADMIN_USERNAME: "admin"
      ADMIN_PASSWORD: "SecurePassword123!"
      
      # PAYMENT (opsional)
      STRIPE_SECRET_KEY: ""
      STRIPE_PUBLISHABLE_KEY: ""
      STRIPE_WEBHOOK_SECRET: ""
    
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      start_period: 60s
      retries: 5

volumes:
  mpratamastore_data:
    driver: local
```

### Step 3: Ganti Placeholders

1. Ganti `YOUR-DOMAIN` dengan domain PhalaCloud Anda
2. Generate `AUTH_SECRET` dan `JWT_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
3. Set `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` untuk admin pertama

### Step 4: Deploy

1. Klik Deploy
2. Tunggu container start (sekitar 60 detik untuk startup + migration)
3. Check logs untuk memastikan sukses

### Step 5: Verifikasi

1. Buka `https://YOUR-DOMAIN/api/health`
2. Pastikan response menunjukkan `db.connected: true`
3. Buka `https://YOUR-DOMAIN/admin` untuk login admin

---

## 🏥 Health Check

Endpoint `/api/health` selalu return 200 OK. Status database ada di response body:

```bash
curl https://YOUR-DOMAIN/api/health
```

Response sukses:
```json
{
  "ok": true,
  "app": "up",
  "timestamp": "2025-01-03T12:00:00.000Z",
  "version": "1.0.0",
  "db": {
    "enabled": true,
    "connected": true,
    "provider": "sqlite",
    "latencyMs": 5,
    "config": {
      "skipFlag": false,
      "urlConfigured": true
    }
  }
}
```

Jika database belum ready:
```json
{
  "ok": true,
  "app": "up",
  "db": {
    "enabled": true,
    "connected": false,
    "provider": "sqlite",
    "error": "Database file not ready"
  }
}
```

---

## 💳 Setup Payment Gateway

### Stripe

1. Buat akun di [Stripe Dashboard](https://dashboard.stripe.com)
2. Dapatkan API keys dari Dashboard → Developers → API keys
3. Set environment variables:
   - `STRIPE_SECRET_KEY`: Secret key (sk_live_xxx atau sk_test_xxx)
   - `STRIPE_PUBLISHABLE_KEY`: Publishable key (pk_live_xxx atau pk_test_xxx)
4. Setup Webhook:
   - Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://YOUR-DOMAIN/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`
   - Copy webhook secret ke `STRIPE_WEBHOOK_SECRET`

### PayPal

1. Buat akun di [PayPal Developer](https://developer.paypal.com)
2. Create App → REST API App
3. Set environment variables:
   - `PAYPAL_CLIENT_ID`: Client ID
   - `PAYPAL_CLIENT_SECRET`: Secret
   - `PAYPAL_ENV`: `sandbox` untuk testing, `live` untuk production

---

## 🔧 Troubleshooting

### Container terus restart

1. Check logs di PhalaCloud dashboard
2. Pastikan semua environment variables WAJIB sudah diisi
3. Tunggu 60 detik untuk startup (start_period di healthcheck)

### Database error di logs

SQLite database dibuat otomatis. Jika ada error:
1. Check volume mount `mpratamastore_data:/data` ada
2. Pastikan container punya permission write ke `/data`

### Admin tidak bisa login

1. Pastikan `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` diset saat pertama deploy
2. Check logs untuk melihat apakah admin user berhasil dibuat

### Products tidak muncul

1. Seed data otomatis dijalankan saat startup
2. Check logs untuk "[Seed] completed successfully"
3. Jika tidak ada, bisa manually run seed atau create products via admin panel

---

## 🔄 Update Image

Untuk update ke versi terbaru:

1. **PhalaCloud Dashboard** → Select deployment
2. **Redeploy** atau **Pull Latest Image**
3. Container akan restart dengan:
   - Pull image baru
   - Run migrations (jika ada schema change)
   - Run seed (idempotent, tidak duplicate)
   - Start app

**Data Anda Aman!** 
Volume `mpratamastore_data` persist across restarts dan updates.

---

## 📁 Data Persistence

Data disimpan di volume `/data`:
- `/data/app.db` - SQLite database
- Semua data (users, products, orders, settings) ada di sini

**Backup:**
Untuk backup database, download file `/data/app.db` dari container.

---

## 🎯 Quick Deploy Checklist

- [ ] Copy `docker-compose.phala.yml` ke PhalaCloud
- [ ] Ganti `YOUR-DOMAIN` dengan domain PhalaCloud
- [ ] Generate `AUTH_SECRET` dengan `openssl rand -base64 32`
- [ ] Generate `JWT_SECRET` dengan `openssl rand -base64 32`
- [ ] Set `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- [ ] Deploy
- [ ] Tunggu 60 detik
- [ ] Test `/api/health`
- [ ] Login admin di `/admin`
- [ ] 🎉 Done!

---

*Last updated: January 2025*
