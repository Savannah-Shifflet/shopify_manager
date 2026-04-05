# Workflow: Production Deploy Checklist

Complete in order. Do not skip Critical items.

## Before Any Production Traffic

- [ ] **C1** — Gate dev stub user behind `DEV_MODE=true` env var (`app/main.py`)
- [ ] **C2** — Add `RuntimeError` guard for default JWT secret (`app/config.py`)
- [ ] **C3** — Encrypt Shopify token at rest (`app/models/user.py`)
- [ ] **C4** — Encrypt IMAP password at rest (`app/models/store_settings.py`)
- [ ] **C6** — Remove hardcoded dev credentials from login UI (`frontend/src/app/login/page.tsx`)
- [ ] Set `CORS_ORIGINS` env var to production frontend URL (not localhost)
- [ ] Set strong `SECRET_KEY` — never use the default
- [ ] Run `alembic upgrade head` against production DB

## Before App Store Submission

- [ ] **AS2** — Implement Shopify Billing API (`appSubscriptionCreate`)
- [ ] **AS4** — Implement `app/uninstalled` webhook — deactivate merchant on uninstall
- [ ] Register GDPR webhooks in Shopify Partner Dashboard (AS3 is implemented, just needs registration)
- [ ] Test full OAuth install flow end-to-end with a development store
- [ ] Test billing charge creation and confirmation flow

## Infrastructure

- [ ] **M1** — Increase DB pool: `size=20, overflow=40` (`app/database.py`)
- [ ] Switch Celery pool to `gevent --concurrency=50` (Linux)
- [ ] Add `pgbouncer` if expecting > 100 concurrent merchants
- [ ] Confirm Redis is persistent (not ephemeral) — Celery beat schedule stored there

## High-Priority Bugs to Fix First

- [ ] **H5** — Variant price fallback `!= 0.0` → `is None` (`utils/shopify_client.py:413`)
- [ ] **H6** — Error handling in `pull_from_shopify()` (`routers/sync.py:173`)
- [ ] **H7** — Auto-fail beat task for stuck `running` enrichments
- [ ] **M4** — Webhook HMAC: reject (not accept) when secret not configured
- [ ] **M5** — Move OAuth state to Redis

## Monitoring

- Set up error tracking (Sentry or equivalent) on the backend
- Alert on Celery queue depth — if `enrichment` queue backs up, workers need scaling
- Alert on `sync_status = "failed"` count — indicates Shopify API issues
- Alert on `enrichment_status = "failed"` count — indicates Claude API issues or bad data

## Environment Variables to Set in Production

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
CELERY_BROKER_URL=redis://...
CELERY_RESULT_BACKEND=redis://...
ANTHROPIC_API_KEY=sk-ant-...
SECRET_KEY=<strong-random-64-char>
CORS_ORIGINS=https://your-app.com
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
APP_URL=https://api.your-app.com
FRONTEND_URL=https://your-app.com
STORAGE_PATH=/app/storage
DEV_MODE=false  # or omit entirely
```
