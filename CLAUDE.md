# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
It is the **primary priming document** for all AI agents working on this codebase. Read it fully before
writing any code, proposing any architecture, or modifying any existing file.

---

## Project Overview

**SourceDesk** (internal working name: **Product Hub**) — a Shopify-embedded third-party app for
authorized resellers of high-ticket products ($200–$10,000+ per unit). Merchants install from the
Shopify App Store; the app lives inside Shopify Admin via App Bridge and gives resellers a complete
operating platform for:

1. **Supplier discovery** — automated scraping of directories, trade sites, and brand dealer pages
2. **Cold email outreach** — Gmail/Outlook OAuth sequences with reply detection and auto-pausing
3. **Product catalog import** — CSV/Excel upload + web scraping with column mapping UI
4. **AI-driven content generation** — Claude-powered product descriptions into staging fields for merchant review
5. **Price monitoring** — scheduled scrapes, change detection, auto-repricing with MAP guardrails

The app is **multi-tenant** — each merchant's store is an isolated tenant scoped by `shopDomain`.
Multi-tenancy is a **non-negotiable hard constraint** — every DB query, cache key, and job must be
shop-scoped.

Full product requirements: `PRD.md`
Design system: `DESIGN.md`

---

## Tech Stack

### Core Framework

| Technology | Version | Purpose |
|---|---|---|
| **TypeScript** | ~5.x | Strict typing across the entire codebase — no `any`, prefer `unknown` |
| **Remix (React Router v7)** | Latest | Full-stack framework — loaders/actions on server, React on client. Shopify's officially recommended framework. |
| **Node.js** | 20 LTS | Runtime. Do not use Bun or Deno. |

### Shopify Integration

| Technology | Purpose |
|---|---|
| **`@shopify/shopify-app-remix`** | Handles Shopify OAuth, session token validation (JWT), and GraphQL client instantiation. The `authenticate.admin(request)` call is the gate to every protected route. |
| **`@shopify/shopify-app-session-storage-prisma`** | Stores Shopify OAuth sessions in PostgreSQL via Prisma. Required for multi-tenant session management. |
| **`@shopify/app-bridge`** | Client-side SDK for embedded app communication within the Shopify Admin iframe (navigation, modals, toasts). |
| **Shopify Polaris** | React UI component library — required for App Store approval. Never replace with a competing component library. |
| **Shopify GraphQL Admin API** | Primary API for reading/writing products, variants, inventory, metafields, and billing. Prefer over REST for all operations. |
| **Shopify CLI** | Local dev tunnel (`shopify app dev`), extension management, deployment. |

### Database & ORM

| Technology | Purpose |
|---|---|
| **PostgreSQL 15+** | Primary relational database. All tables shop-scoped via `shopDomain` column. |
| **Prisma 5+** | ORM — schema definition, migrations, and type-safe query builder. SQLite for local dev, PostgreSQL in production (configured via `DATABASE_URL`). |

### Background Jobs & Caching

| Technology | Purpose |
|---|---|
| **Redis 7+** | Two roles: (1) BullMQ job persistence and (2) per-shop Shopify API rate limit tracking. Use Railway Redis add-on or Upstash in production. |
| **BullMQ** | Async job queue. All heavy operations (scraping, AI enrichment, email sync, price monitoring, Shopify sync) run as BullMQ jobs. Never do heavy work inside a loader, action, or webhook handler. |

### AI & Content

| Technology | Purpose |
|---|---|
| **Anthropic Claude API** | AI content generation — product descriptions, titles, tags, attributes. Model: `claude-sonnet-4-5` (balance of quality and cost). Use `claude-haiku-4-5-20251001` for cheaper/faster batch operations. |
| **`@anthropic-ai/sdk`** | Official TypeScript SDK for the Claude API. |

### Email

| Technology | Purpose |
|---|---|
| **Google OAuth 2.0 + Gmail API** | Gmail send + inbox read for supplier outreach. Scopes: `gmail.send`, `gmail.readonly`. |
| **Microsoft OAuth 2.0 + Graph API** | Outlook/Microsoft 365 send + inbox read. Scopes: `Mail.Send`, `Mail.Read`. |
| **Nodemailer** | SMTP send wrapper for Gmail (using OAuth tokens, not passwords). |
| **imapflow** | Modern IMAP client for reply detection polling. Replaces legacy `node-imap`. |

### Web Scraping

| Technology | Purpose |
|---|---|
| **Crawlee** | High-level scraping framework (Apify). Manages concurrency, retries, browser pools, and request queues. Used for all scraping jobs. |
| **Playwright** | Browser automation backing Crawlee for JS-rendered pages (dealer portals, SPAs). |
| **Cheerio** | Fast HTML parsing for static pages (saves browser resources when JS isn't needed). |

### Image Processing

| Technology | Purpose |
|---|---|
| **Sharp** | Image resizing, format conversion (WebP), and compression before uploading to Shopify via `stagedUploadsCreate`. |

### Validation & Parsing

| Technology | Purpose |
|---|---|
| **Zod** | Runtime schema validation for: form data in actions, API response parsing, job payloads, and env var validation at startup. |
| **xlsx / exceljs** | Parsing `.xlsx` and `.xls` supplier price sheets. `exceljs` for write operations if needed. |
| **csv-parse** | Streaming CSV parsing for large supplier files. |

### Error Monitoring & Logging

| Technology | Purpose |
|---|---|
| **Sentry** | Error tracking and performance monitoring. Wrap the Remix entry point and worker entrypoint. Tag every error with `shopDomain`. |
| **pino** | Structured JSON logging. Log level controlled by `LOG_LEVEL` env var. Always include `{ shopDomain, jobId }` in log context. |

### Hosting & Infrastructure

| Technology | Purpose |
|---|---|
| **Railway** | Hosting platform. Three Railway services: `web` (Remix server), `worker` (BullMQ drain), `cron` (repeatable discovery + price monitor triggers). Scale web and worker independently. |

---

## Required Shopify API Scopes

Defined in `shopify.app.toml`. The app requires:

```toml
[access_scopes]
scopes = [
  "read_products",
  "write_products",
  "read_inventory",
  "write_inventory",
  "read_metaobject_definitions",
  "write_metaobject_definitions",
  "read_metaobjects",
  "write_metaobjects",
  "read_files",
  "write_files",
  "read_price_rules",
  "write_price_rules",
]
```

Billing uses `appSubscriptionCreate` — no additional scope needed, it's available to all apps.

---

## Environment Variables

All env vars are validated at startup via Zod. Missing required vars crash immediately with a clear error.

```bash
# Shopify
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_APP_URL=              # Production URL of the Remix server

# Database
DATABASE_URL=                 # PostgreSQL connection string (production)
# Local dev uses SQLite — see prisma/schema.prisma provider block

# Redis
REDIS_URL=                    # Redis connection string

# Anthropic
ANTHROPIC_API_KEY=

# Google OAuth (for Gmail)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=          # Must match registered redirect in Google Cloud Console

# Microsoft OAuth (for Outlook)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=       # Must match registered redirect in Azure App Registration
MICROSOFT_TENANT_ID=          # Usually "common" for multi-tenant support

# Error Monitoring
SENTRY_DSN=

# Email Tracking
TRACKING_BASE_URL=            # Base URL for tracking pixel redirects (same as SHOPIFY_APP_URL)

# App Config
NODE_ENV=production           # or development
LOG_LEVEL=info                # pino log level: trace | debug | info | warn | error
```

---

## Commands

```bash
# Development (starts Remix dev server + Shopify tunnel)
shopify app dev

# Start BullMQ worker separately in dev
npx tsx app/jobs/worker.ts

# Build
npm run build

# Type checking
npm run typecheck

# Database migrations
npx prisma migrate dev       # create + apply migration locally
npx prisma migrate deploy    # apply migrations in production
npx prisma studio            # visual DB browser
npx prisma validate          # validate schema without migrating
npx prisma generate          # regenerate Prisma client after schema changes

# Test
npm run test

# Lint
npm run lint

# Format
npm run format
```

---

## Project Structure

```
shopify_manager/
├── app/
│   ├── routes/
│   │   ├── app._index.tsx              # Dashboard — metrics + quick actions
│   │   ├── app.onboarding/             # First-install 5-step setup wizard
│   │   ├── app.suppliers/              # Supplier list + discovery trigger
│   │   ├── app.suppliers.$id/          # Supplier detail CRM view
│   │   ├── app.suppliers.$id.emails/   # Full email thread per supplier
│   │   ├── app.outreach/               # Email sequence builder + analytics
│   │   ├── app.import/                 # Catalog import (CSV/Excel + web scrape)
│   │   ├── app.products/               # Product list + enrichment queue
│   │   ├── app.products.$id/           # Product detail + AI staging review
│   │   ├── app.pricing/                # Alerts + rule builder + price history
│   │   ├── app.settings/               # Store config, email OAuth, templates
│   │   └── webhooks.tsx                # Shopify webhook entry point
│   ├── components/
│   │   ├── layout/                     # Page shells, nav wrappers
│   │   ├── suppliers/                  # Supplier-specific Polaris components
│   │   ├── products/                   # Product-specific Polaris components
│   │   ├── outreach/                   # Email sequence UI components
│   │   ├── import/                     # Column mapper, upload progress UI
│   │   └── pricing/                    # Alert cards, rule builder
│   ├── services/                       # All business logic (routes call services, not DB directly)
│   │   ├── supplier.service.ts
│   │   ├── discovery.service.ts
│   │   ├── email.service.ts            # Gmail/Outlook OAuth + send/read
│   │   ├── sequence.service.ts         # Email sequence logic + reply detection
│   │   ├── import.service.ts           # CSV/Excel parsing + column mapping
│   │   ├── scrape.service.ts           # Crawlee-based scraping (Playwright + Cheerio)
│   │   ├── enrichment.service.ts       # Claude AI enrichment pipeline
│   │   ├── ai-acceptance.service.ts    # ACCEPTANCE_MAP + applyAiAcceptance()
│   │   ├── metafield.service.ts        # Shopify metafield read/write helpers
│   │   ├── pricing.service.ts          # Rules + alerts + price history
│   │   ├── sync.service.ts             # Shopify product push (create/update)
│   │   └── billing.service.ts          # Shopify billing API + usage tracking
│   ├── jobs/
│   │   ├── worker.ts                   # BullMQ worker entrypoint (separate process)
│   │   ├── queues.ts                   # Queue definitions and shared queue config
│   │   ├── supplier-discovery.job.ts   # Scrape directories for leads
│   │   ├── email-sync.job.ts           # IMAP polling per shop (reply detection)
│   │   ├── catalog-scrape.job.ts       # Scrape supplier product catalog pages
│   │   ├── enrichment.job.ts           # Claude AI batch description generation
│   │   ├── price-monitor.job.ts        # Scheduled supplier price checks
│   │   └── shopify-sync.job.ts         # Push products to Shopify GraphQL API
│   ├── ai/
│   │   ├── prompts/                    # Prompt templates per feature
│   │   └── parsers/                    # Response parsers (Zod schemas for AI output)
│   ├── email/
│   │   ├── gmail.client.ts             # Google OAuth token management + Gmail API
│   │   ├── outlook.client.ts           # Microsoft OAuth token management + Graph API
│   │   └── imap.client.ts              # imapflow-based IMAP polling
│   ├── shopify.server.ts               # Shopify app config + authenticate export
│   └── db.server.ts                    # Prisma client singleton
├── prisma/
│   ├── schema.prisma                   # DB schema — all models include shopDomain
│   └── migrations/                     # Migration history (never edit manually)
├── extensions/
│   └── content-blocks/                 # Theme App Extension — Liquid tabs/accordion block
├── public/
│   └── pixel.gif                       # 1x1 tracking pixel for email open tracking
└── shopify.app.toml                    # Shopify CLI config: scopes, webhooks, app URL
```

---

## Architecture

**Pattern**: Shopify embedded app (full-stack Remix) with event-driven background processing.

### Request Flow

```
Merchant (Shopify Admin iframe)
        │  session token (JWT)
        ▼
[Remix loader/action]
  authenticate.admin(request) ──► validates JWT, returns { admin, session }
        │
        ├──► service layer (all DB queries + API calls)
        │         │
        │         ├──► Prisma (PostgreSQL) — always filtered by session.shop
        │         ├──► Shopify GraphQL Admin API (using admin.graphql)
        │         └──► Redis (rate limit tracking, cache)
        │
        └──► BullMQ (enqueue heavy work, never execute inline)
```

### Webhook Flow

```
Shopify ──► POST /webhooks
                │  verify HMAC signature (reject if invalid)
                │  return HTTP 200 immediately (< 5 seconds total)
                └──► enqueue BullMQ job
                            │
                            ▼
                     [Worker Process]
                     drains queue asynchronously
```

### Railway Service Architecture

Three Railway services, independently scalable:

| Service | Command | Scales With |
|---|---|---|
| `web` | `npm run start` (Remix) | Request traffic |
| `worker` | `npx tsx app/jobs/worker.ts` | Job queue depth |
| (cron via BullMQ repeatable jobs) | Managed by worker | Fixed schedule |

### Multi-Tenancy

- Every Prisma model has `shopDomain String` (indexed, non-nullable).
- All service functions accept `shopDomain: string` as a required parameter.
- Service functions are the **enforcement layer** — routes extract `shopDomain` from `session.shop`
  and pass it down. Never pass a raw Prisma query to the DB without a `shopDomain` filter.
- Redis keys always prefixed: `shop:{shopDomain}:rate_limit`, `shop:{shopDomain}:cache:{key}`, etc.
- BullMQ job payloads always include `shopDomain` in the data object.
- A missing `shopDomain` filter is a **data leak** between merchants — treat it as a critical bug.

### Data Synchronization

- **Initial install**: Shopify GraphQL Bulk Operations API for large catalog imports (async export → S3 → parse).
- **Ongoing**: Webhook subscriptions for real-time deltas.
- **Reconciliation**: Repeatable BullMQ job runs nightly to catch missed webhooks.
- **Idempotency**: All sync operations use SHA-256 hash comparison. Skip if content hasn't changed.

### API Rate Limits

- Shopify GraphQL uses cost-based rate limits (1,000 points/second, 2,000 burst).
- Track remaining cost per shop in Redis: `INCR shop:{shopDomain}:rate_limit` with 1-second TTL.
- Before each API call, check remaining budget. If < 200 points, delay with exponential backoff.
- Prefer `@defer` and pagination over fetching large datasets in single requests.
- Use Bulk Operations for dataset reads > 250 records.

---

## Prisma Schema Patterns

### Core Model Shape

Every model **must** follow this pattern:

```prisma
model Example {
  id          String   @id @default(cuid())
  shopDomain  String                          // tenant key — always indexed
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // ... domain fields

  @@index([shopDomain])
}
```

### Key Models (summary — see schema.prisma for full definitions)

```prisma
model Supplier {
  id          String         @id @default(cuid())
  shopDomain  String
  name        String
  website     String?
  status      SupplierStatus @default(LEAD)   // see state machine below
  contacts    Json           @default("[]")   // array of { name, email, phone, role }
  notes       Json           @default("[]")   // array of { body, createdAt }
  documents   Json           @default("[]")   // array of { name, url, type, uploadedAt }
  // ... email thread, linked products (via SupplierProduct join table)
  @@index([shopDomain])
  @@index([shopDomain, status])
}

model Product {
  id              String          @id @default(cuid())
  shopDomain      String
  supplierId      String?
  shopifyId       String?         // null until pushed to Shopify
  title           String
  sku             String
  cost            Decimal?
  msrp            Decimal?
  mapPrice        Decimal?
  syncStatus      SyncStatus      @default(NEVER_SYNCED)
  syncHash        String?         // SHA-256 of last synced payload
  enrichStatus    EnrichStatus    @default(NOT_STARTED)
  // Staging AI fields — never write directly to Shopify:
  aiTitle         String?
  aiDescription   String?
  aiTags          String[]
  aiAttributes    Json?
  rawSource       Json            // preserved original import data, never mutated
  @@index([shopDomain])
  @@index([shopDomain, supplierId])
  @@index([shopDomain, syncStatus])
}

model EmailAccount {
  id           String    @id @default(cuid())
  shopDomain   String    @unique
  provider     Provider  // GMAIL | OUTLOOK
  email        String
  accessToken  String    // encrypted at rest
  refreshToken String    // encrypted at rest
  expiresAt    DateTime
  @@index([shopDomain])
}

model EmailSequence {
  id         String          @id @default(cuid())
  shopDomain String
  name       String
  steps      Json            // array of { dayOffset, subject, body }
  @@index([shopDomain])
}

model PriceHistory {
  id         String   @id @default(cuid())
  shopDomain String
  productId  String
  oldPrice   Decimal
  newPrice   Decimal
  source     String   // "scrape" | "webhook" | "manual"
  createdAt  DateTime @default(now())
  @@index([shopDomain, productId])
}
```

### Enums

```prisma
enum SupplierStatus {
  LEAD
  CONTACTED
  RESPONDED
  NEGOTIATING
  APPROVED
  REJECTED
  INACTIVE
}

enum SyncStatus {
  NEVER_SYNCED
  PENDING
  SYNCED
  FAILED
  OUT_OF_SYNC
}

enum EnrichStatus {
  NOT_STARTED
  PENDING
  RUNNING
  DONE
  FAILED
}

enum Provider {
  GMAIL
  OUTLOOK
}
```

---

## BullMQ Queue Architecture

### Queue Names (defined in `app/jobs/queues.ts`)

```typescript
export const QUEUES = {
  SUPPLIER_DISCOVERY: 'supplier-discovery',
  EMAIL_SYNC:         'email-sync',
  CATALOG_SCRAPE:     'catalog-scrape',
  ENRICHMENT:         'enrichment',
  PRICE_MONITOR:      'price-monitor',
  SHOPIFY_SYNC:       'shopify-sync',
} as const;
```

### Job Payload Shape

Every job payload includes `shopDomain` as a top-level field:

```typescript
// Example — never omit shopDomain
interface EnrichmentJobPayload {
  shopDomain: string;
  productIds: string[];
  priority: 'single' | 'batch';
}
```

### Retry Configuration

```typescript
const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000,  // 2s, 4s, 8s, 16s, 32s
  },
  removeOnComplete: { count: 100 },
  removeOnFail:     { count: 500 },  // keep failed jobs for inspection
};
```

### Repeatable Jobs (cron)

```typescript
// Scheduled discovery — daily per shop (staggered by 5 min per shop to avoid thundering herd)
await queue.add('discovery', { shopDomain }, {
  repeat: { pattern: '0 8 * * *' },  // 8 AM UTC daily
});

// Email sync — every 30 minutes per connected shop
await queue.add('email-sync', { shopDomain }, {
  repeat: { every: 30 * 60 * 1000 },
});

// Price monitor — every 6 hours per supplier with scrape config
await queue.add('price-monitor', { shopDomain, supplierId }, {
  repeat: { every: 6 * 60 * 60 * 1000 },
});
```

---

## Code Patterns

### Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Files (routes/components) | `kebab-case` | `supplier-detail.tsx` |
| Variables / functions | `camelCase` | `getSupplierById()` |
| DB models / TypeScript types | `PascalCase` | `Supplier`, `EmailAccount` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS` |
| GraphQL query strings | colocated in `queries/` subdir | `app/routes/app.products/queries/get-product.ts` |
| Zod schemas | `Schema` suffix | `SupplierCreateSchema` |
| BullMQ job payloads | `Payload` suffix | `EnrichmentJobPayload` |

### Route Pattern (thin routes)

Routes are **thin**: authenticate, extract params, call service, return data. No business logic in routes.

```typescript
// app/routes/app.suppliers.$id.tsx

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const supplier = await getSupplierById(session.shop, params.id!);
  if (!supplier) throw new Response('Not Found', { status: 404 });
  return json({ supplier });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const parsed = SupplierUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return json({ errors: parsed.error.flatten() }, { status: 422 });
  await updateSupplier(session.shop, params.id!, parsed.data);
  return json({ success: true });
}
```

### Service Layer Pattern

```typescript
// app/services/supplier.service.ts

// All service functions: shopDomain is always first arg, always required
export async function getSupplierById(shopDomain: string, id: string) {
  return db.supplier.findFirst({
    where: { id, shopDomain },  // shopDomain ALWAYS in where clause
  });
}

export async function updateSupplier(
  shopDomain: string,
  id: string,
  data: SupplierUpdate
) {
  return db.supplier.update({
    where: { id, shopDomain },  // shopDomain in where, never just id
    data,
  });
}
```

### Zod Validation Pattern

```typescript
// Form action validation
const SupplierUpdateSchema = z.object({
  name:    z.string().min(1).max(200),
  website: z.string().url().optional().or(z.literal('')),
  status:  z.nativeEnum(SupplierStatus),
});

// Env var validation (run at startup in app/env.server.ts)
const EnvSchema = z.object({
  SHOPIFY_API_KEY:      z.string().min(1),
  SHOPIFY_API_SECRET:   z.string().min(1),
  DATABASE_URL:         z.string().url(),
  REDIS_URL:            z.string().url(),
  ANTHROPIC_API_KEY:    z.string().min(1),
  GOOGLE_CLIENT_ID:     z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  // ...
});
export const env = EnvSchema.parse(process.env);
```

### Error Handling

| Error Type | Pattern |
|---|---|
| Shopify API error | Catch, log with `{ shopDomain, operation }`, surface via Polaris `<Banner status="critical">` |
| Validation error | Return `{ errors }` from action with 422 status; render inline with Polaris `<InlineError>` |
| Webhook HMAC failure | Return 401 immediately — never enqueue |
| Auth error | Let `authenticate.admin()` throw — it redirects to OAuth automatically. Do **not** catch. |
| Job failure | BullMQ retries with backoff. After max attempts, job goes to failed state. Alert via Sentry. |
| Rate limit (Shopify) | Exponential backoff in the job. Log remaining cost. Never throw to the user. |

### Sentry Context

Always tag Sentry events with shop context:

```typescript
import * as Sentry from '@sentry/remix';

Sentry.setTag('shopDomain', shopDomain);
Sentry.captureException(error, { extra: { jobId, operation } });
```

---

## Domain Patterns

### Supplier Pipeline State Machine

```
LEAD ──► CONTACTED ──► RESPONDED ──► NEGOTIATING ──► APPROVED
                                                         │
           (any active state) ──────────────────────► REJECTED
           (any active state) ──────────────────────► INACTIVE
```

| Transition | Trigger | Who |
|---|---|---|
| LEAD → CONTACTED | First outreach email sent | Automatic (email-sync job) |
| CONTACTED → RESPONDED | Reply detected via IMAP | Automatic (email-sync job) |
| RESPONDED → NEGOTIATING | Merchant marks as negotiating | Merchant action |
| NEGOTIATING → APPROVED | Merchant marks as approved | Merchant action |
| Any → REJECTED | Merchant rejects | Merchant action |
| Any → INACTIVE | Merchant deactivates | Merchant action |

**Never skip or invent new statuses.** The state machine is the authoritative source.

### AI Staging Fields (Non-Destructive AI)

```
Claude API ──► ai_title, ai_description, ai_tags, ai_attributes (staging)
                                │
                   Merchant reviews in UI
                                │
                    Accept ─────┴───── Reject
                      │                  │
            applyAiAcceptance()     null staging fields
                      │             reset enrichStatus → NOT_STARTED
            write to Shopify
           (metafields, not body_html)
```

- AI output **always** lands in `ai_*` staging fields first.
- `applyAiAcceptance()` in `ai-acceptance.service.ts` is the **only** place that promotes staging to live.
- `ACCEPTANCE_MAP` defines all field mappings in one central object — never inline promotion logic.
- Rejecting AI: set staging fields to `null`, reset `enrichStatus → NOT_STARTED`.

### Content in Metafields (not body_html)

```
Structured content (tabs, specs, accordion) → Shopify metafields
  - Namespace: custom.*  (merchant-visible, connectable in Theme Editor)
  - Namespace: $app:*    (internal app state — sync hash, enrichment status, etc.)

body_html → plain prose narrative only (or empty)

Theme App Extension (Liquid block) → renders custom.* metafields on storefront
```

Never write structured content (tables, lists, sectioned content) into `body_html`.

### Email OAuth Token Pattern

```typescript
// Tokens are encrypted at rest. Decrypt at use time.
// Always check expiry and refresh before any API call.

async function getValidAccessToken(shopDomain: string): Promise<string> {
  const account = await db.emailAccount.findUniqueOrThrow({
    where: { shopDomain }
  });
  if (account.expiresAt < new Date()) {
    const refreshed = await refreshToken(account.provider, account.refreshToken);
    await db.emailAccount.update({
      where: { shopDomain },
      data: {
        accessToken:  encrypt(refreshed.accessToken),
        refreshToken: encrypt(refreshed.refreshToken),
        expiresAt:    refreshed.expiresAt,
      }
    });
    return refreshed.accessToken;
  }
  return decrypt(account.accessToken);
}
```

### Web Scraping Architecture

```typescript
// Use Crawlee's PlaywrightCrawler for JS-rendered pages (dealer portals, SPAs)
// Use CheerioCrawler for static HTML pages (saves browser resources)

// In scrape.service.ts:
function shouldUseBrowser(url: string): boolean {
  // Use heuristics: known SPA frameworks, login-gated portals → true
  // Simple catalog pages, static HTML → false
}
```

Scraping rules:
- All scrapers respect `robots.txt` where legally required.
- Add a 1–3 second randomized delay between requests (`crawlee` handles this via `minConcurrency`/`maxConcurrency`).
- Store scraped HTML in a `scrapeCache` Redis key with 24h TTL to allow reruns without re-fetching.
- Never embed Playwright page handles in job payloads — serialize data as plain JSON.

### AI Prompt Structure

```typescript
// All prompts in app/ai/prompts/
// Structure: system prompt (merchant config injected) + user prompt (product data)

const systemPrompt = buildSystemPrompt({
  niche:       merchantConfig.niche,
  brandVoice:  merchantConfig.brandVoice,
  template:    merchantConfig.contentTemplate,
  examples:    merchantConfig.exampleDescriptions,  // few-shot
});

const userPrompt = buildProductPrompt(product);

const response = await anthropic.messages.create({
  model:      'claude-sonnet-4-5',
  max_tokens: 2048,
  system:     systemPrompt,
  messages:   [{ role: 'user', content: userPrompt }],
});

// Parse response with Zod schema — never trust raw AI output shape
const parsed = AiEnrichmentOutputSchema.safeParse(JSON.parse(extractJson(response)));
```

AI rules:
- Every AI call must have a Zod schema that validates the response before storing it.
- Log token usage per shop for billing/cost tracking: `{ shopDomain, inputTokens, outputTokens }`.
- AI calls in batch jobs use `claude-haiku-4-5-20251001` unless quality requires Sonnet.
- Never call the AI API directly from a loader or action — always via an enrichment job.

---

## Shopify Integration Patterns

### Every Protected Route

```typescript
// At the top of every loader and action in app/routes/app.*
const { admin, session } = await authenticate.admin(request);
const shopDomain = session.shop;  // always a string like "mystore.myshopify.com"
```

### GraphQL Query Pattern

```typescript
// Colocate queries next to the route that uses them
// app/routes/app.products/queries/get-products.ts

export const GET_PRODUCTS_QUERY = `#graphql
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          variants(first: 5) {
            edges {
              node { id sku price }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

// In the loader:
const response = await admin.graphql(GET_PRODUCTS_QUERY, {
  variables: { first: 50, after: cursor },
});
const data = await response.json();
```

### Webhook Handler Pattern

```typescript
// app/routes/webhooks.tsx
export async function action({ request }: ActionFunctionArgs) {
  const { topic, shop, payload } = await authenticate.webhook(request);
  // authenticate.webhook verifies HMAC and throws on failure

  switch (topic) {
    case 'PRODUCTS_UPDATE':
      await shopifySyncQueue.add('webhook-product-update', {
        shopDomain: shop,
        productId:  payload.id,
      });
      break;
    // ... other topics
  }

  return new Response(null, { status: 200 });
  // Return 200 BEFORE any async work completes
}
```

---

## UI & Design

All UI work **must** follow `DESIGN.md` before writing any CSS or JSX. Non-negotiable rules:

1. **Polaris components are the structural layer** — use `<Page>`, `<Card>`, `<DataTable>`, `<Modal>`, etc.
2. **Override Polaris tokens** via CSS custom properties for the dark theme, Space Grotesk headings, and indigo accent — never fight Polaris with inline styles on its own components.
3. **Palette**: Obsidian `#0C0D10` page background, Slate `#14161B` cards, Indigo `#7B68EE` primary actions.
4. **Typography**: Space Grotesk (700) for page titles/display sizes, Inter (400/500) for all body/UI text.
5. **Status badges**: pill-shaped, always paired with icon, color-coded per semantic palette (see DESIGN.md §4).
6. **Tables**: JetBrains Mono for SKUs, prices, IDs; Inter for names and text columns.
7. **Animations**: 100–150ms ease transitions only — no decorative motion.

---

## Testing

### Strategy

| Layer | Tool | Pattern |
|---|---|---|
| Service unit tests | Vitest | Test service functions with a real test DB (SQLite in-memory). Never mock Prisma. |
| Route integration tests | Vitest + `createRemixStub` | Render routes with stub loaders/actions. Use recorded API fixtures for Shopify API calls — never mock the GraphQL client itself. |
| Job unit tests | Vitest | Test job processor logic in isolation. Use a real Redis test instance. |
| E2E | Playwright | Critical user flows (onboarding, CSV import, AI accept). Run against local `shopify app dev`. |

### Test Location

```
app/
└── __tests__/
    ├── services/
    │   ├── supplier.service.test.ts
    │   ├── enrichment.service.test.ts
    │   └── ...
    ├── routes/
    │   ├── app.suppliers.test.ts
    │   └── ...
    └── jobs/
        ├── enrichment.job.test.ts
        └── ...
```

### Key Testing Rules

- **Do not mock the Shopify API client** in integration tests — use recorded fixtures (`__fixtures__/shopify/`).
- **Do not mock Prisma** — use a real SQLite in-memory DB for unit tests, seeded per test.
- All tests must pass before merging. CI runs `npm run lint && npm run typecheck && npm run test`.
- Each service test file seeds its own shop data with a unique `shopDomain` per test to ensure isolation.

---

## Validation Checklist (Before Every Commit)

```bash
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest
npx prisma validate  # Schema integrity
```

All four must pass. CI enforces this — broken builds block merges.

---

## Security

| Concern | Mitigation |
|---|---|
| Multi-tenant data leak | `shopDomain` filter on every Prisma query — enforced at service layer |
| Webhook spoofing | `authenticate.webhook()` verifies HMAC-SHA256. Never skip. |
| OAuth token exposure | Tokens encrypted at rest (AES-256). Never log tokens. Never return them to the client. |
| CSRF | Remix handles CSRF for form actions. Do not bypass with `method: 'GET'` mutations. |
| XSS | React escapes by default. Never use `dangerouslySetInnerHTML` with untrusted content. |
| SQL injection | Prisma parameterizes all queries. Never use raw SQL with interpolated user input. |
| Scraping abuse | Rate-limit scrape jobs per shop. Never allow merchant-controlled scrape concurrency > 3. |
| AI prompt injection | Sanitize supplier-provided content before inserting into AI prompts. |

---

## Key Files

| File | Purpose |
|---|---|
| `shopify.app.toml` | App config: API scopes, webhook subscriptions, app URL. Source of truth for Shopify CLI. |
| `app/shopify.server.ts` | Shopify app initialization and `authenticate` export. Used in every protected route. |
| `app/db.server.ts` | Prisma client singleton — import this for all DB access. |
| `app/env.server.ts` | Zod-validated env vars — import `env` from here, never `process.env` directly. |
| `prisma/schema.prisma` | Database schema. All models must include `shopDomain String`. |
| `app/routes/webhooks.tsx` | Webhook entry point — verify HMAC, return 200, enqueue job. |
| `app/jobs/worker.ts` | BullMQ worker entrypoint — run as a separate Railway service in production. |
| `app/jobs/queues.ts` | Queue name constants and default job options — single source of truth. |
| `app/ai/prompts/` | All Claude prompt templates — never inline prompt strings in service files. |
| `PRD.md` | Full product requirements, feature scope, and persona details. |
| `DESIGN.md` | Design system — colors, typography, component specs. Read before any UI work. |

---

## On-Demand Context

| Topic | Resource |
|---|---|
| Shopify App Bridge | https://shopify.dev/docs/api/app-bridge-library |
| Shopify GraphQL Admin API | https://shopify.dev/docs/api/admin-graphql |
| Shopify Billing API | https://shopify.dev/docs/apps/billing |
| Shopify Bulk Operations | https://shopify.dev/docs/api/usage/bulk-operations/queries |
| Polaris components | https://polaris.shopify.com/components |
| Remix / React Router v7 | https://reactrouter.com/start/framework/installation |
| Prisma docs | https://www.prisma.io/docs |
| BullMQ docs | https://docs.bullmq.io |
| Crawlee docs | https://crawlee.dev/docs/introduction |
| Anthropic SDK | https://docs.anthropic.com/en/api/getting-started |
| imapflow | https://imapflow.com |

---

## Hard Constraints (Never Violate)

1. **Every DB query must be scoped by `shopDomain`** — a missing filter is a data leak. Treat as a P0 bug.
2. **Webhook handlers must return HTTP 200 within 5 seconds** — never do heavy work inline; always enqueue.
3. **AI output always lands in staging fields** — never write AI content directly to live Shopify fields.
4. **Use Shopify GraphQL over REST** — lower payload, supports bulk operations, preferred direction.
5. **Polaris is the only component library** — do not introduce alternatives (Radix, Shadcn, MUI, etc.).
6. **OAuth tokens are encrypted at rest** — never store plaintext. Never log. Never return to client.
7. **Shopify's New Embedded Auth Strategy (token exchange)** is active in all CLI-generated apps post-Feb 2024 — do not revert to cookie-based sessions.
8. **Routes are thin** — all business logic in services. Routes: authenticate → call service → return data.
9. **Zod validates all external input** — form data, API responses, job payloads, env vars.
10. **Read `DESIGN.md` before any UI work** — no guessing colors, fonts, or component styles.
