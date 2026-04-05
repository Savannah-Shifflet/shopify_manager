# Product Requirements Document
# SourceDesk — Supplier & Product Management for Authorized Resellers

**Version:** 1.0  
**Date:** 2026-04-05  
**Status:** Draft

---

## 1. Executive Summary

SourceDesk is a Shopify-embedded third-party application built for authorized resellers of high-ticket products. It replaces a standalone MVP (`shopify_products`) with a fully integrated, production-grade experience living inside Shopify Admin via App Bridge. Merchants install SourceDesk from the Shopify App Store and immediately gain a complete operating platform for finding suppliers, managing outreach relationships, importing product catalogs, generating brand-consistent product content, and monitoring pricing — all without leaving Shopify.

The app addresses four core pain points that authorized resellers face daily: (1) the difficulty of discovering legitimate suppliers for their niche and conducting professional cold outreach at scale, (2) the manual effort of converting supplier-provided Excel sheets or website catalogs into properly structured Shopify products, (3) the inconsistency of product descriptions and content across a growing catalog, and (4) the operational burden of tracking price changes, promotions, and MAP compliance across multiple supplier relationships.

SourceDesk is category-agnostic — each merchant configures their niche, brand voice, pricing rules, and content standards during onboarding, and every AI-driven feature adapts to that configuration. The MVP goal is to deliver a clean, well-architected embedded app that replaces all functionality of the existing standalone MVP while establishing the architectural foundations (multi-tenancy, metafields-based content, OAuth email, background job infrastructure) needed to scale.

---

## 2. Mission

**Mission Statement:** Give authorized resellers of high-ticket products the infrastructure to source, launch, and manage their catalog with the professionalism and efficiency of a large retail operation — without the headcount.

### Core Principles

1. **Merchant-configured, AI-executed** — Merchants define their standards once (niche, brand voice, pricing rules, content templates). The AI executes against those standards consistently at scale. Merchants never need to re-explain their preferences.

2. **Non-destructive AI** — AI suggestions always land in staging fields. Merchants review and accept before any change reaches Shopify. The merchant is always in control of what goes live.

3. **Shopify-native, not Shopify-adjacent** — The app lives inside Shopify Admin, uses Shopify's billing, reads and writes via Shopify's GraphQL API, and follows Polaris design patterns. It feels like a natural extension of Shopify, not a third-party tool bolted on.

4. **Multi-tenant by design** — Every query is scoped by `shopDomain`. No merchant ever sees another merchant's data. This is a hard architectural constraint, not a nice-to-have.

5. **Async-first operations** — Scraping, AI enrichment, email sending, and price monitoring all run as background jobs. The UI never blocks on long operations. Merchants get real-time status updates through the interface.

---

## 3. Target Users

### Primary Persona — The Authorized Reseller

- **Who:** A Shopify store owner who sells high-ticket items ($200–$10,000+ per unit) from brands they are an authorized dealer of. Categories include outdoor/hunting gear, luxury goods, fitness equipment, furniture, electronics, sporting goods, powersports, etc.
- **Business model:** They apply to brands for dealer authorization, receive wholesale pricing, and resell at MAP or above. Their catalog may span 3–20+ supplier brands with hundreds to thousands of SKUs.
- **Pain points:** Supplier discovery is manual and time-consuming. Cold outreach is inconsistent. Supplier product sheets are messy and require hours of manual data entry. Product descriptions are copy-pasted from supplier PDFs and lack brand voice. Price changes from suppliers require manual auditing across the catalog.
- **Technical comfort:** Moderate. Comfortable using SaaS tools, but not a developer. Will not edit Liquid theme files directly. Expects the app to guide them through setup.
- **Usage pattern:** Opens the app several times per week. Heavy use during catalog onboarding and new supplier acquisition phases. Lighter ongoing use for monitoring and price management.

### Secondary Persona — The Store Manager / VA

- A team member delegated access to manage specific functions (product imports, email outreach) under the owner's account. Needs clear task-based workflows with no ambiguity about what to do next.

---

## 4. MVP Scope

### Core Functionality

#### ✅ In Scope

**Onboarding**
- ✅ Guided setup wizard on first install (niche definition, brand voice, store standards, email account connection)
- ✅ Niche/category configuration that seeds all AI personalization
- ✅ Brand voice and content standards configuration
- ✅ Gmail / Outlook OAuth connection for email send + read
- ✅ Shopify metafield namespace setup for content fields

**Supplier Discovery & CRM**
- ✅ On-demand supplier discovery search (merchant-triggered, searches by niche/category)
- ✅ Scheduled background discovery (runs on a cron, surfaces new leads automatically)
- ✅ Supplier pipeline with automatic status progression (LEAD → CONTACTED → RESPONDED → NEGOTIATING → APPROVED → REJECTED → INACTIVE)
- ✅ Merchant notification when supplier status changes
- ✅ Supplier detail view (contact info, notes, documents, email history, linked products)
- ✅ Supplier list with filtering by status, category, date added

**Cold Email Outreach**
- ✅ Per-merchant OAuth email connection (Gmail + Outlook via OAuth 2.0)
- ✅ Customizable email sequences with a starter template
- ✅ Reply detection — sequences automatically pause/stop when a supplier responds
- ✅ Automatic supplier status update when reply is detected
- ✅ Merchant notification on supplier reply
- ✅ Email thread view per supplier (full inbox/outbox history)
- ✅ Bulk email to multiple leads
- ✅ Email template library (merchant-defined reusable templates)
- ✅ Basic email analytics (sent, opened, replied)

**Product Catalog Import**
- ✅ CSV / Excel file upload with column mapping UI (fuzzy field matching + manual override)
- ✅ Supplier website scraping for product import
- ✅ Variant detection and grouping from flat spreadsheets
- ✅ Import job status tracking with progress indicators
- ✅ Raw source data preserved and never overwritten after import

**AI Product Content Generation**
- ✅ Merchant-defined description templates (sections with tag, title, hint, required flag)
- ✅ AI generates content into staging fields (`ai_title`, `ai_description`, `ai_tags`, `ai_attributes`)
- ✅ Merchant reviews and accepts/rejects AI suggestions per field
- ✅ Content written to Shopify metafields (not `body_html` heading tags)
- ✅ Theme App Extension for rendering metafield content as tabs/accordions in storefront
- ✅ Brand voice and niche config injected into every AI prompt
- ✅ Single product enrichment + bulk batch enrichment
- ✅ Enrichment status lifecycle (not_started → pending → running → done/failed)

**Price Monitoring & Management**
- ✅ Supplier website price monitoring (scheduled scrapes per supplier URL)
- ✅ Price change detection (hash comparison against last known state)
- ✅ Merchant alerts on price change
- ✅ Auto-reprice in Shopify based on merchant-defined rules (e.g., maintain X% margin)
- ✅ MAP enforcement alerts (warn merchant when price would violate MAP)
- ✅ Pricing rule builder (markup type, markup value, priority, per-supplier)
- ✅ Price history tracking per product
- ✅ Pricing alert review queue (approve / reject / auto-apply)

**Shopify Sync**
- ✅ Push products to Shopify (create + update) via GraphQL Admin API
- ✅ Image upload via `stagedUploadsCreate` + Sharp optimization
- ✅ Sync status per product (never_synced / pending / synced / failed / out_of_sync)
- ✅ Sync deduplication via SHA-256 hash
- ✅ Shopify webhook handling (products/update, products/delete)
- ✅ Bulk sync operations

**Billing**
- ✅ 3-tier subscription via Shopify `appSubscriptionCreate` GraphQL mutation
- ✅ Usage-based overage on AI credits above tier limit
- ✅ 14-day free trial
- ✅ Annual billing option with discount

**Design & UX**
- ✅ Polaris component library as foundation (required for App Store approval)
- ✅ Custom design system (DESIGN.md) extending Polaris with brand-specific colors, typography, elevation
- ✅ Sleek, modern aesthetic with consistent visual language across all pages
- ✅ Responsive layout

#### ❌ Out of Scope (Future Phases)

- ❌ XML / EDI / direct API connections to supplier systems
- ❌ Multi-store / multi-location support
- ❌ Supplier self-onboarding portal
- ❌ AI-generated product images (placeholder, not live)
- ❌ Mobile app
- ❌ Reorder / purchase order management
- ❌ Customer-facing features (no storefront-visible app blocks beyond Theme App Extension)
- ❌ Analytics dashboard (beyond basic enrichment/sync status counts)
- ❌ Third-party integrations (QuickBooks, ShipStation, etc.)
- ❌ White-label / agency multi-tenant management
- ❌ Faire / Alibaba official API integrations

---

## 5. User Stories

### US-01: Supplier Discovery
> As an authorized reseller, I want the app to automatically find and surface supplier leads in my niche, so that I can grow my supplier network without manually searching directories and trade sites.

**Example:** A merchant who sells outdoor hunting gear configures their niche as "hunting and outdoor equipment." SourceDesk runs a daily discovery job and presents them with a list of 5 new potential suppliers pulled from industry directories and brand websites, each with contact info and a relevance score.

### US-02: Email Outreach Sequences
> As a merchant, I want to set up automated email sequences for new supplier leads that pause automatically when they reply, so that I can conduct professional outreach at scale without manually following up on every lead.

**Example:** A merchant creates a 4-step sequence: initial intro (Day 1), product line interest (Day 4), value-add follow-up (Day 9), breakup email (Day 16). When a supplier replies on Day 6, the sequence stops and the supplier's status automatically changes from CONTACTED to RESPONDED, triggering a notification to the merchant.

### US-03: Catalog Import from Supplier Files
> As a merchant, I want to upload a supplier's Excel price sheet and have the app map the columns and import the products, so that I don't have to manually enter hundreds of product records.

**Example:** A supplier sends a 400-row Excel file with columns "Item Name", "Your Cost", "MSRP", "MAP", "UPC", "Freight". The column mapper auto-detects these and maps them to the app's fields. The merchant reviews the mapping, confirms, and 400 products are imported with correct pricing and SKUs in one click.

### US-04: Catalog Import via Web Scraping
> As a merchant, I want to scrape a supplier's website to import their product catalog when no file is provided, so that I don't have to manually copy product data from web pages.

**Example:** A supplier has no price sheet but lists all products on their dealer portal. The merchant points SourceDesk at the catalog URL, the scraper navigates pages and extracts product names, prices, SKUs, and descriptions, presenting them for review before import.

### US-05: AI Product Description Generation
> As a merchant, I want the app to generate product descriptions that match my store's brand voice and content template, so that my catalog is consistent and professional without writing each description manually.

**Example:** A merchant's template has sections: Hero Headline (H2), Key Features (UL), Specifications Table, Warranty & Support (collapsible). After importing 50 products from a supplier, they queue a batch enrichment. Claude generates descriptions following the template and the merchant's "technical but approachable" brand voice. Each description lands in staging for review before going live.

### US-06: Price Change Monitoring
> As a merchant, I want the app to monitor my suppliers' websites for price changes and automatically update my Shopify prices within my margin rules, so that I'm never accidentally selling below cost or MAP.

**Example:** A supplier raises the cost on a rifle scope by 8%. SourceDesk detects the change during a scheduled scrape, calculates the new retail price using the merchant's "40% margin" rule, checks it against the MAP, and queues a pricing alert. The merchant approves the update from their alert queue. Shopify is updated automatically.

### US-07: Onboarding & Configuration
> As a new merchant, I want a guided setup wizard that configures my niche, brand voice, and email account in one flow, so that the app is fully personalized before I start using any features.

**Example:** On first install, the merchant is walked through: (1) niche selection and product categories, (2) brand voice adjectives and example description pasting, (3) Gmail OAuth connection, (4) pricing rule defaults (target margin %, MAP enforcement preference), (5) content template creation. After completing the wizard, the app's AI knows their niche, their voice, and their rules.

### US-08: Supplier Relationship Management
> As a merchant, I want a CRM-style view of all my supplier relationships with their current pipeline status, so that I always know which suppliers I'm actively negotiating with and what the next action is.

**Example:** The suppliers page shows a pipeline board (or filterable list) with suppliers segmented by status. A supplier in NEGOTIATING status shows a follow-up date, notes from the last call, and a quick link to their email thread. When the merchant marks the deal as approved, the supplier moves to APPROVED and the merchant can start importing their catalog.

---

## 6. Core Architecture & Patterns

### High-Level Architecture

```
[Shopify Admin iframe]
        │
        ▼
[Remix Full-Stack App]  ←→  [Shopify GraphQL Admin API]
  Loaders / Actions
        │
        ├──► [PostgreSQL via Prisma]  (all tables shop-scoped by shopDomain)
        │
        ├──► [Redis]  (rate limit tracking, job persistence, scrape state cache)
        │
        └──► [BullMQ Workers]
                ├── supplier-discovery.worker.ts   (scrape directories for leads)
                ├── email-sync.worker.ts            (IMAP inbox polling per shop)
                ├── catalog-scrape.worker.ts        (scrape supplier product pages)
                ├── enrichment.worker.ts            (Claude AI description generation)
                ├── price-monitor.worker.ts         (scheduled supplier price checks)
                └── shopify-sync.worker.ts          (push products to Shopify)
```

### Request Flow
1. Merchant opens app → App Bridge provides session token (JWT)
2. Every Remix loader/action calls `authenticate.admin(request)` → validates JWT, returns scoped GraphQL client
3. All DB queries scoped by `shopDomain` extracted from the authenticated session
4. Heavy operations (scraping, enrichment, sync) enqueued to BullMQ — never executed inline
5. UI polls job status via lightweight loaders; no WebSockets at MVP scale

### Webhook Flow
1. Shopify sends webhook → `/webhooks` handler verifies HMAC, returns HTTP 200 immediately
2. Job pushed to BullMQ queue
3. Worker drains queue asynchronously

### Multi-Tenancy
- Every Prisma model includes `shopDomain String` (indexed)
- All queries filter by `shopDomain` — enforced at the service layer, not the route layer
- Shopify OAuth sessions stored per-shop via `@shopify/shopify-app-session-storage-prisma`
- Future: PostgreSQL Row Level Security as defense-in-depth layer

### AI Non-Destructive Pattern
- All AI outputs land in `ai_*` staging fields
- A single `applyAiAcceptance()` service function is the only place staging fields are promoted to main fields
- `ACCEPTANCE_MAP` defines all field mappings in one place
- Rejecting AI: set staging fields to null and reset enrichment status

### Content Architecture (Metafields over body_html)
- Structured product content (tabs, accordions, specs) written to Shopify metafields via `metafieldsSet`
- App owns `$app:*` namespace metafields for internal state
- Merchant-visible content written to `custom.*` namespace (connectable in Theme Editor)
- Theme App Extension (Liquid block) bundled with app for rendering on any theme
- `body_html` reserved for plain prose narrative only

### Directory Structure

```
shopify_manager/
├── app/
│   ├── routes/
│   │   ├── app._index.tsx              # Dashboard / home
│   │   ├── app.onboarding/             # Setup wizard
│   │   ├── app.suppliers/              # Supplier list + discovery
│   │   ├── app.suppliers.$id/          # Supplier detail + CRM
│   │   ├── app.suppliers.$id.emails/   # Email thread view
│   │   ├── app.outreach/               # Sequence builder + analytics
│   │   ├── app.import/                 # Catalog import (CSV + scrape)
│   │   ├── app.products/               # Product list + enrichment queue
│   │   ├── app.products.$id/           # Product detail + AI review
│   │   ├── app.pricing/                # Alerts + rules + price history
│   │   ├── app.settings/               # Store settings, email OAuth, templates
│   │   └── webhooks.tsx                # Shopify webhook handler
│   ├── components/
│   │   ├── layout/                     # Page shells, navigation
│   │   ├── suppliers/                  # Supplier-specific components
│   │   ├── products/                   # Product-specific components
│   │   ├── outreach/                   # Email sequence components
│   │   ├── import/                     # Column mapper, progress UI
│   │   └── pricing/                    # Alert cards, rule builder
│   ├── services/
│   │   ├── supplier.service.ts
│   │   ├── discovery.service.ts
│   │   ├── email.service.ts            # Gmail/Outlook OAuth + send/read
│   │   ├── sequence.service.ts         # Email sequence logic + reply detection
│   │   ├── import.service.ts           # CSV/Excel parsing + column mapping
│   │   ├── scrape.service.ts           # Crawlee-based scraping
│   │   ├── enrichment.service.ts       # Claude AI enrichment
│   │   ├── ai-acceptance.service.ts    # ACCEPTANCE_MAP + applyAiAcceptance()
│   │   ├── metafield.service.ts        # Shopify metafield read/write
│   │   ├── pricing.service.ts          # Rules + alerts + history
│   │   ├── sync.service.ts             # Shopify product sync
│   │   └── billing.service.ts          # Shopify billing API
│   ├── jobs/
│   │   ├── worker.ts                   # BullMQ worker entrypoint
│   │   ├── supplier-discovery.job.ts
│   │   ├── email-sync.job.ts
│   │   ├── catalog-scrape.job.ts
│   │   ├── enrichment.job.ts
│   │   ├── price-monitor.job.ts
│   │   └── shopify-sync.job.ts
│   ├── shopify.server.ts
│   └── db.server.ts
├── extensions/
│   └── content-blocks/                 # Theme App Extension (tabs/accordion Liquid)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── shopify.app.toml
```

---

## 7. Feature Specifications

### 7.1 Onboarding Wizard

**Flow (5 steps):**
1. **Niche & Categories** — Merchant describes their store focus, selects product categories. This seeds supplier discovery queries and AI prompt context.
2. **Brand Voice** — Merchant selects tone adjectives, pastes 1–3 example product descriptions as few-shot references. Used in every AI enrichment prompt.
3. **Content Template** — Merchant builds their first description template (drag-and-drop section builder with tag, title, hint, required toggle). Default starter template provided.
4. **Email Account** — OAuth connection to Gmail or Outlook. Permissions: send + read. Merchant selects which connected account to use as the sending identity for supplier outreach.
5. **Pricing Defaults** — Default markup percentage, MAP enforcement preference (alert only), default shipping cost.

**Rules:**
- Onboarding state persists; merchant can exit and resume
- Can be re-run at any time from Settings
- App blocks core features with a banner until onboarding is complete

---

### 7.2 Supplier Discovery

**On-Demand Search:**
- Merchant enters keywords or selects from their configured categories
- App triggers a BullMQ scrape job against supplier directories, trade association member lists, and brand "become a dealer" pages
- Results surfaced in a lead review UI with: supplier name, website, estimated product categories, contact info found, relevance score
- Merchant can add to CRM (creates LEAD record) or dismiss

**Scheduled Discovery:**
- BullMQ repeatable job runs on merchant-configured schedule (default: daily)
- Results appear in a "New Leads" notification badge on the Suppliers page
- Merchant reviews and acts from the same lead review UI

**Discovery Sources:**
- Web search for "[niche] authorized dealer program" / "[niche] wholesale distributor"
- Known B2B directories (Thomas Net, industry-specific directories configured per niche)
- Brand websites scraped for dealer application pages

---

### 7.3 Supplier CRM & Pipeline

**Pipeline Stages:**
```
LEAD → CONTACTED → RESPONDED → NEGOTIATING → APPROVED → REJECTED → INACTIVE
```

**Automatic transitions:**
- LEAD → CONTACTED: first outreach email sent
- CONTACTED → RESPONDED: reply detected via IMAP sync
- Any active stage → REJECTED/INACTIVE: merchant action only

**Merchant-triggered transitions:**
- RESPONDED → NEGOTIATING: merchant marks as actively negotiating
- NEGOTIATING → APPROVED: merchant marks as approved
- Any → REJECTED or INACTIVE: merchant action

**Supplier Detail Page includes:**
- Contact information (multiple contacts supported as JSON array)
- Pipeline status + date of last status change
- Notes / CRM log (timestamped entries)
- Email thread (full INBOUND/OUTBOUND history)
- Linked products (products imported from this supplier)
- Documents (price sheets, agreements, certificates — file upload + categorization)
- Onboarding checklist (merchant-defined steps for new supplier setup)
- Scrape configuration (for catalog scraping and price monitoring)
- Pricing configuration (supplier-specific markup rules)

---

### 7.4 Cold Email Outreach

**Email Account Connection:**
- OAuth 2.0 for Gmail (Google Workspace and personal Gmail) and Outlook/Microsoft 365
- Scopes: send email + read inbox (for reply detection)
- Per-merchant connection stored as encrypted tokens in DB
- Merchants connect from Settings; shown as connected/disconnected with reconnect button

**Email Sequences:**
- Merchant creates sequences with N steps (no fixed limit)
- Each step has: day offset (days after previous step), subject template, body template, optional custom from-name
- Template variables: `{{supplier_name}}`, `{{contact_name}}`, `{{merchant_store}}`, `{{niche}}`, `{{product_category}}`
- Starter template provided (4-step sequence for supplier acquisition outreach)
- Sequences are assigned to individual suppliers or bulk-assigned to filtered leads

**Reply Detection:**
- Background IMAP sync job polls connected email accounts on a configurable interval (default: every 30 minutes)
- Incoming emails matched to suppliers by comparing `From:` address to known supplier contact emails
- On match: sequence paused, supplier status updated, merchant notification sent (in-app banner + email)
- Matched emails stored in `SupplierEmail` table as INBOUND records

**Email Analytics:**
- Per-sequence stats: sent, open rate (via tracking pixel), reply rate
- Per-supplier email timeline
- Per-template performance comparison

---

### 7.5 Product Catalog Import

**CSV / Excel Import:**
- File upload (drag-and-drop, max 50MB)
- Parsed with SheetJS (handles XLS, XLSX, merged cells, multi-sheet workbooks)
- Column mapping UI (`react-spreadsheet-import`) — fuzzy matching to app field schema + manual override
- Field schema: `title`, `sku`, `cost_price`, `map_price`, `base_price`, `compare_at_price`, `description`, `weight`, `shipping_cost`, `upc`, `vendor`, `product_type`, `images_url`
- Variant detection: groups rows by shared product name/SKU prefix, detects variant axes (Size, Color, etc.)
- Validation step: shows errors (missing required fields, duplicate SKUs, invalid prices) before import
- Import job tracked in DB; merchant sees real-time progress

**Web Scraping Import:**
- Merchant provides a supplier catalog URL (or starting URL with pagination)
- Crawlee (CheerioCrawler for static HTML, PlaywrightCrawler for JS-rendered pages) extracts product data
- AI-assisted field extraction: Claude identifies which page elements map to which product fields
- Results presented in a review table before import — merchant can exclude individual rows
- Scrape session stored in DB (raw data preserved for re-processing)

**Post-Import:**
- All imported products created with `sync_status: never_synced` and `enrichment_status: not_started`
- Raw source data (`raw_title`, `raw_description`, `source_url`, `source_type`) preserved and never overwritten
- Merchant prompted to run enrichment on newly imported products

---

### 7.6 AI Product Content Generation

**Template Builder:**
- Visual section builder: add/remove/reorder sections
- Each section configures: HTML tag (H2, H3, H4, P, UL, OL, TABLE), display title, AI hint (guidance not written to output), required toggle, indent level
- Templates scoped per merchant; multiple templates supported
- Default starter template provided

**Enrichment:**
- Single product: queued immediately, runs within seconds
- Batch: queued as BullMQ job, processes with concurrency controlled by semaphore (DB connection safety)
- Claude prompt structure:
  - System prompt: brand voice adjectives + tone, forbidden words, few-shot example descriptions from merchant's onboarding, output JSON schema
  - User message: raw product data (title, specs, cost tier, category), sparse data flags, template section list with hints
- Two Claude calls when template is provided: one for HTML body (structured sections), one for JSON metadata (title, tags, SEO fields, attributes)
- All outputs land in staging fields: `ai_title`, `ai_description`, `ai_tags`, `ai_attributes`, `seo_title`, `seo_description`

**Review & Acceptance:**
- Merchant reviews staging fields on product detail page
- Per-field accept/reject (not all-or-nothing)
- Accepted fields promoted to main fields via `applyAiAcceptance()` service
- Rejected: staging fields cleared, enrichment status reset to `not_started`
- Bulk accept on enrichment review queue (list view of all products with pending AI suggestions)

**Metafield Writing:**
- On acceptance, structured content written to Shopify metafields via `metafieldsSet` GraphQL mutation
- Namespace: `custom.*` for merchant-visible fields (connectable in Shopify Theme Editor)
- Namespace: `$app:*` for internal app state (enrichment metadata, confidence scores)
- Theme App Extension renders metafield content as tabs/accordions in storefront (one-time install)

---

### 7.7 Price Monitoring & Management

**Price Monitoring:**
- Per-supplier monitoring configuration: target URL(s), CSS selectors for price elements, monitoring frequency (per tier: daily / every 4 hours / hourly)
- BullMQ repeatable job per monitored supplier per shop
- Crawlee scrapes target pages; price + stock status extracted
- Change detection: SHA-256 hash of extracted data compared to stored `PriceSnapshot`
- On change: new `PriceSnapshot` stored, `PricingAlert` created, merchant notified

**Pricing Rules:**
- Per-supplier rules with priority ordering
- Rule types: fixed markup (+ $X), percentage markup (X%), target margin (X%), fixed price
- Rules evaluated in priority order; first matching rule wins
- MAP enforcement: calculated price checked against product's `map_price`; if below MAP, alert is issued (never auto-applied below MAP)

**Alert Queue:**
- Pending alerts listed in Pricing section: product, old price, new price, % change, calculated new retail price, MAP check result
- Per-alert actions: approve (applies to Shopify), reject (keeps current price), set custom price
- Bulk approve (filtered by supplier, change direction, % threshold)

**Auto-Reprice:**
- Merchant enables auto-reprice per supplier with a configured rule set
- When enabled and the calculated new price passes MAP check: auto-applied without merchant action
- When calculated price would violate MAP: always queued as manual alert regardless of auto-reprice setting

---

### 7.8 Shopify Sync

- Products pushed via Shopify GraphQL Admin API (2025-01+)
- Images uploaded via `stagedUploadsCreate` → S3 direct upload → `productCreateMedia`
- Images resized/compressed with Sharp before upload (max 2048px, JPEG 85%)
- Sync hash stored to skip unchanged products
- Option mismatches handled: detect → delete Shopify product → recreate
- Webhook handlers for `products/update` and `products/delete` (verify HMAC, return 200, enqueue job)
- GDPR webhooks: `customers/data_request`, `customers/redact`, `shop/redact` (required for App Store)

---

## 8. Technology Stack

### Core Framework
| Technology | Version | Purpose |
|---|---|---|
| Remix (React Router v7) | Latest | Full-stack framework — loaders, actions, SSR |
| @shopify/shopify-app-remix | Latest | OAuth, session token validation, GraphQL client |
| @shopify/app-bridge | v4.x | Embedded app communication within Shopify Admin iframe |
| Shopify Polaris | Latest | UI component library (required for App Store) |

### Backend & Data
| Technology | Version | Purpose |
|---|---|---|
| PostgreSQL | 16+ | Primary database, all tables shop-scoped |
| Prisma | Latest | ORM, migrations, type-safe queries |
| Redis | 7+ | BullMQ job persistence, rate limit tracking, scrape state |
| BullMQ | Latest | Async job queue with repeatable jobs, retries, dead-letter |

### AI & Scraping
| Technology | Purpose |
|---|---|
| Anthropic Claude (claude-sonnet-4-6) | Product description generation, field extraction from scraped data |
| Crawlee | Web scraping engine (CheerioCrawler + PlaywrightCrawler) |
| ScraperAPI | Managed proxy layer for anti-bot protected supplier sites |
| Sharp | Server-side image resizing/compression before Shopify upload |

### Email
| Technology | Purpose |
|---|---|
| Google OAuth 2.0 | Gmail account connection (send + read) |
| Microsoft OAuth 2.0 | Outlook/M365 account connection (send + read) |
| Gmail API | Send emails, read inbox, poll for replies |
| Microsoft Graph API | Send emails, read inbox, poll for replies |
| Resend | Transactional app emails (alerts, notifications to merchant) |

### Import
| Technology | Purpose |
|---|---|
| SheetJS (xlsx) | Excel/CSV parsing (handles XLS, XLSX, merged cells) |
| react-spreadsheet-import | Column mapping UI component with fuzzy matching |
| Papa Parse | CSV-only fallback for clean structured files |

### Hosting & Deployment
| Technology | Purpose |
|---|---|
| Railway | Hosting — two processes: web (Remix) + worker (BullMQ) |
| Shopify CLI | Dev tunnel, extension management, deployment |

### Design System
| Technology | Purpose |
|---|---|
| Polaris | Foundation component library |
| DESIGN.md | Custom design system specification (colors, typography, elevation) |
| CSS custom properties | Theme tokens extending Polaris design tokens |

---

## 9. Security & Configuration

### Authentication
- **Shopify Token Exchange** (default for CLI-generated apps post-Feb 2024) — no legacy cookie sessions
- Every route calls `authenticate.admin(request)` — invalid sessions auto-redirect to OAuth
- Per-merchant OAuth tokens for Gmail/Outlook stored encrypted in DB
- HMAC verification on all incoming Shopify webhooks

### Multi-Tenancy Enforcement
- `shopDomain` column on every Prisma model — indexed
- All service-layer functions require `shopDomain` as a mandatory parameter
- Never pass a Prisma query without a `shopDomain` filter — enforced in code review
- Future: PostgreSQL RLS as defense-in-depth layer

### Environment Variables
```bash
# Shopify
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_APP_URL=

# Database
DATABASE_URL=                    # PostgreSQL connection string

# Redis
REDIS_URL=

# AI
ANTHROPIC_API_KEY=

# Email (app-level transactional)
RESEND_API_KEY=

# OAuth — Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OAuth — Microsoft
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Scraping
SCRAPER_API_KEY=                 # ScraperAPI key for anti-bot proxy

# App
APP_SECRET=                      # For encrypting stored OAuth tokens
NODE_ENV=
```

### Secrets Management
- Never log OAuth tokens, API keys, or `shopDomain`-scoped data
- Stored OAuth tokens encrypted at rest using `APP_SECRET`
- No secrets in source control — `.env` in `.gitignore`

### Shopify App Store Requirements
- GDPR webhook handlers implemented: `customers/data_request`, `customers/redact`, `shop/redact`
- Polaris component library used throughout (no competing UI library)
- App Bridge token exchange only (no legacy OAuth redirect flow)
- All billing via Shopify `appSubscriptionCreate` (no external payment collection)

---

## 10. Data Model (Key Models)

```prisma
model Shop {
  shopDomain    String   @id
  accessToken   String
  installedAt   DateTime
  plan          String?  // starter | growth | scale
  onboardingComplete Boolean @default(false)
  niches        String[] // merchant-configured product categories
  brandVoice    Json?    // tone adjectives, example descriptions, forbidden words
  createdAt     DateTime @default(now())
}

model Supplier {
  id              String   @id @default(uuid())
  shopDomain      String
  name            String
  websiteUrl      String?
  companyEmail    String?
  contacts        Json     @default("[]")  // array of {name, email, phone, role}
  status          SupplierStatus @default(LEAD)
  productCategories String[]
  scrapeConfig    Json?
  pricingConfig   Json?
  monitorEnabled  Boolean @default(false)
  monitorInterval Int     @default(1440)  // minutes
  notes           String?
  crmLog          Json    @default("[]")
  mapEnforced     Boolean @default(false)
  followUpDate    DateTime?
  approvedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum SupplierStatus {
  LEAD
  CONTACTED
  RESPONDED
  NEGOTIATING
  APPROVED
  REJECTED
  INACTIVE
}

model EmailSequence {
  id          String   @id @default(uuid())
  shopDomain  String
  name        String
  steps       Json     // array of {dayOffset, subject, body}
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model SequenceEnrollment {
  id              String   @id @default(uuid())
  shopDomain      String
  supplierId      String
  sequenceId      String
  currentStep     Int      @default(0)
  status          EnrollmentStatus @default(ACTIVE)
  pausedReason    String?
  nextSendAt      DateTime?
  createdAt       DateTime @default(now())
}

enum EnrollmentStatus {
  ACTIVE
  PAUSED
  COMPLETED
  STOPPED_BY_REPLY
}

model Product {
  id              String   @id @default(uuid())
  shopDomain      String
  supplierId      String?
  shopifyProductId String? @unique

  // Status
  status          ProductStatus @default(DRAFT)

  // Main fields (user-edited / accepted from AI)
  title           String?
  bodyHtml        String?
  vendor          String?
  productType     String?
  handle          String?
  tags            String[]

  // Raw source (never overwritten)
  rawTitle        String?
  rawDescription  String?
  sourceUrl       String?
  sourceType      SourceType?

  // AI staging
  aiTitle         String?
  aiDescription   String?
  aiTags          String[]
  aiAttributes    Json?
  seoTitle        String?
  seoDescription  String?

  // Enrichment
  enrichmentStatus EnrichmentStatus @default(NOT_STARTED)
  enrichmentModel  String?
  enrichmentAt     DateTime?
  appliedTemplateId String?

  // Pricing
  costPrice       Decimal?
  mapPrice        Decimal?
  basePrice       Decimal?
  compareAtPrice  Decimal?
  shippingCost    Decimal?

  // Shopify sync
  syncStatus      SyncStatus @default(NEVER_SYNCED)
  syncedAt        DateTime?
  shopifyHash     String?

  options         Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model DescriptionTemplate {
  id          String   @id @default(uuid())
  shopDomain  String
  name        String
  sections    Json     // [{tag, title, hint, required, indent}]
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model PriceSnapshot {
  id          String   @id @default(uuid())
  shopDomain  String
  supplierId  String
  productSku  String?
  sourceUrl   String
  price       Decimal?
  inStock     Boolean?
  dataHash    String
  capturedAt  DateTime @default(now())
}

model PricingAlert {
  id          String   @id @default(uuid())
  shopDomain  String
  productId   String
  oldPrice    Decimal
  newPrice    Decimal
  changePct   Decimal
  mapViolation Boolean @default(false)
  status      AlertStatus @default(PENDING)
  createdAt   DateTime @default(now())
}

enum AlertStatus {
  PENDING
  APPROVED
  REJECTED
  AUTO_APPLIED
}

model StoreSettings {
  shopDomain          String   @id
  defaultMarkupPct    Decimal  @default(40)
  defaultShippingCost Decimal  @default(0)
  mapHardBlock        Boolean  @default(false)
  lowStockThreshold   Int      @default(5)
  googleOAuthToken    String?  // encrypted
  microsoftOAuthToken String?  // encrypted
  emailFromAddress    String?
  discoverySchedule   String?  // cron expression
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

---

## 11. Billing

### Tiers

| Feature | Starter $79/mo | Growth $149/mo | Scale $299/mo |
|---|---|---|---|
| Suppliers tracked | 10 | 50 | Unlimited |
| Products synced | 250 | 1,000 | Unlimited |
| AI description credits/mo | 50 | 250 | 1,000 |
| Cold email sends/mo | 500 | 2,500 | Unlimited |
| Active email sequences | 1 | 5 | Unlimited |
| Catalog import | CSV/Excel only | + web scraping | + scheduled auto-scrape |
| Price monitoring | Daily | Every 4 hours | Hourly |
| Supplier discovery | Manual search | + saved searches | + automated alerts |

- **Overage:** AI credits above tier limit billed at $0.10/credit via usage-based line item (capped at $50/cycle)
- **Annual billing:** 20% discount via `appSubscriptionCreate` discount field
- **Free trial:** 14 days on all tiers
- **API:** Shopify `appSubscriptionCreate` GraphQL mutation (flat + usage hybrid)
- **Revenue share:** 0% on first $1M cumulative (from Jan 1, 2025), 15% + 2.9% processing above

---

## 12. Success Criteria

### MVP Success Definition
A merchant can install the app, complete onboarding, discover a supplier lead, send a cold outreach email sequence, receive a reply (auto-detected), import a product catalog from a file or website, generate AI product descriptions using their brand template, review and accept the suggestions, sync the products to Shopify with correct metafield content, and monitor the supplier's pricing — all without leaving Shopify Admin.

### Functional Requirements
- ✅ Onboarding wizard completes in under 10 minutes for a new merchant
- ✅ CSV/Excel import handles files up to 50MB and 5,000 rows without timeout
- ✅ Column mapping correctly auto-maps at least 70% of columns on a typical supplier sheet
- ✅ AI enrichment generates a complete description for a single product in under 30 seconds
- ✅ Batch enrichment processes 100 products in under 10 minutes
- ✅ Reply detection triggers within 30 minutes of a supplier reply arriving
- ✅ Price monitoring detects a price change within the tier's defined monitoring interval
- ✅ Shopify sync completes for a 250-product catalog within 5 minutes
- ✅ All webhook handlers return HTTP 200 within 5 seconds
- ✅ No cross-tenant data leakage (every query scoped by shopDomain)

### Quality Indicators
- App Store review rating ≥ 4.5 stars within 90 days of launch
- 14-day trial to paid conversion rate ≥ 20%
- Time-to-first-product-synced ≤ 30 minutes from install
- Zero critical security incidents (cross-tenant data access, credential exposure)

---

## 13. Implementation Phases

### Phase 1 — Foundation & Onboarding (Weeks 1–3)
**Goal:** App installs, authenticates, and completes onboarding. Core data models in place.

- ✅ Shopify app scaffold (Remix + @shopify/shopify-app-remix)
- ✅ PostgreSQL schema + Prisma migrations (all core models)
- ✅ BullMQ + Redis worker infrastructure
- ✅ DESIGN.md brand system + Polaris custom theme tokens
- ✅ Onboarding wizard (5 steps: niche, brand voice, template, email OAuth, pricing defaults)
- ✅ Gmail + Outlook OAuth connection flow
- ✅ Settings page (store config, email account management)
- ✅ Shopify billing integration (3 tiers + trial)
- ✅ GDPR webhooks
- ✅ `/design-brand` command run and DESIGN.md committed

**Validation:** Fresh install → complete onboarding → connected email account → billing plan selected.

---

### Phase 2 — Supplier CRM & Outreach (Weeks 4–6)
**Goal:** Full supplier pipeline and email outreach working end to end.

- ✅ Supplier list page (filterable by status, category)
- ✅ Supplier detail page (contacts, notes, documents, checklist)
- ✅ Pipeline status management + automatic transitions
- ✅ Supplier discovery (on-demand + scheduled BullMQ job)
- ✅ Email sequence builder (steps, templates, variables)
- ✅ Sequence enrollment per supplier + bulk enrollment
- ✅ IMAP reply detection worker (polls connected accounts)
- ✅ Auto-pause sequences on reply + status update + merchant notification
- ✅ Email thread view per supplier
- ✅ Bulk email to multiple leads

**Validation:** Discover a lead → add to pipeline → enroll in sequence → mock reply → verify sequence stops and status updates.

---

### Phase 3 — Product Import & AI Enrichment (Weeks 7–10)
**Goal:** Full catalog import and AI description generation working end to end.

- ✅ CSV/Excel import with SheetJS + react-spreadsheet-import column mapper
- ✅ Supplier website scraping import (Crawlee)
- ✅ Import job tracking UI with real-time progress
- ✅ Product list page (filters: status, sync_status, enrichment_status, supplier)
- ✅ Product detail page (all fields, variant editor, image manager)
- ✅ Description template builder
- ✅ AI enrichment (single + batch) with Claude
- ✅ AI staging field review + accept/reject UI
- ✅ Metafield writing via `metafieldsSet` on acceptance
- ✅ Theme App Extension (tabs/accordion Liquid block)
- ✅ Shopify product sync (create + update + image upload with Sharp)

**Validation:** Upload a real supplier CSV → map columns → import → run enrichment → accept AI suggestions → sync to Shopify → verify metafield content renders in storefront.

---

### Phase 4 — Pricing & Polish (Weeks 11–13)
**Goal:** Price monitoring, alert queue, and app-store-ready polish.

- ✅ Supplier website price monitoring (BullMQ repeatable jobs)
- ✅ Price change detection + PriceSnapshot storage
- ✅ Pricing rules builder (per-supplier, prioritized)
- ✅ Pricing alert queue (approve / reject / bulk approve)
- ✅ Auto-reprice (rules-based, MAP-gated)
- ✅ MAP violation alerts
- ✅ Price history view per product
- ✅ Audit log (all significant merchant actions)
- ✅ Error handling polish (Polaris banners, empty states, loading states)
- ✅ App Store listing preparation (screenshots, description, privacy policy)

**Validation:** Configure price monitoring → manually trigger a price change detection → verify alert created → approve alert → verify Shopify price updated → verify MAP guard blocks below-MAP update.

---

## 14. Future Considerations

- **XML / EDI / Supplier API Integrations** — Direct feed connections for major distributors
- **Supplier Self-Onboarding Portal** — Suppliers apply to work with merchants directly through the app
- **Reorder / Purchase Order Management** — Generate and track POs to suppliers
- **Multi-store Management** — Agency/operator view across multiple Shopify stores
- **Advanced Analytics** — Supplier performance, catalog health scores, margin dashboards
- **AI Image Sourcing** — Scrape supplier product images or generate AI placeholders with merchant approval gate
- **Faire / Alibaba API Integration** — Official platform partnerships for curated supplier discovery
- **PostgreSQL Row Level Security** — Defense-in-depth multi-tenant enforcement layer
- **SSE / WebSockets for Enrichment Progress** — Replace polling at scale (>50 concurrent active merchants)
- **Mobile-Optimized Layout** — Current target is desktop-first (Shopify Admin)

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Supplier website scraping blocked by anti-bot systems | High | Medium | ScraperAPI as managed proxy layer; Playwright for JS-rendered pages; graceful degradation (notify merchant, suggest manual import) |
| Gmail/Outlook OAuth token expiration causing silent email failures | Medium | High | Background token refresh job; in-app reconnect prompt when token is invalid; never fail silently on email operations |
| Cross-tenant data leak from missing shopDomain filter | Low | Critical | shopDomain required parameter enforced at service layer; code review gate on all Prisma queries; future RLS layer |
| Shopify App Store rejection for cold email feature | Medium | High | Cold email sends from merchant's own connected account (not app infrastructure); document CAN-SPAM compliance in app listing; consult Shopify partner support before submission |
| AI description quality inconsistency across sparse product data | Medium | Medium | Confidence scoring returned with every generation; sparse data flags in prompt; mandatory merchant review before acceptance; never auto-apply AI suggestions |

---

## 16. Appendix

### Reference Documents
| Document | Location |
|---|---|
| Tech Stack (CLAUDE.md) | `shopify_manager/CLAUDE.md` |
| Existing MVP Reference | `shopify_products/` |
| MVP Architecture Decisions | `shopify_products/.claude/architecture.md` |
| MVP Backend Models & Routes | `shopify_products/backend/CLAUDE.md` |
| Design System (to be created) | `shopify_manager/DESIGN.md` (run `/design-brand`) |

### Key External References
| Topic | URL |
|---|---|
| Shopify App Bridge | https://shopify.dev/docs/api/app-bridge-library |
| Shopify GraphQL Admin API | https://shopify.dev/docs/api/admin-graphql |
| Shopify Billing API | https://shopify.dev/docs/apps/launch/billing/subscription-billing |
| Shopify Metafields | https://shopify.dev/docs/apps/build/metafields |
| Shopify Theme App Extensions | https://shopify.dev/docs/apps/build/online-store/theme-app-extensions |
| Polaris Components | https://polaris.shopify.com/components |
| Remix Docs | https://reactrouter.com/start/framework/installation |
| Prisma Docs | https://www.prisma.io/docs |
| BullMQ Docs | https://docs.bullmq.io |
| Crawlee Docs | https://crawlee.dev/docs/introduction |
