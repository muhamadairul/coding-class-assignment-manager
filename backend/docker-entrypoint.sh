#!/usr/bin/env bash
set -e

php artisan config:clear || true
php artisan migrate --force || true

if [ "${APP_ENV:-production}" = "production" ]; then
  php artisan config:cache || true
  php artisan route:cache || true
fi

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
