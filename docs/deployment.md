# Deployment Guide (Neon + Cloudflare R2 + Render + Vercel)

## 1. PostgreSQL Database on Neon
1. Create a free project on [Neon](https://neon.tech).
2. Create database `coding_class_manager` (or use the default `neondb`).
3. Copy the **Pooled Connection** parameters (`PGHOST`, `PGPORT=5432`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`).
4. Ensure `DB_SSLMODE=require` is set in Render environment variables.

## 2. Private Object Storage on Cloudflare R2
1. Create a private R2 bucket (e.g., `coding-class-files`) in Cloudflare Dashboard. Do **not** enable public access.
2. Go to **R2 → Manage R2 API Tokens → Create API Token** with **Object Read & Write** permission scoped strictly to your bucket.
3. Note:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - `AWS_BUCKET=coding-class-files`
   - `AWS_DEFAULT_REGION=auto`
   - `AWS_USE_PATH_STYLE_ENDPOINT=true`

## 3. Backend Hosting on Render (Docker Web Service)
1. Push repository to GitHub.
2. In [Render](https://render.com), click **New → Web Service** and connect your GitHub repo.
3. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Health Check Path**: `/api/health`
4. Add Environment Variables:
   ```env
   APP_NAME="Coding Class Manager"
   APP_ENV=production
   APP_DEBUG=false
   APP_KEY=base64:... # generate via: php artisan key:generate --show
   APP_URL=https://your-backend.onrender.com
   APP_TIMEZONE=UTC
   FRONTEND_URL=https://your-frontend.vercel.app
   CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app

   DB_CONNECTION=pgsql
   DB_HOST=ep-xxx-pooler.ap-southeast-1.aws.neon.tech
   DB_PORT=5432
   DB_DATABASE=neondb
   DB_USERNAME=neondb_owner
   DB_PASSWORD=your-neon-password
   DB_SSLMODE=require

   FILESYSTEM_DISK=s3
   AWS_ACCESS_KEY_ID=your-r2-access-key
   AWS_SECRET_ACCESS_KEY=your-r2-secret-key
   AWS_DEFAULT_REGION=auto
   AWS_BUCKET=coding-class-files
   AWS_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
   AWS_USE_PATH_STYLE_ENDPOINT=true

   ADMIN_DEFAULT_NAME="Guru Coding"
   ADMIN_DEFAULT_EMAIL=admin@yourdomain.com
   ADMIN_DEFAULT_PASSWORD=UseAStrongProductionPassword!
   ```
5. The Docker entrypoint runs `php artisan migrate --force` and caches config/routes before starting the server on `$PORT`.
6. Run `php artisan db:seed --class=AdminSeeder --force` and `php artisan db:seed --class=AssignmentCategorySeeder --force` once via Render Shell.

> **Note on Render Free Tier**: Free web services spin down after 15 minutes of inactivity (cold start ~30s) and have an ephemeral local filesystem — that is why all uploads go to **Cloudflare R2** and data goes to **Neon PostgreSQL**.

## 4. Frontend Hosting on Vercel
1. Import the same GitHub repository in [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Add Environment Variables:
   ```env
   NEXT_PUBLIC_APP_NAME="Coding Class Assignment Manager"
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
   BACKEND_API_URL=https://your-backend.onrender.com/api/v1
   ```
4. Deploy. Vercel automatically deploys on pushes to `main`.

> **Cross-Domain Cookies**: Because the Next.js frontend uses BFF route handlers (`/api/auth/*`, `/api/student/*`, `/api/proxy/*`) hosted on the same Vercel domain, `HttpOnly` cookies are first-party and never blocked by third-party cookie restrictions.
