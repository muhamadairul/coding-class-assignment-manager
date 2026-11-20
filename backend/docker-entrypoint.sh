#!/usr/bin/env bash
set -e

php artisan config:clear || true
php artisan migrate --force

# Idempotent essential seeders (safe on every boot via updateOrCreate)
php artisan db:seed --class=AdminSeeder --force
php artisan db:seed --class=AssignmentCategorySeeder --force

if [ "${RUN_DEMO_SEEDER:-false}" = "true" ]; then
  php artisan db:seed --class=AssignmentSeeder --force
  php artisan db:seed --class=StudentSeeder --force
fi

if [ "${APP_ENV:-production}" = "production" ]; then
  php artisan config:cache || true
  php artisan route:cache || true
fi

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
