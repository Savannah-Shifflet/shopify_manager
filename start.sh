#!/usr/bin/env bash
# start.sh — Start all SourceDesk dev services (Remix + BullMQ worker)
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Pre-flight checks ──────────────────────────────────────────────────────────
if [ ! -f "$ROOT/.env" ]; then
  echo "Error: .env not found. Run ./setup.sh first."
  exit 1
fi

if [ ! -f "$ROOT/node_modules/.bin/remix" ]; then
  echo "Error: node_modules not found. Run ./setup.sh first."
  exit 1
fi

if [ ! -f "$ROOT/dev.db" ]; then
  echo "Error: dev.db not found. Run ./setup.sh first."
  exit 1
fi

# Check that required env vars are set
source "$ROOT/.env" 2>/dev/null || true
if [ -z "$SHOPIFY_CLIENT_ID" ] || [ -z "$SHOPIFY_CLIENT_SECRET" ] || [ -z "$SHOPIFY_STORE_DOMAIN" ]; then
  echo ""
  echo "⚠  Missing required Shopify credentials in .env:"
  [ -z "$SHOPIFY_CLIENT_ID" ]     && echo "   SHOPIFY_CLIENT_ID is not set"
  [ -z "$SHOPIFY_CLIENT_SECRET" ] && echo "   SHOPIFY_CLIENT_SECRET is not set"
  [ -z "$SHOPIFY_STORE_DOMAIN" ]  && echo "   SHOPIFY_STORE_DOMAIN is not set"
  echo ""
  echo "Edit .env and re-run ./start.sh"
  exit 1
fi

# Check Redis is reachable
REDIS_HOST=$(echo "${REDIS_URL:-redis://localhost:6379}" | sed 's|redis://||' | cut -d: -f1)
REDIS_PORT=$(echo "${REDIS_URL:-redis://localhost:6379}" | sed 's|redis://||' | cut -d: -f2 | cut -d/ -f1)
if ! nc -z "$REDIS_HOST" "${REDIS_PORT:-6379}" 2>/dev/null; then
  echo ""
  echo "⚠  Redis is not reachable at ${REDIS_URL:-redis://localhost:6379}"
  echo "   Start Redis first:"
  echo "   docker run -d -p 6379:6379 redis:7-alpine"
  echo ""
  echo "   Then re-run ./start.sh"
  exit 1
fi

# ── PID tracking for graceful shutdown ────────────────────────────────────────
PIDS=()

cleanup() {
  echo ""
  echo "Shutting down services..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  echo "Done."
}
trap cleanup EXIT INT TERM

echo ""
echo "======================================"
echo "  SourceDesk — Starting Dev Services"
echo "======================================"
echo ""

# ── 1. Remix dev server ────────────────────────────────────────────────────────
echo "[1/2] Starting Remix dev server on :3000..."
(
  cd "$ROOT"
  npm run dev 2>&1 | sed 's/^/  [remix] /'
) &
PIDS+=($!)

# Wait for Remix to be ready
echo "      Waiting for server..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "      ✓  Remix ready"
    break
  fi
  sleep 1
done

# ── 2. BullMQ worker ──────────────────────────────────────────────────────────
echo ""
echo "[2/2] Starting BullMQ worker..."
(
  cd "$ROOT"
  npx tsx app/jobs/worker.ts 2>&1 | sed 's/^/  [worker] /'
) &
PIDS+=($!)

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "======================================"
echo "  All services running:"
echo ""
echo "  App:     http://localhost:3000"
echo "  Store:   https://$SHOPIFY_STORE_DOMAIN/admin"
echo ""
echo "  Press Ctrl+C to stop everything."
echo "======================================"
echo ""

# Wait for any process to exit (if one crashes, cleanup kills the rest)
wait
