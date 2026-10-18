#!/bin/sh
set -e

echo "[DevFlow Server] Generating Prisma Client..."
npx prisma generate

echo "[DevFlow Server] Applying database migrations..."
npx prisma migrate deploy || npx prisma migrate dev --name init --skip-generate

echo "[DevFlow Server] Starting application..."
exec "$@"
