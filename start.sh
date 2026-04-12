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

if [ ! -f "$ROOT/prisma/dev.db" ]; then
  echo "Error: prisma/dev.db not found. Run ./setup.sh first."
  exit 1
fi

# Check that required env vars are set
source "$ROOT/.env" 2>/dev/null || true
MISSING=()
[ -z "$SHOPIFY_CLIENT_ID" ]     && MISSING+=("SHOPIFY_CLIENT_ID")
[ -z "$SHOPIFY_CLIENT_SECRET" ] && MISSING+=("SHOPIFY_CLIENT_SECRET")
[ -z "$SHOPIFY_STORE_DOMAIN" ]  && MISSING+=("SHOPIFY_STORE_DOMAIN")
[ -z "$ANTHROPIC_API_KEY" ]     && MISSING+=("ANTHROPIC_API_KEY")
[ -z "$ENCRYPTION_KEY" ]        && MISSING+=("ENCRYPTION_KEY")

if [ "${#MISSING[@]}" -gt 0 ]; then
  echo ""
  echo "⚠  Missing required env vars in .env:"
  for var in "${MISSING[@]}"; do
    echo "   $var is not set"
  done
  echo ""
  echo "Edit .env and re-run ./start.sh"
  exit 1
fi

# Check Redis is reachable
REDIS_HOST=$(echo "${REDIS_URL:-redis://localhost:6380}" | sed 's|redis://||' | cut -d: -f1)
REDIS_PORT=$(echo "${REDIS_URL:-redis://localhost:6380}" | sed 's|redis://||' | cut -d: -f2 | cut -d/ -f1)
if ! (echo > /dev/tcp/$REDIS_HOST/${REDIS_PORT:-6379}) 2>/dev/null; then
  echo ""
  echo "⚠  Redis is not reachable at ${REDIS_URL:-redis://localhost:6380}"
  echo "   Start Redis first:"
  echo "   docker run -d -p 6380:6379 redis:7-alpine"
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
  npm run worker 2>&1 | sed 's/^/  [worker] /'
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
