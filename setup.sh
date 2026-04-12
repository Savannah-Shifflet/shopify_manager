#!/usr/bin/env bash
# setup.sh — Run once to bootstrap SourceDesk for local development
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "======================================"
echo "  SourceDesk — First-time Setup"
echo "======================================"
echo ""

# ── 1. Check Node version ──────────────────────────────────────────────────────
echo "[1/5] Checking Node.js version..."
NODE_VERSION=$(node -e "process.exit(parseInt(process.versions.node.split('.')[0]) < 20 ? 1 : 0)" 2>/dev/null && echo "ok" || echo "fail")
if [ "$NODE_VERSION" = "fail" ]; then
  echo "      ✗  Node.js 20+ is required. Current: $(node -v 2>/dev/null || echo 'not found')"
  exit 1
fi
echo "      ✓  Node.js $(node -v)"

# ── 2. Environment file ────────────────────────────────────────────────────────
echo ""
echo "[2/5] Setting up environment file..."

if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"

  # Auto-generate ENCRYPTION_KEY (32 random bytes, hex-encoded)
  if command -v openssl &>/dev/null; then
    ENC_KEY=$(openssl rand -hex 32)
    # Works on both GNU sed (Linux) and BSD sed (macOS/Git Bash)
    sed -i.bak "s/^ENCRYPTION_KEY=$/ENCRYPTION_KEY=$ENC_KEY/" "$ROOT/.env" && rm -f "$ROOT/.env.bak"
    echo "      Created .env (ENCRYPTION_KEY auto-generated)"
  else
    echo "      Created .env from .env.example"
    echo "      ⚠  Generate ENCRYPTION_KEY manually: openssl rand -hex 32"
  fi

  echo ""
  echo "      ⚠  Before running start.sh, edit .env and fill in:"
  echo "         SHOPIFY_CLIENT_ID        — from Dev Dashboard app credentials"
  echo "         SHOPIFY_CLIENT_SECRET    — from Dev Dashboard app credentials"
  echo "         SHOPIFY_STORE_DOMAIN     — e.g. your-store.myshopify.com"
  echo "         ANTHROPIC_API_KEY        — from console.anthropic.com"
  echo "         REDIS_URL                — redis://localhost:6380 (or your Redis URL)"
  echo "         GOOGLE_CLIENT_ID         — from Google Cloud Console OAuth credentials"
  echo "         GOOGLE_CLIENT_SECRET     — from Google Cloud Console OAuth credentials"
  echo "         GOOGLE_REDIRECT_URI      — must match your app URL + /settings/email/google/callback"
  echo "         MICROSOFT_CLIENT_ID      — from Azure App Registration"
  echo "         MICROSOFT_CLIENT_SECRET  — from Azure App Registration"
  echo "         MICROSOFT_REDIRECT_URI   — must match your app URL + /settings/email/microsoft/callback"
  echo "         TRACKING_BASE_URL        — your app's public URL (for email open tracking)"
else
  echo "      .env already exists — skipping"
fi

# ── 3. npm dependencies ────────────────────────────────────────────────────────
echo ""
echo "[3/5] Installing npm dependencies..."
cd "$ROOT"
npm install --silent
echo "      ✓  Dependencies installed"

# ── 4. Prisma setup ────────────────────────────────────────────────────────────
echo ""
echo "[4/5] Setting up database..."

# Generate Prisma client
npx prisma generate --silent 2>/dev/null || npx prisma generate
echo "      ✓  Prisma client generated"

# Run migrations (creates prisma/dev.db if it doesn't exist)
# Use --skip-generate since we just generated above
# --create-only is not used so the migration is also applied
if npx prisma migrate dev --skip-generate 2>/dev/null; then
  echo "      ✓  Database migrated (prisma/dev.db ready)"
else
  # Fall back: apply any pending migrations without prompting for a migration name
  npx prisma migrate deploy 2>/dev/null && \
    echo "      ✓  Database already up-to-date" || \
    echo "      ⚠  Migration step had warnings — check prisma/migrations/ manually"
fi

# ── 5. Playwright browsers (for Crawlee scraping) ─────────────────────────────
echo ""
echo "[5/5] Installing Playwright browser (Chromium)..."
if npx playwright install chromium --with-deps 2>/dev/null; then
  echo "      ✓  Chromium installed"
else
  npx playwright install chromium 2>/dev/null && echo "      ✓  Chromium installed" || \
    echo "      ⚠  Playwright install failed — scraping jobs may not work until fixed"
fi

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "======================================"
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo ""
echo "  1. Edit .env and add your API keys (see prompts above)"
echo "  2. Make sure Redis is running locally:"
echo "     docker run -d -p 6380:6379 redis:7-alpine"
echo "  3. Run ./start.sh to start all services"
echo "======================================"
echo ""
