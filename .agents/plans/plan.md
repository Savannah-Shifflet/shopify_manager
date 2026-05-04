# Feature: SourceDesk — Next Steps Implementation Plan

## Summary

Complete all remaining work across four phases: (1) close out PR #1 review findings and confirm
existing fixes, (2) implement the core email-and-supplier workflow so merchants can actually send
outreach and detect replies, (3) implement all five stubbed BullMQ job handlers plus the supporting
schema and services, and (4) wire up observability, audit trail, and the test foundation. Every
stub in the codebase has a detailed TODO comment that is the authoritative spec — this plan turns
those specs into atomic, independently-testable tasks.

## User Story

As an authorized reseller  
I want a fully operational SourceDesk workflow inside Shopify Admin  
So that I can send real outreach emails, detect supplier replies, import catalogs with AI
enrichment, monitor prices automatically, and trust that every action is tracked and tested

## Problem Statement

The following gaps remain after the scaffold + PR #1 review fixes:

**Phase 1 — Open review items:**
- `app/services/pricing.service.ts:116-123` — `applyPricingRule()` uses `parseFloat()` float
  arithmetic on monetary values; should use `Prisma.Decimal` to match the schema's Decimal fields
- `CLAUDE.md` env vars, commands, schema guidance, and key-files sections are out of sync with
  the current auth model and codebase state
- Minor stale comments in `ai-acceptance.service.ts`, `scrape.service.ts`, `sync.service.ts`

**Phase 2 — Email + supplier core (hard blockers for merchant workflow):**
- `email.service.ts:59` — `getValidAccessToken()` throws on expired tokens (refresh not implemented)
- `email-sync.job.ts:14` — entire IMAP poll pipeline is a TODO stub
- `app.suppliers.$id.tsx:65-82` — contacts, notes, and linked products are TODO placeholders
- `app.settings.tsx:32` — disconnect-email is a no-op (`void session`)
- No route handles `/track/open/:messageId` — `SupplierEmail.opened` is never set

**Phase 3 — Job pipeline and schema gaps:**
- `enrichment.job.ts:17`, `shopify-sync.job.ts:18`, `catalog-scrape.job.ts:15`,
  `price-monitor.job.ts:14`, `supplier-discovery.job.ts:19` — all five are TODO stubs
- `DescriptionTemplate` model does not exist — multi-template AI enrichment is unscheduled
- `AuditLog` model does not exist — no audit trail for any merchant action

**Phase 4 — Infrastructure and tests:**
- Sentry SDK in `package.json` but `Sentry.init()` is never called
- `AuditLog` writes not wired in any accept/reject/email action
- `vitest.config.ts` does not exist; zero test files in `app/`

## Solution Statement

Implement each gap as an atomic task in strict dependency order. Schema migrations before service
functions, service functions before routes and jobs, jobs before audit wiring, all code before
tests. Phases 2 and 3 contain parallel-safe tasks — annotated below for Archon to execute in
separate worktrees. No new architecture: every new file mirrors an existing counterpart.

## Metadata

| Field | Value |
|-------|-------|
| Type | ENHANCEMENT / BUG FIX / TEST FOUNDATION |
| Complexity | HIGH |
| Primary Systems Affected | pricing.service, email.service, email-sync.job, all 5 job handlers, prisma schema, 3 new routes, entry files, CLAUDE.md |
| Dependencies | All in package.json: `@prisma/client` (Decimal), `imapflow`, `@sentry/remix@^8`, `googleapis`, `@microsoft/microsoft-graph-client` |
| Estimated Tasks | 25 |

---

## Archon Execution Guide

Each phase is designed for Archon's isolated worktree model. Use the `/execute` skill to run
each phase. Tasks tagged `parallel_safe: true` within the same phase can be assigned to separate
Archon worktrees simultaneously — they touch different files with no import dependencies between
them. Tasks tagged `sequential` must complete before the next task starts.

```
Phase 1 → single sequential agent (fast, ~30 min)
Phase 2 → two parallel agents:
  Agent A: Tasks 4, 5, 8     (email-flow: token refresh + IMAP + tracking pixel)
  Agent B: Tasks 6, 7, 9     (supplier-ui: detail page + settings + comment cleanup)
Phase 3 → two parallel agents after Task 10 (schema) completes:
  Agent A: Tasks 11, 12, 13  (schema services + templates route)
  Agent B: Tasks 14, 15      (enrichment + shopify-sync jobs — highest priority)
  Agent C: Tasks 16, 17, 18  (catalog + price-monitor + discovery jobs)
Phase 4 → two parallel agents:
  Agent A: Tasks 19, 20      (Sentry init + audit wiring)
  Agent B: Tasks 21–25       (vitest config + first tests)
```

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Why Read This |
|----------|------|---------------|
| P0 | `app/services/email.service.ts` | Token refresh stub + send/record ordering |
| P0 | `app/email/imap.client.ts` | `fetchUnseenEmails()` signature and `ParsedEmail` type |
| P0 | `app/email/gmail.client.ts` | `sendGmailMessage()`, `refreshGoogleToken()` signatures |
| P0 | `app/email/outlook.client.ts` | `sendOutlookMessage()`, `refreshOutlookToken()` signatures |
| P0 | `app/jobs/email-sync.job.ts` | The stub to implement (pipeline comment is the spec) |
| P0 | `prisma/schema.prisma` | Exact model names, field types, Decimal vs String, before any new models |
| P0 | `app/jobs/queues.ts` | Queue names, payload interfaces, `DEFAULT_JOB_OPTIONS` |
| P1 | `app/services/sequence.service.ts` | Mirror for description-template.service.ts |
| P1 | `app/services/ai-acceptance.service.ts` | Where to add `logAction()` calls |
| P1 | `app/routes/app.suppliers.$id.tsx` | TODOs to fill in (contacts, notes, products, enrollment) |
| P1 | `app/routes/app.settings.tsx` | disconnect-email TODO |
| P1 | `app/utils/crypto.server.ts` | `encrypt()`/`decrypt()` signatures |
| P2 | `app/ai/prompts/enrichment.prompt.ts` | `buildSystemPrompt()`, `buildProductPrompt()` signatures |
| P2 | `app/ai/parsers/enrichment.parser.ts` | `AiEnrichmentOutputSchema` for response validation |
| P2 | `app/entry.server.tsx` | Where to add `Sentry.init()` |
| P2 | `app/entry.client.tsx` | Where to add Sentry browser init |
| P2 | `app/env.server.ts` | `SENTRY_DSN` already in schema; no env changes needed |

---

## Patterns to Mirror

**SERVICE_LAYER_PATTERN:**
```typescript
// SOURCE: app/services/sequence.service.ts
// shopDomain always first param; all queries include shopDomain in where clause
export async function listThings(shopDomain: string) {
  return db.thing.findMany({ where: { shopDomain }, orderBy: { createdAt: "asc" } });
}
```

**ROUTE_ACTION_PATTERN:**
```typescript
// SOURCE: app/routes/app.suppliers.$id.tsx:24-38
// Zod discriminatedUnion for multi-intent actions:
const ActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("update"), name: z.string().min(1) }),
  z.object({ intent: z.literal("add-note"), body: z.string().min(1) }),
]);
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const parsed = ActionSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return json({ errors: parsed.error.flatten() }, { status: 422 });
  // ...
}
```

**JOB_PROCESSOR_PATTERN:**
```typescript
// SOURCE: app/jobs/worker.ts:1-30
export async function processMyJob(job: Job<MyPayload>) {
  const { shopDomain } = job.data;
  console.info({ shopDomain }, "Starting my job");
  // ... implementation ...
  await job.updateProgress(100);
}
```

**PRISMA_MIGRATION_NAMING:**
```
// Command: npx prisma migrate dev --name add_description_template_and_audit_log
// Naming: YYYYMMDDHHMMSS_snake_case_description (auto-generated by CLI)
```

**DECIMAL_ARITHMETIC_PATTERN:**
```typescript
// SOURCE: Prisma.Decimal re-exports decimal.js — use for all monetary math
import { Prisma } from "@prisma/client";
const result = new Prisma.Decimal(costStr)
  .times(new Prisma.Decimal(1).plus(new Prisma.Decimal(markupPct).dividedBy(100)))
  .toDecimalPlaces(2);
return result.toString();
```

---

## Files to Change

| File | Action | Phase |
|------|--------|-------|
| `app/services/pricing.service.ts` | UPDATE — Decimal arithmetic | 1 |
| `CLAUDE.md` | UPDATE — docs alignment | 1 |
| `app/services/ai-acceptance.service.ts` | UPDATE — comment cleanup, later audit wiring | 1, 4 |
| `app/services/scrape.service.ts` | UPDATE — comment cleanup | 1 |
| `app/services/sync.service.ts` | UPDATE — comment cleanup | 1 |
| `app/services/email.service.ts` | UPDATE — token refresh + comment cleanup | 2 |
| `app/jobs/email-sync.job.ts` | UPDATE — IMAP poll pipeline | 2 |
| `app/routes/app.suppliers.$id.tsx` | UPDATE — contacts/notes/products/enrollment | 2 |
| `app/routes/app.settings.tsx` | UPDATE — disconnect-email action | 2 |
| `app/routes/track.open.$messageId.tsx` | CREATE — tracking pixel endpoint | 2 |
| `prisma/schema.prisma` | UPDATE — DescriptionTemplate + AuditLog | 3 |
| `prisma/migrations/` | CREATE via CLI | 3 |
| `app/services/description-template.service.ts` | CREATE | 3 |
| `app/services/audit.service.ts` | CREATE | 3 |
| `app/routes/app.templates.tsx` | CREATE | 3 |
| `app/jobs/enrichment.job.ts` | UPDATE — Claude AI pipeline | 3 |
| `app/jobs/shopify-sync.job.ts` | UPDATE — Shopify GraphQL push | 3 |
| `app/jobs/catalog-scrape.job.ts` | UPDATE — CSV/Excel + web scrape | 3 |
| `app/jobs/price-monitor.job.ts` | UPDATE — price detection | 3 |
| `app/jobs/supplier-discovery.job.ts` | UPDATE — B2B crawling | 3 |
| `app/entry.server.tsx` | UPDATE — Sentry.init() | 4 |
| `app/entry.client.tsx` | UPDATE — Sentry browser init | 4 |
| `vitest.config.ts` | CREATE | 4 |
| `app/__tests__/services/crypto.server.test.ts` | CREATE | 4 |
| `app/__tests__/services/pricing.service.test.ts` | CREATE | 4 |
| `app/__tests__/services/ai-acceptance.service.test.ts` | CREATE | 4 |
| `app/__tests__/services/import.service.test.ts` | CREATE | 4 |

---

## NOT Building (Scope Limits)

- **Theme App Extension** — requires `shopify app generate extension` CLI scaffolding in a separate run; noted as follow-on in Phase 4 completion notes
- **GDPR data deletion webhook** — `webhooks.tsx` TODO acknowledged; out of scope
- **Onboarding per-step logic** — `app.onboarding.tsx` TODO; out of scope
- **Dashboard real metrics** — `app._index.tsx` TODO; out of scope
- **Multiple EmailAccount per shop** — schema enforces `@unique`; multi-account is a future schema change
- **Annual billing discount** — `billing.service.ts` is already complete
- **Bulk Operations API** for initial catalog import — Phase 3 uses single-product GraphQL push; Bulk Ops is a Scale-tier follow-on

---

## Step-by-Step Tasks

Execute phases in order. Within each phase, tasks marked `[PARALLEL]` can run in separate
Archon worktrees simultaneously. Tasks marked `[SEQUENTIAL]` must complete before the next starts.

---

### PHASE 1: VERIFY + CLOSE REVIEW BLOCKERS

*Archon: single sequential agent. Fast pass — no new features, just correctness.*

---

#### Task 1: [SEQUENTIAL] Verify PR #1 review fixes pass static analysis

- **ACTION**: Run validation — no file edits
- **IMPLEMENT**: Confirm the four already-fixed items compile cleanly
- **COMMANDS**:
```bash
cd C:/Users/savan/projects/shopify_manager
npm run typecheck
npx prisma validate
npm run lint
```
- **EXPECT**: All three exit 0. If any fail, fix the reported error before proceeding.
- **VALIDATE**: CI green — `npm run typecheck && npx prisma validate && npm run lint`

---

#### Task 2: [SEQUENTIAL] UPDATE `app/services/pricing.service.ts` — Decimal arithmetic

- **ACTION**: UPDATE existing file
- **IMPLEMENT**: Replace `parseFloat()` float arithmetic in `applyPricingRule()` with
  `Prisma.Decimal` to match the schema's Decimal fields for `cost`, `msrp`, and `mapPrice`
- **READ FIRST**: `prisma/schema.prisma` — confirm `cost String` vs `Decimal?` storage type;
  read `app/services/pricing.service.ts:55-124` in full
- **CHANGE**: Replace `roundCurrency` helper and `applyPricingRule` (lines 55-124):
```typescript
import { Prisma } from "@prisma/client";

export function applyPricingRule(costStr: string, rule: PricingRule): string {
  const cost = new Prisma.Decimal(costStr);
  const value = new Prisma.Decimal(rule.markupValue);

  if (rule.markupType === "percentage") {
    const multiplier = new Prisma.Decimal(1).plus(value.dividedBy(100));
    return cost.times(multiplier).toDecimalPlaces(2).toString();
  }
  return cost.plus(value).toDecimalPlaces(2).toString();
}
```
- **GOTCHA**: Return type changes from `number` to `string`. Search for all callers of
  `applyPricingRule` (should only be in `price-monitor.job.ts`) and update them to accept `string`.
  The `suggestedPrice` field in `PriceAlert` is already `String?` — no schema change needed.
- **GOTCHA**: Remove the now-unused `roundCurrency` helper function entirely.
- **VALIDATE**: `npx tsc --noEmit`

---

#### Task 3: [SEQUENTIAL] UPDATE `CLAUDE.md` — documentation alignment

- **ACTION**: UPDATE existing file
- **IMPLEMENT**: Bring four sections back in sync with the current codebase state
- **READ FIRST**: `app/env.server.ts` (current env vars), `app/shopify.server.ts`
  (current auth strategy), `prisma/schema.prisma` (all current models)
- **SECTIONS TO UPDATE**:
  1. **Environment Variables** — verify `SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET`/
     `SHOPIFY_STORE_DOMAIN` match what `env.server.ts` validates; add `ENCRYPTION_KEY` entry
  2. **Commands** — add `./setup.sh` and `./start.sh` as the primary dev setup commands
  3. **Prisma Schema Patterns** — add note: "SQLite stores Decimal as String — always use
     `Prisma.Decimal` for arithmetic, never `parseFloat`"
  4. **Key Files** — add `app/utils/crypto.server.ts`, `app/env.server.ts` (validated env),
     `setup.sh`, `start.sh`
- **ALSO**: Fix misleading comments in three service files:
  - `app/services/ai-acceptance.service.ts` — stale comment referencing promotion that doesn't happen at DB level (promotion happens via Shopify sync job)
  - `app/services/scrape.service.ts` — any comment referencing unimplemented features as if done
  - `app/services/sync.service.ts` — any comment overstating sync capabilities
- **VALIDATE**: Read the updated CLAUDE.md sections aloud — do they match what `git grep` shows in the actual code?

---

### PHASE 2: EMAIL + SUPPLIER CORE

*Archon: two parallel agents after Phase 1 completes.*
*Agent A: Tasks 4, 5, 8 (email-flow agent)*
*Agent B: Tasks 6, 7, 9 (supplier-ui agent)*

---

#### Task 4: [PARALLEL — Agent A] UPDATE `app/services/email.service.ts` — token refresh

- **ACTION**: UPDATE existing file (replace lines 53-63)
- **IMPLEMENT**: Replace the `throw new Error("Token refresh not yet implemented")` stub with
  real provider-specific refresh logic
- **READ FIRST**: `app/email/gmail.client.ts` (`refreshGoogleToken()` signature),
  `app/email/outlook.client.ts` (`refreshOutlookToken()` signature),
  `app/utils/crypto.server.ts` (`encrypt()`/`decrypt()`)
- **CHANGE**: Replace `getValidAccessToken()` body (lines 53-63):
```typescript
export async function getValidAccessToken(shopDomain: string): Promise<string> {
  const account = await db.emailAccount.findUniqueOrThrow({ where: { shopDomain } });

  if (account.expiresAt < new Date()) {
    const decryptedRefresh = decrypt(account.refreshToken);
    let refreshed: { accessToken: string; refreshToken: string; expiresAt: Date };

    if (account.provider === "GMAIL") {
      const { refreshGoogleToken } = await import("~/email/gmail.client");
      refreshed = await refreshGoogleToken(decryptedRefresh);
    } else {
      const { refreshOutlookToken } = await import("~/email/outlook.client");
      refreshed = await refreshOutlookToken(decryptedRefresh);
    }

    await db.emailAccount.update({
      where: { shopDomain },
      data: {
        accessToken: encrypt(refreshed.accessToken),
        refreshToken: encrypt(refreshed.refreshToken),
        expiresAt: refreshed.expiresAt,
      },
    });

    return refreshed.accessToken;
  }

  return decrypt(account.accessToken);
}
```
- **GOTCHA**: If `refreshGoogleToken` does not exist in `gmail.client.ts`, implement it there
  first: `POST https://oauth2.googleapis.com/token` with `grant_type: refresh_token`. Same for
  `refreshOutlookToken` in `outlook.client.ts`: `POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`.
- **GOTCHA**: Dynamic `import()` avoids circular dependencies — do not convert to top-level import.
- **VALIDATE**: `npx tsc --noEmit`

---

#### Task 5: [PARALLEL — Agent A] UPDATE `app/jobs/email-sync.job.ts` — IMAP poll pipeline

- **ACTION**: UPDATE existing file (replace the TODO stub body)
- **IMPLEMENT**: Full IMAP poll using `fetchUnseenEmails` from `imap.client.ts`
- **READ FIRST**: `app/email/imap.client.ts` — `fetchUnseenEmails()` signature and `ParsedEmail` type,
  `app/services/sequence.service.ts` — `pauseSupplierSequence()` and `getActiveSequenceForSupplier()`
- **CONTENT** (replace entire file body):
```typescript
import type { Job } from "bullmq";
import type { EmailSyncPayload } from "./queues";
import db from "~/db.server";
import { decrypt } from "~/utils/crypto.server";
import { getValidAccessToken, recordReceivedEmail } from "~/services/email.service";
import { pauseSupplierSequence } from "~/services/sequence.service";
import { fetchUnseenEmails } from "~/email/imap.client";
import type { ImapProvider } from "~/email/imap.client";

export async function processEmailSync(job: Job<EmailSyncPayload>) {
  const { shopDomain } = job.data;
  console.info({ shopDomain }, "Starting email sync");

  const account = await db.emailAccount.findUnique({ where: { shopDomain } });
  if (!account) {
    console.info({ shopDomain }, "No email account connected, skipping");
    await job.updateProgress(100);
    return;
  }

  const accessToken = await getValidAccessToken(shopDomain);

  const suppliers = await db.supplier.findMany({
    where: { shopDomain },
    select: { id: true, status: true, contacts: true },
  });

  // Build O(1) lookup: email address → supplierId
  const emailToSupplier = new Map<string, string>();
  for (const supplier of suppliers) {
    const contacts = JSON.parse(supplier.contacts as string) as Array<{ email?: string }>;
    for (const contact of contacts) {
      if (contact.email) emailToSupplier.set(contact.email.toLowerCase(), supplier.id);
    }
  }

  const messages = await fetchUnseenEmails(account.provider as ImapProvider, account.email, accessToken);
  await job.updateProgress(50);

  let matched = 0;
  for (const message of messages) {
    const supplierId = emailToSupplier.get(message.from.toLowerCase());
    if (!supplierId) continue;

    if (message.messageId) {
      const existing = await db.supplierEmail.findFirst({
        where: { shopDomain, messageId: message.messageId },
      });
      if (existing) continue;
    }

    await recordReceivedEmail(shopDomain, supplierId, {
      subject: message.subject,
      body: message.body,
      receivedAt: message.receivedAt,
      messageId: message.messageId,
    });

    await pauseSupplierSequence(shopDomain, supplierId);

    const supplier = suppliers.find((s) => s.id === supplierId);
    if (supplier?.status === "CONTACTED") {
      await db.supplier.update({
        where: { id: supplierId, shopDomain },
        data: { status: "RESPONDED" },
      });
    }

    matched++;
  }

  console.info({ shopDomain, totalMessages: messages.length, matched }, "Email sync complete");
  await job.updateProgress(100);
}
```
- **GOTCHA**: `account.provider` is `"GMAIL"` or `"OUTLOOK"` — cast as `ImapProvider` directly.
- **GOTCHA**: Email matching is case-insensitive — use `.toLowerCase()` on both sides.
- **VALIDATE**: `npx tsc --noEmit`; manually enqueue: `emailSyncQueue.add("test", { shopDomain: "test.myshopify.com" })`

---

#### Task 6: [PARALLEL — Agent B] UPDATE `app/routes/app.suppliers.$id.tsx` — fill TODOs

- **ACTION**: UPDATE existing file (fill all TODO blocks)
- **IMPLEMENT**:
  1. Loader: also fetch linked products and available sequences
  2. Action: add `add-note` and `enroll-sequence` intents to the discriminated union
  3. Contacts card: render JSON array (name, email, phone, role)
  4. Notes card: render timestamps + add-note form
  5. Products card: DataTable with title, SKU, sync status badge
  6. Enrollment card: sequence picker + contact picker
- **READ FIRST**: Full file at `app/routes/app.suppliers.$id.tsx`,
  `app/services/sequence.service.ts` (`listSequences`, `enrollSupplierInSequence`)
- **LOADER changes**:
```typescript
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const [supplier, products, sequences] = await Promise.all([
    getSupplierById(session.shop, params.id!),
    db.product.findMany({ where: { shopDomain: session.shop, supplierId: params.id! }, take: 50 }),
    listSequences(session.shop),
  ]);
  if (!supplier) throw new Response("Not Found", { status: 404 });
  return json({ supplier, products, sequences });
}
```
- **ACTION schema changes** — extend the existing `ActionSchema` with two new intents:
```typescript
const ActionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("update"),
    name: z.string().min(1).max(200),
    website: z.string().url().optional().or(z.literal("")),
    status: z.enum(["LEAD","CONTACTED","RESPONDED","NEGOTIATING","APPROVED","REJECTED","INACTIVE"]),
  }),
  z.object({ intent: z.literal("add-note"), body: z.string().min(1) }),
  z.object({
    intent: z.literal("enroll-sequence"),
    sequenceId: z.string().cuid(),
    contactEmail: z.string().email(),
  }),
]);
```
- For `add-note`: parse `supplier.notes` JSON, append `{ body, createdAt: new Date().toISOString() }`, call `updateSupplier`
- For `enroll-sequence`: call `enrollSupplierInSequence(session.shop, params.id!, sequenceId)`
- **CONTACTS render**:
```typescript
{(JSON.parse(supplier.contacts as string) as Array<{name?:string;email?:string;phone?:string;role?:string}>)
  .map((c, i) => (
    <BlockStack key={i} gap="100">
      <Text as="p" variant="bodyMd" fontWeight="semibold">{c.name ?? "—"}</Text>
      <Text as="p" variant="bodySm" tone="subdued">{c.email ?? ""}{c.phone ? ` · ${c.phone}` : ""}</Text>
      {c.role && <Badge>{c.role}</Badge>}
    </BlockStack>
  ))}
```
- **NOTES render**: timestamped list + `<TextField multiline={3}>` add-note form with `intent="add-note"`
- **PRODUCTS render**: `<DataTable>` with columns Title, SKU, Sync Status (Badge)
- **ENROLLMENT render**: `<Select>` for sequence + `<Select>` for contact email, `intent="enroll-sequence"`
- **GOTCHA**: Import `Select`, `TextField` from `@shopify/polaris` — add to existing import line
- **GOTCHA**: Import `listSequences`, `enrollSupplierInSequence` from `~/services/sequence.service`
- **GOTCHA**: Import `db` from `~/db.server` for the products query in the loader
- **VALIDATE**: `npx tsc --noEmit` + visually verify supplier detail renders all four sections

---

#### Task 7: [PARALLEL — Agent B] UPDATE `app/routes/app.settings.tsx` — disconnect-email

- **ACTION**: UPDATE existing file (implement lines 29-35)
- **IMPLEMENT**: Replace `// TODO: revoke tokens and delete email account record` with real
  token revocation + DB record deletion
- **READ FIRST**: Full `app/routes/app.settings.tsx`, `app/email/gmail.client.ts`
  (check if `revokeGoogleToken` exists)
- **CHANGE** — replace the `void session` no-op block:
```typescript
if (intent === "disconnect-email") {
  const account = await getEmailAccount(session.shop);
  if (account) {
    try {
      if (account.provider === "GMAIL") {
        const { revokeGoogleToken } = await import("~/email/gmail.client");
        await revokeGoogleToken(decrypt(account.accessToken));
      }
      // Outlook tokens auto-expire; revocation is best-effort
    } catch (err) {
      console.warn({ shopDomain: session.shop, err }, "Token revocation failed (non-fatal)");
    }
    await deleteEmailAccount(session.shop);
  }
  return json({ success: true });
}
```
- **IMPORTS to add**: `import { deleteEmailAccount } from "~/services/email.service"` and
  `import { decrypt } from "~/utils/crypto.server"`
- **GOTCHA**: If `revokeGoogleToken` does not exist in `gmail.client.ts`, add it:
  `GET https://oauth2.googleapis.com/revoke?token=<token>`
- **VALIDATE**: `npx tsc --noEmit`

---

#### Task 8: [PARALLEL — Agent A] CREATE `app/routes/track.open.$messageId.tsx`

- **ACTION**: CREATE new file
- **IMPLEMENT**: Public route (no `authenticate.admin`), returns 1×1 transparent GIF,
  updates `SupplierEmail.opened` + `openedAt`
- **CONTENT**:
```typescript
import type { LoaderFunctionArgs } from "@remix-run/node";
import db from "~/db.server";

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function loader({ params }: LoaderFunctionArgs) {
  const { messageId } = params;

  if (messageId) {
    db.supplierEmail
      .updateMany({
        where: { id: messageId, opened: false },
        data: { opened: true, openedAt: new Date() },
      })
      .catch((err) => console.error({ messageId, err }, "Open tracking update failed"));
  }

  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
```
- **GOTCHA**: This route is PUBLIC — no `authenticate.admin()`. Email clients request it with
  no Shopify session token.
- **GOTCHA**: Use `updateMany` not `update` — silently no-ops on invalid or already-opened IDs.
- **GOTCHA**: The tracking pixel URL in `sendOutreachEmail` (email.service.ts) must use the
  `SupplierEmail.id` (the DB row primary key), not the provider's `messageId`. Update the
  `sendOutreachEmail` function to inject the pixel after `recordSentEmail` returns the new record ID:
```typescript
// After recordSentEmail, inject pixel into body and re-send... OR:
// Create the DB record first with a temp body, then update body with pixel URL
// The simplest approach: create the record first, get its ID, then inject pixel:
const emailRecord = await recordSentEmail(shopDomain, supplierId, { ...data });
const trackingBaseUrl = process.env.TRACKING_BASE_URL;
if (trackingBaseUrl) {
  const pixelUrl = `${trackingBaseUrl}/track/open/${emailRecord.id}`;
  // Re-send with pixel injected — or update the send call to accept a finalBody param
}
```
- **VALIDATE**: `curl http://localhost:PORT/track/open/fake-id` returns HTTP 200
  with `Content-Type: image/gif`

---

#### Task 9: [PARALLEL — Agent B] Cleanup stale comments

- **ACTION**: UPDATE three files — minor edits only, no behavior change
- **FILES**:
  - `app/services/ai-acceptance.service.ts` — The comment "Enqueue Shopify sync to push accepted
    content as metafields" is accurate; verify there are no other stale references suggesting
    DB-level field promotion happens here (it doesn't — promotion is handled by the sync job).
  - `app/services/scrape.service.ts` — Remove any comment implying Playwright/Cheerio scraping
    is production-ready when the job handlers are still stubs.
  - `app/services/sync.service.ts` — Remove any comment overstating what sync helpers do
    (they enqueue jobs; the jobs are the implementation).
- **VALIDATE**: `npm run lint` — no new lint errors

---

### PHASE 3: JOB PIPELINE + SCHEMA

*Archon: Task 10 runs first (sequential). Then three parallel agents for Tasks 11-18.*
*Agent A: Tasks 11, 12, 13 (schema services + templates route)*
*Agent B: Tasks 14, 15 (enrichment + shopify-sync — highest priority)*
*Agent C: Tasks 16, 17, 18 (catalog + price-monitor + discovery)*

---

#### Task 10: [SEQUENTIAL] UPDATE `prisma/schema.prisma` + run migrations

- **ACTION**: UPDATE schema, then run migrations
- **IMPLEMENT**: Add `DescriptionTemplate` and `AuditLog` models
- **CONTENT** — add after `MerchantConfig` model:
```prisma
model DescriptionTemplate {
  id          String   @id @default(cuid())
  shopDomain  String
  name        String
  sections    String   @default("[]") // JSON: { tag, title, hint, required }[]
  isDefault   Boolean  @default(false)
  productType String?  // null = global; set to product category for type-specific templates

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([shopDomain])
}

model AuditLog {
  id          String   @id @default(cuid())
  shopDomain  String
  action      String   // "email.sent" | "ai.accepted" | "ai.rejected" | "product.synced" | "price.approved"
  entityType  String   // "supplier" | "product" | "priceAlert" | "emailSequence"
  entityId    String
  metadata    String   @default("{}") // JSON: arbitrary context

  createdAt   DateTime @default(now())

  @@index([shopDomain])
  @@index([shopDomain, entityType, entityId])
}
```
- **COMMANDS**:
```bash
cd C:/Users/savan/projects/shopify_manager
npx prisma migrate dev --name add_description_template_and_audit_log
npx prisma generate
```
- **GOTCHA**: SQLite uses String for all JSON columns — never use `Json` type in SQLite schemas.
  Always `JSON.stringify()` on write, `JSON.parse()` on read.
- **GOTCHA**: Run from the repo root. A single migration picks up both new models — naming it
  `add_description_template_and_audit_log` is fine.
- **VALIDATE**: `npx prisma validate && npx prisma studio` shows both new tables

---

#### Task 11: [PARALLEL — Agent A] CREATE `app/services/description-template.service.ts`

- **ACTION**: CREATE new file
- **MIRROR**: `app/services/sequence.service.ts` — identical structure, swap model name
- **IMPLEMENT**: `listTemplates`, `getTemplateById`, `getDefaultTemplate`, `createTemplate`,
  `updateTemplate`, `deleteTemplate`
- **CONTENT**:
```typescript
import db from "~/db.server";

export async function listTemplates(shopDomain: string) {
  return db.descriptionTemplate.findMany({
    where: { shopDomain },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function getTemplateById(shopDomain: string, id: string) {
  return db.descriptionTemplate.findFirst({ where: { id, shopDomain } });
}

export async function getDefaultTemplate(shopDomain: string) {
  return db.descriptionTemplate.findFirst({ where: { shopDomain, isDefault: true } });
}

export async function createTemplate(
  shopDomain: string,
  data: {
    name: string;
    sections: Array<{ tag: string; title: string; hint: string; required: boolean }>;
    isDefault?: boolean;
    productType?: string;
  },
) {
  return db.descriptionTemplate.create({
    data: {
      shopDomain,
      name: data.name,
      sections: JSON.stringify(data.sections),
      isDefault: data.isDefault ?? false,
      productType: data.productType ?? null,
    },
  });
}

export async function updateTemplate(
  shopDomain: string,
  id: string,
  data: Partial<{ name: string; sections: string; isDefault: boolean; productType: string | null }>,
) {
  return db.descriptionTemplate.update({ where: { id, shopDomain }, data });
}

export async function deleteTemplate(shopDomain: string, id: string) {
  return db.descriptionTemplate.delete({ where: { id, shopDomain } });
}
```
- **GOTCHA**: `sections` is a JSON string in SQLite — always `JSON.stringify()` on write,
  `JSON.parse()` on read in the route.
- **VALIDATE**: `npx tsc --noEmit`

---

#### Task 12: [PARALLEL — Agent A] CREATE `app/services/audit.service.ts`

- **ACTION**: CREATE new file
- **IMPLEMENT**: `logAction()` (fire-and-forget, never throws) + `getAuditLog()`
- **CONTENT**:
```typescript
import db from "~/db.server";

export async function logAction(
  shopDomain: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        shopDomain,
        action,
        entityType,
        entityId,
        metadata: JSON.stringify(metadata),
      },
    });
  } catch (err) {
    console.error({ shopDomain, action, entityId, err }, "Audit log write failed");
  }
}

export async function getAuditLog(
  shopDomain: string,
  entityType: string,
  entityId: string,
  limit = 50,
) {
  return db.auditLog.findMany({
    where: { shopDomain, entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
```
- **GOTCHA**: The try/catch in `logAction` is intentional — audit failures MUST NOT propagate.
  Callers `await logAction(...)` without a catch.
- **VALIDATE**: `npx tsc --noEmit`

---

#### Task 13: [PARALLEL — Agent A] CREATE `app/routes/app.templates.tsx`

- **ACTION**: CREATE new file
- **MIRROR**: `app/routes/app.outreach.tsx` — DataTable + empty state pattern exactly
- **IMPLEMENT**: List templates, delete action, link to `/app/templates/new` for create
- **CONTENT**:
```typescript
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, Text, BlockStack, DataTable, Button, Badge } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { listTemplates, deleteTemplate } from "~/services/description-template.service";
import { z } from "zod";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const templates = await listTemplates(session.shop);
  return json({ templates });
}

const ActionSchema = z.object({ intent: z.enum(["delete"]), id: z.string().cuid() });

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const parsed = ActionSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return json({ errors: parsed.error.flatten() }, { status: 422 });
  await deleteTemplate(session.shop, parsed.data.id);
  return json({ success: true });
}

export default function Templates() {
  const { templates } = useLoaderData<typeof loader>();
  return (
    <Page
      title="Description Templates"
      primaryAction={{ content: "New Template", url: "/app/templates/new" }}
    >
      <Card>
        {templates.length === 0 ? (
          <BlockStack gap="300" inlineAlign="center">
            <Text as="p" variant="bodyMd" tone="subdued">
              No templates yet. Create one to guide AI enrichment.
            </Text>
            <Button url="/app/templates/new">Create Template</Button>
          </BlockStack>
        ) : (
          <DataTable
            columnContentTypes={["text", "text", "text", "text"]}
            headings={["Name", "Applies To", "Sections", "Default"]}
            rows={templates.map((t) => [
              t.name,
              t.productType ?? "All products",
              `${(JSON.parse(t.sections as string) as unknown[]).length} sections`,
              t.isDefault ? <Badge tone="success" key={t.id}>Default</Badge> : "—",
            ])}
          />
        )}
      </Card>
    </Page>
  );
}
```
- **GOTCHA**: `id` in ActionSchema uses `z.string().cuid()` — Prisma generates CUID IDs, not UUID.
- **VALIDATE**: Route accessible at `/app/templates` with empty state

---

#### Task 14: [PARALLEL — Agent B] UPDATE `app/jobs/enrichment.job.ts` — Claude AI pipeline

- **ACTION**: UPDATE existing file (replace TODO stub body)
- **IMPLEMENT**: Full enrichment pipeline per the TODO spec comment
- **READ FIRST**: `app/ai/prompts/enrichment.prompt.ts` (`buildSystemPrompt`, `buildProductPrompt`),
  `app/ai/parsers/enrichment.parser.ts` (`AiEnrichmentOutputSchema`),
  `app/services/supplier.service.ts` (`getMerchantConfig`, `updateProduct`)
- **CONTENT** (replace job body):
```typescript
import type { Job } from "bullmq";
import type { EnrichmentPayload } from "./queues";
import db from "~/db.server";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "~/env.server";
import { getMerchantConfig, updateProduct } from "~/services/supplier.service";
import { buildSystemPrompt, buildProductPrompt } from "~/ai/prompts/enrichment.prompt";
import { AiEnrichmentOutputSchema, extractJson } from "~/ai/parsers/enrichment.parser";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export async function processEnrichment(job: Job<EnrichmentPayload>) {
  const { shopDomain, productIds, priority } = job.data;
  const model = priority === "single" ? "claude-sonnet-4-5" : "claude-haiku-4-5-20251001";

  console.info({ shopDomain, count: productIds.length, model }, "Starting enrichment");

  const merchantConfig = await getMerchantConfig(shopDomain);

  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i];
    await updateProduct(shopDomain, productId, { enrichStatus: "RUNNING" });

    try {
      const product = await db.product.findFirstOrThrow({ where: { id: productId, shopDomain } });
      const systemPrompt = buildSystemPrompt(merchantConfig);
      const userPrompt = buildProductPrompt(product);

      const response = await anthropic.messages.create({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const rawText = response.content[0].type === "text" ? response.content[0].text : "";
      const parsed = AiEnrichmentOutputSchema.safeParse(JSON.parse(extractJson(rawText)));

      if (!parsed.success) {
        throw new Error(`AI output failed schema validation: ${parsed.error.message}`);
      }

      await updateProduct(shopDomain, productId, {
        aiTitle: parsed.data.title ?? null,
        aiDescription: parsed.data.description ?? null,
        aiTags: JSON.stringify(parsed.data.tags ?? []),
        aiAttributes: parsed.data.attributes ? JSON.stringify(parsed.data.attributes) : null,
        enrichStatus: "DONE",
      });

      // Log token usage for cost tracking
      console.info({
        shopDomain,
        productId,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model,
      }, "Enrichment token usage");

    } catch (err) {
      await updateProduct(shopDomain, productId, { enrichStatus: "FAILED" });
      console.error({ shopDomain, productId, err }, "Enrichment failed");
    }

    await job.updateProgress(Math.round(((i + 1) / productIds.length) * 100));
  }
}
```
- **GOTCHA**: `AiEnrichmentOutputSchema` must exist in `app/ai/parsers/enrichment.parser.ts`.
  If it doesn't, create it with Zod: `z.object({ title: z.string().optional(), description: z.string().optional(), tags: z.array(z.string()).optional(), attributes: z.record(z.string()).optional() })`
- **GOTCHA**: Never call the Anthropic API from a loader or action — only from this job.
- **VALIDATE**: `npx tsc --noEmit`; enqueue a test job and watch worker logs

---

#### Task 15: [PARALLEL — Agent B] UPDATE `app/jobs/shopify-sync.job.ts` — Shopify GraphQL push

- **ACTION**: UPDATE existing file (replace TODO stub body)
- **IMPLEMENT**: Single-product push for `mode: "push"` — create or update product + write metafields.
  Bulk Operations and image upload via `stagedUploadsCreate` are follow-on (noted in comments).
- **READ FIRST**: `app/services/metafield.service.ts` (`setMetafields`),
  `app/services/supplier.service.ts` (`updateProduct`, `getProductById`),
  `app/services/scrape.service.ts` (`computePayloadHash`),
  `app/shopify.server.ts` (how to get the `admin` GraphQL client from a job — see note below)
- **CRITICAL GOTCHA for jobs**: BullMQ jobs run in a separate process without a Remix request
  context — you cannot call `authenticate.admin(request)` from a job. Instead, jobs must use
  a stored session. Read `app/db.server.ts` and `shopify.server.ts` to understand how to create
  a `shopify.api.clients.Graphql` instance from a stored session token. Pattern:
```typescript
import { shopify } from "~/shopify.server";
const sessions = await shopify.sessionStorage.findSessionsByShop(shopDomain);
const session = sessions[0]; // use the most recent session
const client = new shopify.api.clients.Graphql({ session });
```
- **IMPLEMENT** (`mode: "push"`):
  1. Fetch product from DB
  2. Compute SHA-256 hash of payload (`computePayloadHash`)
  3. Skip if `syncHash` matches (no change)
  4. Update `syncStatus: "PENDING"`
  5. Determine if Shopify product exists (`shopifyId` null = create, non-null = update)
  6. Run `productCreate` or `productUpdate` GraphQL mutation
  7. Write metafields for `aiDescription` → `custom.description_html` and `aiAttributes` → `custom.attributes`
  8. Update `syncStatus: "SYNCED"`, `syncHash` to new hash
- **GOTCHA**: For `mode: "delete"`, find product by `shopifyId` and call `productDelete` mutation.
  Mark the local product with a `syncStatus: "FAILED"` or delete from DB depending on business rules.
- **VALIDATE**: `npx tsc --noEmit`; manually trigger `queueProductSync(shopDomain, productId)`
  and verify product appears in the Shopify dev store

---

#### Task 16: [PARALLEL — Agent C] UPDATE `app/jobs/catalog-scrape.job.ts` — CSV/Excel + web scrape

- **ACTION**: UPDATE existing file (replace both TODO stub sections)
- **IMPLEMENT**: Two sub-pipelines per the existing TODO comment:
  1. **File mode** (`mode: "file"`): retrieve file from temp storage, detect CSV/Excel,
     parse with `csv-parse` or `xlsx`, run column mapping via `detectColumnMapping()`,
     create `Product` records with `rawSource` preserved
  2. **URL mode** (`mode: "url"`): check Redis scrape cache, run PlaywrightCrawler or
     CheerioCrawler via `shouldUseBrowser()` heuristic, extract product data, create records
- **READ FIRST**: `app/services/import.service.ts` (`detectColumnMapping`, `queueFileImport`,
  `queueUrlScrape`), `app/services/scrape.service.ts` (`shouldUseBrowser`, `getCachedScrape`,
  `cacheScrape`)
- **GOTCHA**: `rawSource` must preserve the original import data exactly — never mutate it.
- **GOTCHA**: Use `csv-parse` streaming API for large files to avoid memory spikes.
- **GOTCHA**: Never embed Playwright page handles in job payloads — serialize extracted data as plain JSON.
- **VALIDATE**: `npx tsc --noEmit`; test with a small CSV import end-to-end

---

#### Task 17: [PARALLEL — Agent C] UPDATE `app/jobs/price-monitor.job.ts` — price detection

- **ACTION**: UPDATE existing file (replace TODO stub body)
- **IMPLEMENT**: Price monitoring pipeline per the TODO spec:
  1. Fetch `PriceMonitorConfig` for `supplierId`
  2. Check Redis scrape cache (24h TTL)
  3. Scrape current prices via `CheerioCrawler` (preferred for speed)
  4. Compare with DB product prices via hash comparison
  5. For each changed product: create `PriceHistory`, compute suggested price via
     `fetchApplicableRule` + `applyPricingRule`, check MAP enforcement, create `PriceAlert`
  6. If `autoApply` rule: enqueue `shopify-sync` job
  7. Update `lastScrapedAt` on `PriceMonitorConfig`
- **READ FIRST**: `app/services/pricing.service.ts` (all functions),
  `app/services/scrape.service.ts` (`computePayloadHash`),
  `app/services/sync.service.ts` (`queueProductSync`)
- **GOTCHA**: `applyPricingRule` now returns `string` (after Task 2) — use directly as
  `suggestedPrice` in `createPriceAlert`.
- **VALIDATE**: `npx tsc --noEmit`

---

#### Task 18: [PARALLEL — Agent C] UPDATE `app/jobs/supplier-discovery.job.ts` — B2B crawling

- **ACTION**: UPDATE existing file (replace TODO stub body)
- **IMPLEMENT**: Discovery pipeline per the TODO spec:
  1. Build search queries from `MerchantConfig.niche` + keywords
  2. Run `CheerioCrawler` against B2B directories (Thomas Net pattern)
  3. Run `PlaywrightCrawler` for JS-rendered "become a dealer" pages
  4. Parse results: extract name, website, contact info, categories
  5. Deduplicate against existing `Supplier` records by website domain
  6. Create `LEAD` records for new suppliers
  7. Notify merchant if `triggeredBy === "schedule"` and new leads found (log only for now)
- **READ FIRST**: `app/services/supplier.service.ts` (`listSuppliers`, `createSupplier`),
  `app/services/scrape.service.ts` (`shouldUseBrowser`)
- **GOTCHA**: Deduplicate by extracting root domain from URLs (strip `www.`, `https://`, path).
  Use a simple `new URL(website).hostname.replace(/^www\./, "")` comparison.
- **VALIDATE**: `npx tsc --noEmit`

---

### PHASE 4: INFRASTRUCTURE + TESTS

*Archon: two parallel agents.*
*Agent A: Tasks 19, 20 (Sentry init + audit wiring)*
*Agent B: Tasks 21–25 (vitest config + first tests)*

---

#### Task 19: [PARALLEL — Agent A] UPDATE entry files — Sentry initialization

- **ACTION**: UPDATE `app/entry.server.tsx` and `app/entry.client.tsx`
- **READ FIRST**: Both files in full before editing
- **CHANGES to `entry.server.tsx`** — add near top:
```typescript
import * as Sentry from "@sentry/remix";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  });
}

export function handleError(error: unknown, { request }: { request: Request }) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureRemixServerException(error, "remix.server", request);
  }
  console.error(error);
}
```
- **CHANGES to `entry.client.tsx`** — add near top:
```typescript
import * as Sentry from "@sentry/remix";
import { useEffect } from "react";

const sentryDsn = typeof window !== "undefined"
  ? (window as unknown as { ENV?: { SENTRY_DSN?: string } }).ENV?.SENTRY_DSN
  : undefined;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
  });
}
```
- **GOTCHA**: Always guard with `if (process.env.SENTRY_DSN)` — must be a no-op when unset.
- **GOTCHA**: Client-side Sentry requires exposing `SENTRY_DSN` via `window.ENV`. Check if
  `app/root.tsx` already returns `{ ENV: { SENTRY_DSN: process.env.SENTRY_DSN } }` from its
  loader. If not, add it and add a `<script>window.ENV = {loaderData.ENV}</script>` tag.
- **VALIDATE**: `npx tsc --noEmit` — no type errors on Sentry imports

---

#### Task 20: [PARALLEL — Agent A] Wire `logAction()` at key user actions

- **ACTION**: UPDATE `app/services/ai-acceptance.service.ts` and `app/services/email.service.ts`
- **IMPLEMENT**: Add `logAction()` calls after each audit-worthy event
- **READ FIRST**: `app/services/audit.service.ts` (just created in Task 12)
- **In `ai-acceptance.service.ts`** — after `updateProduct` in `applyAiAcceptance`:
```typescript
import { logAction } from "~/services/audit.service";
// after await updateProduct(...):
await logAction(shopDomain, "ai.accepted", "product", productId);
```
- **In `rejectAiContent`** — after `updateProduct`:
```typescript
await logAction(shopDomain, "ai.rejected", "product", productId);
```
- **In `email.service.ts` `sendOutreachEmail`** — after `recordSentEmail`:
```typescript
await logAction(shopDomain, "email.sent", "supplier", supplierId, { to: primaryContact.email });
```
- **GOTCHA**: `logAction()` swallows its own errors — just `await` it, no try/catch needed.
- **VALIDATE**: `npx tsc --noEmit`; accept AI on a product → query AuditLog via Prisma Studio

---

#### Task 21: [PARALLEL — Agent B] CREATE `vitest.config.ts`

- **ACTION**: CREATE new file at repo root
- **CONTENT**:
```typescript
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["app/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["app/services/**", "app/utils/**", "app/ai/**"],
    },
  },
});
```
- **GOTCHA**: `vite-tsconfig-paths` must be in `devDependencies` — check `package.json`.
  If missing: `npm install -D vite-tsconfig-paths`
- **GOTCHA**: Verify `vitest` itself is in `devDependencies`. If missing: `npm install -D vitest`
- **VALIDATE**: `npx vitest --run` exits 0 (even with no test files, it should not error)

---

#### Task 22: [PARALLEL — Agent B] CREATE `app/__tests__/services/crypto.server.test.ts`

- **ACTION**: CREATE new file
- **READ FIRST**: `app/utils/crypto.server.ts` — `encrypt()` and `decrypt()` signatures
- **CONTENT**:
```typescript
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  // crypto.server.ts reads ENCRYPTION_KEY at module load time
  process.env.ENCRYPTION_KEY = "a".repeat(32);
});

describe("crypto.server", () => {
  it("round-trips a string through encrypt/decrypt", async () => {
    const { encrypt, decrypt } = await import("~/utils/crypto.server");
    const original = "test-access-token-12345";
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(decrypt(encrypted)).toBe(original);
  });

  it("produces different ciphertext for identical plaintext (IV randomization)", async () => {
    const { encrypt } = await import("~/utils/crypto.server");
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a).not.toBe(b);
  });
});
```
- **VALIDATE**: `npx vitest --run app/__tests__/services/crypto.server.test.ts` — 2 tests pass

---

#### Task 23: [PARALLEL — Agent B] CREATE `app/__tests__/services/pricing.service.test.ts`

- **ACTION**: CREATE new file
- **READ FIRST**: `app/services/pricing.service.ts` — `applyPricingRule()` signature after Task 2
- **CONTENT**:
```typescript
import { describe, it, expect } from "vitest";
import { applyPricingRule } from "~/services/pricing.service";
import type { PricingRule } from "@prisma/client";

const makeRule = (type: "percentage" | "fixed", value: string): PricingRule => ({
  id: "test-id",
  shopDomain: "test.myshopify.com",
  name: "Test Rule",
  supplierId: null,
  markupType: type,
  markupValue: value,
  priority: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("applyPricingRule", () => {
  it("applies percentage markup correctly", () => {
    expect(applyPricingRule("100.00", makeRule("percentage", "20"))).toBe("120.00");
  });

  it("applies fixed markup correctly", () => {
    expect(applyPricingRule("99.99", makeRule("fixed", "10.01"))).toBe("110.00");
  });

  it("handles high-ticket items without float drift", () => {
    // $4999.99 + 15% = $5749.9885 → rounds to $5749.99
    expect(applyPricingRule("4999.99", makeRule("percentage", "15"))).toBe("5749.99");
  });

  it("rounds to exactly 2 decimal places", () => {
    const result = applyPricingRule("33.33", makeRule("percentage", "10"));
    expect(result.split(".")[1].length).toBe(2);
  });
});
```
- **VALIDATE**: `npx vitest --run app/__tests__/services/pricing.service.test.ts` — 4 tests pass

---

#### Task 24: [PARALLEL — Agent B] CREATE `app/__tests__/services/ai-acceptance.service.test.ts`

- **ACTION**: CREATE new file
- **READ FIRST**: `app/services/ai-acceptance.service.ts` — `applyAiAcceptance`, `rejectAiContent`,
  `ACCEPTANCE_MAP`. Also `app/db.server.ts` for the Prisma singleton pattern.
- **IMPLEMENT**: Test the state transitions and ACCEPTANCE_MAP shape — mock Prisma and BullMQ
  queue so tests run without a real DB or Redis
- **CONTENT**:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db and queue before importing the service
vi.mock("~/db.server", () => ({
  default: {
    product: {
      findFirstOrThrow: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("~/jobs/queues", () => ({
  shopifySyncQueue: { add: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("~/services/supplier.service", () => ({
  updateProduct: vi.fn().mockResolvedValue(undefined),
}));

import db from "~/db.server";
import { updateProduct } from "~/services/supplier.service";
import { shopifySyncQueue } from "~/jobs/queues";
import { applyAiAcceptance, rejectAiContent, ACCEPTANCE_MAP } from "~/services/ai-acceptance.service";

describe("ACCEPTANCE_MAP", () => {
  it("maps aiTitle to Shopify title field", () => {
    expect(ACCEPTANCE_MAP.aiTitle.shopifyField).toBe("title");
  });
  it("maps aiDescription to a metafield (not body_html)", () => {
    expect(ACCEPTANCE_MAP.aiDescription.shopifyField).toBeNull();
    expect(ACCEPTANCE_MAP.aiDescription.metafield.key).toBe("description_html");
  });
});

describe("applyAiAcceptance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks product OUT_OF_SYNC and enqueues sync job", async () => {
    (db.product.findFirstOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
    await applyAiAcceptance("shop.myshopify.com", "p1");
    expect(updateProduct).toHaveBeenCalledWith("shop.myshopify.com", "p1", {
      syncStatus: "OUT_OF_SYNC",
    });
    expect(shopifySyncQueue.add).toHaveBeenCalled();
  });
});

describe("rejectAiContent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears AI staging fields and resets enrichStatus", async () => {
    await rejectAiContent("shop.myshopify.com", "p1");
    expect(updateProduct).toHaveBeenCalledWith("shop.myshopify.com", "p1", expect.objectContaining({
      aiTitle: null,
      aiDescription: null,
      enrichStatus: "NOT_STARTED",
    }));
  });
});
```
- **GOTCHA**: This is the ONE place where mocking is acceptable — `applyAiAcceptance` and
  `rejectAiContent` have no complex internal logic to test; the contract being tested is the
  state transition, not DB internals.
- **VALIDATE**: `npx vitest --run app/__tests__/services/ai-acceptance.service.test.ts`

---

#### Task 25: [PARALLEL — Agent B] CREATE `app/__tests__/services/import.service.test.ts`

- **ACTION**: CREATE new file
- **READ FIRST**: `app/services/import.service.ts` — `detectColumnMapping()` (pure logic, no DB)
- **CONTENT**:
```typescript
import { describe, it, expect } from "vitest";
import { detectColumnMapping } from "~/services/import.service";

describe("detectColumnMapping", () => {
  it("maps exact field name 'title' to product title", () => {
    const result = detectColumnMapping(["title", "sku", "cost"]);
    expect(result.title).toBe("title");
    expect(result.sku).toBe("sku");
  });

  it("maps common alias 'product_name' to title", () => {
    const result = detectColumnMapping(["product_name", "item_code", "price"]);
    expect(result.title).toBe("product_name");
  });

  it("returns null for unrecognized headers", () => {
    const result = detectColumnMapping(["xzy_col_1", "abc_col_2"]);
    expect(result.title).toBeNull();
    expect(result.sku).toBeNull();
  });
});
```
- **VALIDATE**: `npx vitest --run app/__tests__/services/import.service.test.ts`

---

## Testing Strategy

### Manual Verification Flows (performed after each phase)

| Flow | Steps | Validates Phase |
|------|-------|-----------------|
| TypeScript compiles | `npx tsc --noEmit` | All phases |
| Pricing round-trip | `npx vitest --run pricing` | 1 |
| Token refresh | Let access token expire → trigger send → verify new token written to DB | 2 |
| Email send | Connect Gmail → send outreach to a real inbox | 2 |
| Open tracking | Load pixel URL from sent email → `SupplierEmail.opened = true` in DB | 2 |
| Reply detection | Reply to outreach → wait for email-sync job → `SupplierSequence.status = paused` | 2 |
| Supplier detail | Open supplier with 2+ contacts → verify all four cards render | 2 |
| AI enrichment | Queue a single product enrichment → `enrichStatus: DONE`, `aiTitle` populated | 3 |
| Shopify sync | Accept AI content → Shopify product title updated, metafields written | 3 |
| Template CRUD | Create template → set as default → verify enrichment picks it up | 3 |
| Sentry capture | Throw test error in a loader → verify in Sentry dashboard | 4 |
| Audit log | Accept AI → query AuditLog via Prisma Studio → row with `action: ai.accepted` | 4 |
| Test suite | `npm run test` → all tests pass | 4 |

### Edge Cases Checklist

- [ ] Supplier with no contacts: `sendOutreachEmail` throws `"No email contact found"` — UI Banner
- [ ] Expired OAuth token: `getValidAccessToken` refreshes silently; if refresh fails, throws clearly
- [ ] Email sync with no EmailAccount: job exits early after log message
- [ ] Open tracking with invalid messageId: returns 200 GIF, no DB write (`updateMany` is safe)
- [ ] `applyPricingRule` with zero cost: `Decimal("0").times(...)` returns `"0.00"` correctly
- [ ] `DescriptionTemplate` delete of default: enrichment falls back to `MerchantConfig.contentTemplate`
- [ ] `SENTRY_DSN` unset: all `Sentry.init()` calls are guarded, no crashes

---

## Validation Commands

### Level 1: STATIC ANALYSIS (run after every task)
```bash
npm run typecheck
npm run lint
```
**EXPECT**: Exit 0, no errors

### Level 2: PRISMA (run after Task 10)
```bash
npx prisma validate
npx prisma generate
```
**EXPECT**: Exit 0 on both

### Level 3: BUILD (run after Phase 3 completes)
```bash
npm run build
```
**EXPECT**: Exit 0, Remix build succeeds

### Level 4: TESTS (run after Phase 4 completes)
```bash
npm run test
```
**EXPECT**: All tests pass, exit 0

---

## Acceptance Criteria

- [ ] `npm run typecheck` exits 0 — zero type errors
- [ ] `npm run lint` exits 0 — no lint violations
- [ ] `npm run build` exits 0 — Remix build clean
- [ ] `npm run test` exits 0 — all tests pass
- [ ] `npx prisma validate` exits 0 — schema integrity
- [ ] `applyPricingRule("100", 20% rule)` returns `"120.00"` (not `120.0000001`)
- [ ] Email sent via outreach actually delivers to the recipient's inbox
- [ ] Sent email body contains `<img>` tracking pixel pointing to `/track/open/:id`
- [ ] `GET /track/open/:id` returns `Content-Type: image/gif` and sets `SupplierEmail.opened = true`
- [ ] Supplier replies detected by email-sync job within one polling cycle
- [ ] Supplier detail page renders contacts, notes, linked products — no empty TODO cards
- [ ] Sequence enrollment creates a `SupplierSequence` record
- [ ] `enrichment.job.ts` completes without error; `aiTitle` populated on test product
- [ ] `shopify-sync.job.ts` pushes accepted AI content to Shopify as metafields
- [ ] `DescriptionTemplate` table exists with CRUD at `/app/templates`
- [ ] `AuditLog` table exists; `ai.accepted`, `ai.rejected`, `email.sent` rows written on actions
- [ ] Sentry initializes (or skips gracefully when `SENTRY_DSN` unset)
- [ ] Test suite has ≥ 10 passing tests across 4 test files

---

## Completion Checklist

- [ ] Phase 1 complete: Task 1 (verify), Task 2 (Decimal), Task 3 (CLAUDE.md)
- [ ] Phase 2 complete: Tasks 4–9 (email + supplier core)
- [ ] Phase 3 complete: Task 10 (schema), Tasks 11–18 (services, routes, jobs)
- [ ] Phase 4 complete: Tasks 19–25 (Sentry, audit, vitest, tests)
- [ ] All Level 1–4 validation commands pass
- [ ] Manual verification flows completed

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `shopify-sync.job.ts` requires admin API client from job context (no request object) | High | High | Read `shopify.server.ts` session storage pattern before implementing; use `shopify.sessionStorage.findSessionsByShop()` |
| `refreshGoogleToken`/`refreshOutlookToken` may not exist in email clients | Medium | High | Read both client files before Task 4; implement missing refresh functions in the client files, not in email.service.ts |
| `Prisma.Decimal` return type change in `applyPricingRule` breaks callers | Medium | Medium | Grep for all callers before Task 2; update them in the same commit |
| IMAP XOAUTH2 behavior differs between Gmail and Outlook via imapflow | Medium | Medium | Test with real Gmail first; Outlook XOAUTH2 uses Graph API token — verify `ImapProvider` handling in `imap.client.ts` |
| Phase 3 Agent B (enrichment + sync jobs) is the largest implementation — may exceed single Archon run | Medium | Medium | Split if needed: Task 14 first run, Task 15 second run |
| `vitest` and `vite-tsconfig-paths` may not be in `devDependencies` | Low | Low | Check `package.json` before Task 21; install if missing |
| SQLite Decimal stored as String — arithmetic comparisons in tests may need `.toString()` | Low | Low | Use `.toBe("120.00")` string assertions, not numeric equality, in pricing tests |

---

## Notes

**Dependency order rationale:**
Phase 1 (no new files) → Phase 2 (email + supplier, independent of schema) → Phase 3 starts
with schema (Task 10) because `DescriptionTemplate` and `AuditLog` types must be generated
before services can reference them. Tasks 11-18 are independent of each other but all depend on
Task 10. Phase 4 (audit wiring in Task 20) depends on Task 12 (audit.service.ts) from Phase 3.

**Why `shopify-sync.job.ts` is in Phase 3 and not Phase 2:**
`applyAiAcceptance()` already enqueues a sync job correctly — the queue is wired. The merchant
can accept AI content in Phase 2 and the job will sit in the queue until Phase 3 implements
the handler. This is safe: BullMQ retries on failure with exponential backoff.

**Multi-template enrichment integration:**
After Task 11, update `app/services/enrichment.service.ts` to call `getDefaultTemplate(shopDomain)`
first, fall back to `MerchantConfig.contentTemplate` if no DescriptionTemplate exists. This is
a one-line change in the enrichment service and is not a separate task.

**Theme App Extension follow-on:**
Requires `shopify app generate extension --type theme_app_extension --name content-blocks` via
Shopify CLI. Left out of this plan because it requires interactive CLI scaffolding. After this
plan completes, run the CLI command and then edit the generated Liquid block to render
`custom.description_html` and `custom.attributes` metafields.
