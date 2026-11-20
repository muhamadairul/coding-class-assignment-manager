# System Architecture — Coding Class Assignment Manager

## 1. Architectural Style: Modular Monolith

The backend is implemented as a single Laravel 12 application structured into **6 domain modules** under `backend/app/Modules/` plus shared primitives under `backend/app/Shared/`. Each module encapsulates its own Controllers, Requests, Services, Resources, and Routes. Cross-module communication happens strictly through Service classes and Shared Contracts (Dependency Injection), never by reaching into another module's controller or internal implementation.

```text
coding-class-assignment-manager/
├── backend/
│   ├── app/
│   │   ├── Modules/
│   │   │   ├── Auth/          # Admin Sanctum auth, login/logout/me, rate limiting
│   │   │   ├── Students/      # Student master data, NIS identification, token issuance & recovery
│   │   │   ├── Assignments/   # Assignment CRUD, categories, class targeting, student completion status
│   │   │   ├── Submissions/   # Submission workflow, revisions, review/request-revision, history
│   │   │   ├── Files/         # Storage abstraction (Cloudflare R2 / S3 / local), validation, downloads
│   │   │   └── Dashboard/     # Aggregated statistics, 14-day trends, class comparisons, recent activity
│   │   ├── Shared/
│   │   │   ├── Contracts/     # FileStorageInterface
│   │   │   ├── Middleware/    # VerifyStudentToken (anti-IDOR)
│   │   │   └── Support/       # ApiResponse standard helper
│   │   └── Models/            # Shared Eloquent models
│   ├── Dockerfile             # Render-ready PHP 8.3 container respecting $PORT
│   └── ...
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── api/           # Next.js BFF Route Handlers (HttpOnly cookies + API proxy)
│       │   ├── admin/         # Admin Panel (Dashboard, Assignments, Students, Submissions)
│       │   └── (student pages)# Landing, Tasks, Task Detail, Submit, History
│       ├── components/        # Reusable UI primitives, layout shells, domain forms
│       ├── lib/               # BFF-aware Axios clients, Zod validators, Asia/Jakarta date formatters
│       └── types/
├── docs/
│   ├── architecture.md
│   ├── database-erd.md
│   ├── api-documentation.md
│   └── deployment.md
└── docker-compose.yml         # Local development stack (PostgreSQL 16 + Laravel + Next.js)
```

## 2. Module Responsibilities & Dependencies

| Module | Responsibilities | Dependencies |
| :--- | :--- | :--- |
| **Auth** | Admin login/logout/me via Laravel Sanctum Bearer tokens, login rate limiting | `Shared/Support/ApiResponse` |
| **Students** | Auto-registration by unique NIS, mismatch protection, opaque SHA-256 hashed access tokens, admin correction & device recovery token issuance/revocation | `Shared/Support/ApiResponse` |
| **Files** | File validation (extension, MIME, double-extension, 10 MB limit), UUID storage on Cloudflare R2 (`s3`) or local private disk, presigned URLs / authorized streaming, rollback cleanup | `Shared/Contracts/FileStorageInterface` |
| **Assignments** | Assignment CRUD, Assignment Categories, safe soft-delete preserving submission history, class targeting (`10`, `11`, `all`), student completion breakdown | `Files` (via `FileStorageInterface`) |
| **Submissions** | Initial submission & revision workflow inside DB transactions, dynamic timeliness calculation (`submitted_at > deadline`), revision history logging, admin review & revision requests | `Students`, `Files` (via `FileStorageInterface`) |
| **Dashboard** | Database-backed overview metrics, 14-day trend, Class 10 vs 11 completion stats, per-assignment completion rates, filtered recent submissions | Read-only queries across `Assignments`, `Students`, `Submissions` |

## 3. Cross-Domain Auth & BFF Security (Vercel ↔ Render)

Because the Next.js frontend (Vercel) and Laravel backend (Render) run on different domains:
- **Admin Authentication**: Next.js BFF (`/api/auth/login`) exchanges credentials with Laravel `/api/v1/admin/login`, receives the Sanctum Bearer token, and stores it in an **`HttpOnly`, `SameSite=Lax`, `Secure` (in production)** cookie (`ccam_admin_token`). Browser JavaScript never reads the raw admin token.
- **Student Portal Access**: Next.js BFF (`/api/student/identify`, `/api/student/recover`, and `/api/proxy/public/submissions`) stores the opaque student access token in an **`HttpOnly` cookie** (`ccam_student_token`). Protected requests (`/api/v1/public/me`, `/api/v1/public/me/assignments`, `/api/v1/public/me/submissions`, revisions, and file downloads) pass through `/api/proxy/[...path]`, which attaches `X-Student-Token` server-side.
- **Timezone Policy**: All timestamps are persisted in **UTC** in PostgreSQL and formatted in **`Asia/Jakarta` (WIB)** in the frontend UI.
