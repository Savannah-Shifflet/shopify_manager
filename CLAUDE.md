# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Shopify third-party embedded application for managing suppliers and product details. Merchants install the app from the Shopify App Store; it embeds inside Shopify Admin via App Bridge and extends Shopify's native product management with supplier relationships, sourcing data, and enriched product metadata. The app is multi-tenant — each merchant's store is an isolated tenant scoped by shop domain.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Remix (React Router v7)** | Full-stack framework — handles both frontend (React) and backend (loaders/actions). Shopify's officially recommended framework. |
| **Shopify Polaris** | React UI component library matching Shopify Admin's design system. Required for App Store approval. |
| **`@shopify/shopify-app-remix`** | Handles Shopify OAuth, session token validation, and API client instantiation. |
| **`@shopify/app-bridge`** | Client-side SDK for embedded app communication within the Shopify Admin iframe. |
| **Shopify GraphQL Admin API** | Primary API for reading/writing products, variants, inventory, and metafields. Preferred over REST for complex queries. |
| **PostgreSQL** | Primary relational database. Every table is shop-scoped via a `shop` foreign key for multi-tenant isolation. |
| **Prisma** | ORM for schema management, migrations, and type-safe queries. SQLite in local dev, PostgreSQL in production. |
| **Redis** | Caching layer and job queue backing store. Used for API rate limit tracking per shop and BullMQ job persistence. |
| **BullMQ** | Async job queue for webhook processing and background sync tasks. Keeps webhook handlers under Shopify's 5-second response timeout. |
| **Railway** | Hosting platform. Runs two processes: a web server (Remix) and a worker (BullMQ drain). Scales independently. |
| **Shopify CLI** | Project scaffolding, local dev tunnel, extension management, and app deployment. |

---

## Commands

```bash
# Development (starts Remix dev server + Shopify tunnel)
shopify app dev

# Build
npm run build

# Database migrations
npx prisma migrate dev       # create + apply migration locally
npx prisma migrate deploy    # apply migrations in production
npx prisma studio            # visual DB browser

# Test
npm run test

# Lint
npm run lint
```

---

## Project Structure

```
shopify_manager/
├── app/
│   ├── routes/              # Remix routes (UI pages + API endpoints)
│   │   ├── app._index.tsx   # App home (embedded in Shopify Admin)
│   │   ├── app.suppliers/   # Supplier management pages
│   │   ├── app.products/    # Product detail management pages
│   │   └── webhooks.tsx     # Shopify webhook handler (returns 200, enqueues job)
│   ├── components/          # Reusable Polaris-based React components
│   ├── services/            # Business logic (supplier, product, sync services)
│   ├── jobs/                # BullMQ job definitions and worker entrypoint
│   ├── shopify.server.ts    # Shopify app config + authenticate helper
│   └── db.server.ts         # Prisma client singleton
├── prisma/
│   ├── schema.prisma        # DB schema — all models include shopDomain FK
│   └── migrations/          # Migration history
├── extensions/              # Shopify app extensions (if needed)
├── public/                  # Static assets
└── shopify.app.toml         # Shopify CLI app config (scopes, webhooks, etc.)
```

---

## Architecture

**Pattern**: Shopify embedded app (full-stack Remix) with event-driven background processing.

### Request Flow
1. Merchant opens app inside Shopify Admin → App Bridge provides a session token (JWT).
2. Every Remix loader/action calls `authenticate.admin(request)` via `@shopify/shopify-app-remix` — this validates the session token and returns a scoped GraphQL client.
3. Loaders fetch data (Shopify API + PostgreSQL), actions mutate data, all server-side.
4. UI renders with Polaris components inside the Shopify Admin iframe.

### Webhook Flow
1. Shopify sends a webhook (e.g., `products/update`) to `/webhooks`.
2. Handler verifies the HMAC signature, returns HTTP 200 immediately.
3. Job is pushed to a BullMQ queue backed by Redis.
4. The worker process drains the queue asynchronously — syncs data to PostgreSQL, updates supplier links, etc.

### Multi-Tenancy
- Every database table has a `shopDomain` column (e.g., `mystore.myshopify.com`).
- All queries are scoped by `shopDomain` — never query across tenants.
- Shopify OAuth session tokens are stored per-shop via `@shopify/shopify-app-session-storage-prisma`.

### Data Synchronization
- **Initial install**: Bulk import via Shopify's GraphQL Bulk Operations API (async export for large catalogs).
- **Ongoing**: Webhook subscriptions for real-time deltas (`products/create`, `products/update`, `products/delete`, `inventory_levels/update`).
- **Reconciliation**: Periodic job to catch any missed webhooks (Shopify guarantees at-least-once delivery, not exactly-once).

### API Rate Limits
- Shopify GraphQL uses a cost-based rate limit. Track remaining cost per shop in Redis.
- Implement exponential backoff on 429 responses.
- Prefer GraphQL bulk operations for large dataset reads over paginated queries.

---

## Code Patterns

### Naming Conventions
- Files: `kebab-case` for routes and components (Remix convention)
- Variables/functions: `camelCase`
- Database models/types: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Shopify API queries: colocate GraphQL strings in a `queries/` subfolder next to the route that uses them

### File Organization
- Business logic lives in `app/services/` — routes should be thin (call a service, return data)
- BullMQ job processors live in `app/jobs/` with one file per job type
- Shared Polaris component wrappers live in `app/components/`
- All Prisma queries are shop-scoped — never pass a query without a `shopDomain` filter

### Error Handling
- Shopify API errors: catch and log with shop context; surface user-friendly messages via Polaris Banner
- Webhook failures: BullMQ retries with exponential backoff (max 5 attempts); failed jobs go to a dead-letter queue for inspection
- Auth errors: `authenticate.admin()` automatically redirects to Shopify OAuth if the session is invalid — do not catch these

---

## Testing

- **Run tests**: `npm run test`
- **Test location**: `app/__tests__/`
- **Pattern**: Unit tests for service logic; integration tests for routes using Remix's `createRemixStub`. Do not mock the Shopify API client in integration tests — use recorded fixtures.

---

## Validation

```bash
# Before committing
npm run lint
npm run typecheck
npm run test
npx prisma validate
```

---

## Key Files

| File | Purpose |
|------|---------|
| `shopify.app.toml` | App config: API scopes, webhook subscriptions, app URL. Source of truth for Shopify CLI. |
| `app/shopify.server.ts` | Shopify app initialization and `authenticate` export used in every protected route. |
| `app/db.server.ts` | Prisma client singleton — import this for all DB access. |
| `prisma/schema.prisma` | Database schema. All models must include `shopDomain String`. |
| `app/routes/webhooks.tsx` | Webhook entry point — verify HMAC, return 200, enqueue job. |
| `app/jobs/worker.ts` | BullMQ worker entrypoint — run this as a separate process in production. |

---

## On-Demand Context

| Topic | File |
|-------|------|
| Shopify App Bridge docs | https://shopify.dev/docs/api/app-bridge-library |
| Shopify GraphQL Admin API | https://shopify.dev/docs/api/admin-graphql |
| Polaris component library | https://polaris.shopify.com/components |
| Remix docs | https://reactrouter.com/start/framework/installation |
| Prisma docs | https://www.prisma.io/docs |
| BullMQ docs | https://docs.bullmq.io |

---

## Notes

- **Multi-tenancy is non-negotiable**: every DB query must be scoped by `shopDomain`. A missing shop filter is a data leak between merchants.
- **Webhook handlers must return HTTP 200 within 5 seconds** — never do heavy work inline; always enqueue a job.
- **Use Shopify GraphQL over REST** — lower payload sizes, supports bulk operations, and is the direction Shopify is investing in.
- **Polaris is required** for App Store submission — do not introduce a competing component library.
- **Shopify's New Embedded Auth Strategy** (token exchange) is enabled by default in CLI-generated apps post-Feb 2024 — do not revert to legacy cookie-based sessions.
- The two core data domains are **Suppliers** and **Products** — keep them as separate Prisma models with a join table for supplier-product relationships.
