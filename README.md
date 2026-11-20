# Coding Class Assignment Manager

Sistem manajemen dan pencatatan tugas ekstrakurikuler coding untuk siswa **Kelas 10 dan 11**, dibangun dengan arsitektur **Modular Monolith** (Laravel 12 + PostgreSQL + Cloudflare R2) dan **Next.js App Router** (TypeScript + Tailwind CSS + TanStack Query + BFF HttpOnly Cookie Auth).

---

## Technology Stack

### Backend (`backend/`)
- **Laravel 12** (PHP 8.3+, Modular Monolith: `Auth`, `Students`, `Assignments`, `Submissions`, `Files`, `Dashboard`)
- **PostgreSQL** (Neon untuk production, PostgreSQL 16/17 untuk lokal)
- **Laravel Sanctum** (Bearer token admin + expiration)
- **Cloudflare R2** (`league/flysystem-aws-s3-v3`, private S3-compatible bucket)
- **Standard API Response** (`{ success, message, data, meta }`) + `/api/health`
- **PHPUnit** automated feature testing

### Frontend (`frontend/`)
- **Next.js App Router** + **TypeScript** + **Tailwind CSS**
- **Next.js BFF Route Handlers** (`/api/auth/*`, `/api/student/*`, `/api/proxy/*`) dengan **`HttpOnly`, `SameSite=Lax`, `Secure`** cookies (token tidak pernah diekspos ke `localStorage` / JavaScript browser)
- **TanStack Query** + **Axios** + **React Hook Form** + **Zod** + **Lucide React** + **Recharts** + **Sonner**
- **Vitest** + **Testing Library**

### Infrastructure
- **Docker** (`backend/Dockerfile` & `docker-compose.yml`)
- **Render** (Backend Docker Web Service)
- **Neon** (PostgreSQL)
- **Cloudflare R2** (Private Object Storage)
- **Vercel** (Frontend Hosting)

---

## Dokumentasi Lengkap
- [docs/architecture.md](docs/architecture.md) — Arsitektur Modular Monolith, boundary modul, & BFF auth
- [docs/database-erd.md](docs/database-erd.md) — ERD Mermaid & skema PostgreSQL
- [docs/api-documentation.md](docs/api-documentation.md) — Daftar lengkap endpoint `/api/v1` & standar response
- [docs/deployment.md](docs/deployment.md) — Panduan deployment Neon + Cloudflare R2 + Render + Vercel

---

## Menjalankan Secara Lokal

### Opsi A: Langsung (PostgreSQL Lokal + PHP 8.3 + Node 22)

1. **Backend**:
   ```bash
   cd backend
   composer install
   cp .env.example .env   # sesuaikan DB_CONNECTION=pgsql & kredensial PostgreSQL lokal
   php artisan key:generate
   php artisan migrate --seed
   php artisan serve      # http://localhost:8000
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   cp .env.example .env.local
   npm run dev            # http://localhost:3000
   ```

### Opsi B: Docker Compose
```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Health Check: `http://localhost:8000/api/health`
- PostgreSQL: `localhost:5432`

---

## Akun Admin Development
- **URL**: `http://localhost:3000/admin/login`
- **Email**: `admin@codingclass.local` (`ADMIN_DEFAULT_EMAIL`)
- **Password**: `AdminCoding123!` (`ADMIN_DEFAULT_PASSWORD`)

---

## Pengujian

### Backend (PHPUnit pada PostgreSQL)
```bash
cd backend
php artisan test
```

### Frontend (Vitest & Production Build)
```bash
cd frontend
npm test
npm run build
```
