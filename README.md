# SirkulaFood — Platform Pencatatan, Analitik, AI Insights & Pengelolaan Limbah Makanan Sirkular

**SirkulaFood** adalah aplikasi web untuk kantin kampus, sekolah, dan usaha katering yang membantu mencatat sisa makanan harian, menganalisis efisiensi porsi secara deterministik, mendapatkan rekomendasi pencegahan berbasis AI (**Google Gemini `gemini-3.8-flash` melalui Google AI Studio**), serta menyalurkan sisa makanan ke jalur pengolahan sirkular yang aman (**donasi aman, recycle dapur, pakan ternak, maggot BSF, pupuk kompos, POC/eco-enzyme, atau buang sesuai prosedur**).

---

## 4 Pilar Utama Produk

1. **Food Waste Tracker (`/app/catat`):** Wizard pencatatan 4 langkah (`Menu & porsi` → `Sisa & penyebab` → `Penanganan` → `Selesai`), CRUD daftar menu beserta karakteristik profil limbah (`karbohidrat`, `sayuran_serat`, `protein_hewani`, `buah_kulit`, `berkuah_berminyak`, `campuran`), dan riwayat hari ini dengan fitur edit sesuai peran.
2. **Waste Analytics Dashboard (`/app` & `/app/analitik`):** Perhitungan deterministik total sisa (`kg`), rasio **kg sisa per 100 porsi disajikan** (dengan proteksi pembagi nol yang menampilkan `"Tidak tersedia"` saat porsi disajikan = `0`), estimasi porsi tidak terjual, proporsi pemanfaatan sirkular tanpa *double-counting*, evaluasi sebelum vs sesudah tindakan, dan ekspor laporan `.csv`.
3. **AI Waste Insights & Contextual Chat (`/app/ai-insights`):** Integrasi model **Google Gemini (`gemini-3.8-flash`) melalui Google AI Studio** di sisi backend (`server/`) dengan validasi skema JSON Zod, pembatasan topik kantin, larangan menilai kelayakan makan manusia, dan hanya menampilkan hasil yang benar-benar dikembalikan Gemini. Jika AI gagal, UI menampilkan pesan error tanpa mengganti hasilnya dengan teks buatan aturan.
4. **Circular Waste Management (`/app/limbah`):** Pemisahan tegas antara tab **Layak konsumsi (belum disajikan)** dan **Tidak layak konsumsi**, penguncian otomatis **Sisa piring** (`sisa_piring`) dari jalur konsumsi manusia (`donasi_aman` & `recycle_dapur`) di UI, API, dan trigger PostgreSQL, serta pencatatan berat limbah yang dialihkan.

---

## Arsitektur & Teknologi

- **Frontend (`app/`):** React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + `shadcn/ui` (`new-york`) + TanStack Query + React Hook Form + Zod + `@fontsource/poppins`.
- **Backend API (`server/`):** Express.js + TypeScript + `@supabase/supabase-js` + Zod + Google AI Studio Gemini API (`gemini-3.8-flash`).
- **Database & Keamanan (`supabase/`):** Supabase Auth, PostgreSQL, Row Level Security (RLS) berbasis organisasi (`private.current_org_id()`) dan peran (`private.current_app_role()`), serta database triggers untuk keamanan pangan (`trg_enforce_waste_log_integrity` & `trg_enforce_waste_action_integrity`).

---

## Cara Menjalankan Secara Lokal

### 1. Menjalankan Frontend (`app/`)
Aplikasi mendukung **Mode Simulasi Demo Instan** (tanpa perlu konfigurasi `.env` terlebih dahulu) maupun **Mode Terhubung Supabase Cloud + Express Server**.

```bash
cd app
npm install
npm run dev
```
Buka `http://localhost:5173`.

### 2. Menjalankan Backend Express (`server/`)
```bash
cd server
npm install
cp .env.example .env
# Isi SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, dan GEMINI_API_KEY di server/.env
npm run dev
```
Server berjalan di `http://localhost:5050` (cek kesehatan di `GET http://localhost:5050/api/health`).

---

## Akun Demo (Data Simulasi Berlabel Eksplisit)

Seluruh data contoh diberi badge **`Data simulasi`** (`is_demo = true`) agar tidak diklaim sebagai riset lapangan nyata.

| Peran | Nama | Email | Kata Sandi | Kode Kantin |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Andi Pratama | `andi@kampus.ac.id` | `SirkulaFood123!` | `KANTIN01` |
| **Staf** | Sari Wulandari | `sari@kampus.ac.id` | `SirkulaFood123!` | `KANTIN01` |

Di halaman `/auth`, tombol **"Demo Admin (Andi)"** dan **"Demo Staf (Sari)"** memakai login Supabase sungguhan saat Supabase dikonfigurasi (perlu menjalankan seed demo). Tanpa konfigurasi Supabase, tombol tersebut memakai simulasi lokal; fitur AI backend memerlukan sesi Supabase sungguhan.

---

## Perintah Pengujian & Verifikasi Kualitas

```bash
# Di folder app/
cd app
npm run lint        # oxlint
npm run typecheck   # tsc -b --noEmit
npm run test        # vitest run (6 test files, 17 unit tests)
npm run build       # tsc -b && vite build

# Di folder server/
cd ../server
npm run typecheck   # tsc -p tsconfig.json --noEmit
npm run test        # vitest run (5 test files, 14 unit tests)
npm run build       # tsc -p tsconfig.json
```

Panduan selengkapnya tersedia di:
- [`docs/deploy.md`](file:///c:/lomba-uinic/docs/deploy.md) — Panduan konfigurasi Supabase, migrasi SQL, RLS test, dan deployment.
- [`docs/demo-script.md`](file:///c:/lomba-uinic/docs/demo-script.md) — Skenario presentasi & demo 3–5 menit untuk juri.
- [`docs/decisions.md`](file:///c:/lomba-uinic/docs/decisions.md) — Catatan keputusan teknis & arsitektur.
