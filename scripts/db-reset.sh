#!/usr/bin/env bash
# Tears down and recreates local backing-service state (ADR-00008): drops
# the Postgres container/volume, brings it back up clean, then re-applies
# every migration. Destroys all local data on purpose — that's the point.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

echo "Stopping and removing backing services (including data volumes)..."
docker compose down -v

echo "Starting Postgres..."
docker compose up -d postgres

echo "Waiting for Postgres to be healthy..."
until docker compose exec -T postgres pg_isready -U starter >/dev/null 2>&1; do
  sleep 1
done

echo "Applying migrations..."
pnpm exec nx run db:db-migrate

echo "Done — local database reset."
