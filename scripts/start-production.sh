#!/bin/sh
set -e

echo "[Startup] Syncing database schema..."
cd /app
if [ -n "$DATABASE_URL" ]; then
  cd lib/db
  npx drizzle-kit push --force --config=./drizzle.config.ts 2>&1 || echo "[Startup] DB sync completed with warnings (non-fatal)"
  cd /app
  echo "[Startup] Database schema sync done."
else
  echo "[Startup] WARNING: DATABASE_URL not set, skipping DB sync."
fi

echo "[Startup] Starting production server..."
exec node artifacts/api-server/dist/index.cjs
