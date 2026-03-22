#!/bin/sh
set -e

echo "[Startup] Production mode — skipping auto schema sync (use manual db:push when needed)"
echo "[Startup] Starting production server..."
exec node artifacts/api-server/dist/index.cjs
