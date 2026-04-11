# Feature: SourceDesk — Phases 2, 3, and 4 Full Implementation

## Summary

Complete all pending gaps across Phase 2 (Supplier CRM & Outreach), Phase 3 (Product Import & AI
Enrichment), and Phase 4 (Pricing & Polish). The codebase scaffold is complete — every service,
route, and job file exists but many contain `// TODO` stubs. This plan implements every stub in
dependency order: data layer first (schema migrations), then service layer, then routes.

## User Story

As an authorized reseller  
I want a complete supplier-to-listing workflow inside Shopify Admin  
So that I can send real outreach emails, track opens, enroll suppliers in sequences, import
catalogs with AI enrichment, monitor prices, and maintain a full audit trail

## Problem Statement

The following are explicitly incomplete (confirmed by reading source files):
- `email.service.ts:57` — `getValidAccessToken()` throws on expired tokens (refresh not implemented)
- `email.service.ts:147` — `sendOutreachEmail()` does not actually send (no provider dispatch)
- `email-sync.job.ts:14` — `processEmailSync()` is a stub (no IMAP poll implementation)
- `app.suppliers.$id.tsx:65-82` — contacts, notes, linked products are `// TODO` blocks
- `app.settings.tsx:32` — disconnect-email intent is a no-op `void session`
- No route handles `/track/open/:messageId` — `SupplierEmail.opened` never set
- No `DescriptionTemplate` model — multi-template support unscheduled
- No `AuditLog` model — Phase 4 audit log unscheduled
- `extensions/content-blocks/` directory does not exist
- Sentry SDK in `package.json` but not initialized in any entry file

## Solution Statement

Implement each gap as an atomic task in strict dependency order. No new architecture — every new
file mirrors an existing counterpart. Schema migrations before service functions, service functions
before routes, routes before UI polish.

## Metadata

| Field | Value |
|-------|-------|
| Type | ENHANCEMENT |
| Complexity | HIGH |
| Systems Affected | email.service, email-sync.job, 4 route files, prisma schema, entry files, extensions/ |
| Dependencies | imapflow@1.0.162, @sentry/remix@8.0.0, googleapis@171.4.0, prisma@5.22.0 (all in package.json) |
| Estimated Tasks | 17 |

---

## UX Design

### Before State

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              BEFORE STATE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Supplier Detail ──► Contacts card: "TODO" placeholder (empty)                ║
║  Supplier Detail ──► Notes card: "TODO" placeholder (empty)                   ║
║  Supplier Detail ──► Products card: "TODO" placeholder (empty)                ║
║  Settings ──► Disconnect Email ──► no-op (void session)                       ║
║  Outreach ──► Send Email ──► records DB row but sends nothing                 ║
║  No route: /track/open/:messageId (SupplierEmail.opened always false)          ║
║  No route: /app/templates (only one global template in MerchantConfig JSON)   ║
║  No AuditLog model (all user actions untracked)                               ║
║  Sentry DSN configured but errors never captured                              ║
║  extensions/content-blocks/ does not exist (metafields not renderable)        ║
║                                                                               ║
║  PAIN_POINT: Merchants see empty stub UIs; emails never leave the server;     ║
║  supplier replies never detected; no storefront rendering of AI content.      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### After State

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                               AFTER STATE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Supplier Detail ──► Contacts card: names, emails, phone, role rendered       ║
║                   ──► Sequence enrollment with contact picker                 ║
║                   ──► Notes card: timestamped CRM log, add-note form          ║
║                   ──► Products table with sync status badges                  ║
║  Settings ──► Disconnect Email ──► revokes token + deletes DB record          ║
║  Outreach ──► Send Email ──► dispatches via Gmail or Outlook API              ║
║                           ──► injects open-tracking pixel (TRACKING_BASE_URL) ║
║  GET /track/open/:messageId ──► sets opened=true, openedAt=now(), returns GIF ║
║  email-sync job ──► IMAP polls inbox ──► matches supplier contacts            ║
║                 ──► creates SupplierEmail (received) ──► pauses sequence      ║
║  /app/templates ──► create/edit DescriptionTemplate records                   ║
║  extensions/content-blocks/ ──► Liquid block renders metafield tabs/accordion ║
║  AuditLog writes on: email send, AI accept/reject, sync, price alert actions  ║
║  Sentry captures all server errors + client errors via @sentry/remix           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `app.suppliers.$id.tsx` | Empty contacts/notes/products | Rendered from JSON | Merchants see full supplier profile |
| `app.suppliers.$id.tsx` | No sequence enrollment | Contact picker + enroll button | Merchant chooses which contact gets the sequence |
| `app.settings.tsx` | Disconnect = no-op | Revokes OAuth + deletes record | Email actually disconnected |
| `email.service.ts` | Send = DB write only | Send via Gmail/Outlook API | Emails actually delivered |
| `track.open.$messageId.tsx` | Route doesn't exist | Returns 1×1 GIF, marks opened | Open rates visible in email thread |
| `email-sync.job.ts` | Stub, no polling | IMAP polls every schedule | Replies auto-detected, sequences paused |
| `app.templates.tsx` | Doesn't exist | Create/edit templates | Multiple AI templates per product type |
| `extensions/content-blocks/` | Doesn't exist | Liquid block in Theme Editor | AI content renders as tabs in storefront |
| `entry.server.tsx` | No Sentry init | Sentry captures exceptions | Errors tracked in dashboard |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `app/services/email.service.ts` | 1-153 | All TODO stubs to implement; encrypt/decrypt pattern |
| P0 | `app/email/imap.client.ts` | 1-93 | fetchUnseenEmails() signature and ParsedEmail type |
| P0 | `app/email/gmail.client.ts` | all | sendGmailMessage(), refreshGoogleToken() signatures |
| P0 | `app/email/outlook.client.ts` | all | sendOutlookMessage(), refreshOutlookToken() signatures |
| P0 | `app/jobs/email-sync.job.ts` | 1-27 | The stub to implement (pipeline comment is the spec) |
| P0 | `prisma/schema.prisma` | all | Exact model names, field types, relation syntax before adding models |
| P1 | `app/services/sequence.service.ts` | all | MIRROR for description-template.service.ts and audit.service.ts |
| P1 | `app/services/ai-acceptance.service.ts` | all | Where to add auditLog() calls |
| P1 | `app/routes/app.suppliers.$id.tsx` | all | TODOs to fill in |
| P1 | `app/routes/app.settings.tsx` | all | disconnect-email TODO to implement |
| P1 | `app/utils/crypto.server.ts` | all | encrypt()/decrypt() function signatures |
| P2 | `app/jobs/queues.ts` | all | QUEUES constant, DEFAULT_JOB_OPTIONS, queue instances |
| P2 | `app/entry.server.tsx` | all | Where to add Sentry.init() |
| P2 | `app/entry.client.tsx` | all | Where to add Sentry browser init |
| P2 | `app/env.server.ts` | all | SENTRY_DSN already in EnvSchema; no env changes needed |

**External Documentation:**

| Source | Section | Why Needed |
|--------|---------|------------|
| @sentry/remix docs | Server-side setup | `Sentry.init()` in handleError export |
| Shopify Theme App Extensions | Liquid block structure | `extensions/` directory schema |
| imapflow docs | ImapFlow.fetch() | Message flag marking (mark seen after sync) |

---

## Patterns to Mirror

**NAMING_CONVENTION:**
```typescript
// SOURCE: app/services/sequence.service.ts:1-10
// COPY THIS PATTERN — shopDomain as first param, named exports:
import db from "~/db.server";
export async function listTemplates(shopDomain: string) {
  return db.descriptionTemplate.findMany({
    where: { shopDomain },
    orderBy: { createdAt: "asc" },
  });
}
```

**ROUTE_ACTION_PATTERN:**
```typescript
// SOURCE: app/routes/app.suppliers.$id.tsx:24-38
// COPY THIS PATTERN — Zod parse → safeParse → 422 on error:
const UpdateSchema = z.object({
  name: z.string().min(1).max(200),
});
export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return json({ errors: parsed.error.flatten() }, { status: 422 });
  await updateThing(session.shop, params.id!, parsed.data);
  return json({ success: true });
}
```

**EMPTY_STATE_PATTERN:**
```typescript
// SOURCE: app/routes/app.suppliers.tsx:66-72
// COPY THIS PATTERN for empty states:
{rows.length === 0 ? (
  <BlockStack gap="300" inlineAlign="center">
    <Text as="p" variant="bodyMd" tone="subdued">
      No items yet. Create one to get started.
    </Text>
    <Button url="/app/thing/new">Add Thing</Button>
  </BlockStack>
) : (
  <DataTable ... />
)}
```

**ENCRYPT_DECRYPT_PATTERN:**
```typescript
// SOURCE: app/utils/crypto.server.ts (all)
// COPY THIS PATTERN — always encrypt before DB write, decrypt on read:
accessToken: encrypt(data.accessToken),   // write
return decrypt(account.accessToken);       // read
```

**JOB_PROCESSOR_PATTERN:**
```typescript
// SOURCE: app/jobs/worker.ts:1-30
// COPY THIS PATTERN — job processor signature:
export async function processMyJob(job: Job<MyPayload>) {
  const { shopDomain } = job.data;
  console.info({ shopDomain }, "Starting my job");
  // ... implementation ...
  await job.updateProgress(100);
}
```

**PRISMA_MIGRATION_NAMING:**
```
// SOURCE: prisma/migrations/20260411191544_init/
// PATTERN: YYYYMMDDHHMMSS_snake_case_description
// Command: npx prisma migrate dev --name add_description_template
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `prisma/schema.prisma` | UPDATE | Add DescriptionTemplate + AuditLog models |
| `prisma/migrations/` | CREATE (via CLI) | Two migrations: add_description_template, add_audit_log |
| `app/services/email.service.ts` | UPDATE | Implement token refresh + actual send dispatch |
| `app/jobs/email-sync.job.ts` | UPDATE | Implement IMAP poll pipeline |
| `app/routes/app.suppliers.$id.tsx` | UPDATE | Fill contacts, notes, products TODOs; add enrollment UI |
| `app/routes/app.settings.tsx` | UPDATE | Implement disconnect-email action |
| `app/routes/track.open.$messageId.tsx` | CREATE | Open tracking pixel endpoint |
| `app/services/description-template.service.ts` | CREATE | CRUD for DescriptionTemplate |
| `app/routes/app.templates.tsx` | CREATE | Template list + create UI |
| `app/services/audit.service.ts` | CREATE | logAction() helper |
| `app/entry.server.tsx` | UPDATE | Sentry.init() + handleError export |
| `app/entry.client.tsx` | UPDATE | Sentry browser init |
| `extensions/content-blocks/` | CREATE (via CLI) | Theme App Extension Liquid block |
| `app/env.server.ts` | UPDATE | Add comment clarifying SHOPIFY_STORE_DOMAIN scope |

---

## NOT Building (Scope Limits)

- **Resend transactional emails** — RESEND_API_KEY not in .env.example; transactional alerts are out of scope for this plan
- **Email template performance stats** — per-template analytics (Could priority in PRD)
- **Scheduled auto-scrape** — Scale tier only; not in Phase 2-4 core
- **Multiple EmailAccount per shop** — schema enforces `@unique` on shopDomain; multi-account requires future schema change
- **Price history view** — already marked Done in Phase 4 table; not a gap
- **MIME parser replacement** in `imap.client.ts` — TODO comment says "replace for production"; the naive extractor works for reply detection; full MIME parsing is future work
- **Annual billing discount** — billing.service.ts already exists and is Done in Phase 1
- **App Store listing prep** — screenshots, privacy policy are non-code tasks

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

---

### Task 1: UPDATE `prisma/schema.prisma` — add DescriptionTemplate model

- **ACTION**: UPDATE existing file
- **IMPLEMENT**: Add `DescriptionTemplate` model after `MerchantConfig` model. Add `AuditLog` model at the end of the file.
- **MIRROR**: `prisma/schema.prisma` — follow exact cuid/String/DateTime/@@index pattern
- **CONTENT**:
```prisma
model DescriptionTemplate {
  id          String   @id @default(cuid())
  shopDomain  String
  name        String
  sections    String   @default("[]") // JSON: { tag, title, hint, required }[]
  isDefault   Boolean  @default(false)
  productType String?  // null = applies globally; set to product category string for type-specific
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([shopDomain])
}

model AuditLog {
  id          String   @id @default(cuid())
  shopDomain  String
  action      String   // e.g. "email.sent", "ai.accepted", "ai.rejected", "product.synced", "price.approved"
  entityType  String   // "supplier" | "product" | "priceAlert" | "emailSequence"
  entityId    String
  metadata    String   @default("{}") // JSON: arbitrary context
  createdAt   DateTime @default(now())

  @@index([shopDomain])
  @@index([shopDomain, entityType, entityId])
}
```
- **GOTCHA**: SQLite requires no native enum types — use String with comment describing allowed values (same pattern as existing `status String @default("LEAD")`)
- **VALIDATE**: `npx prisma validate` — must exit 0 with no errors

---

### Task 2: Run Prisma migrations

- **ACTION**: Run CLI commands (not a file edit)
- **IMPLEMENT**: Two sequential migrations
- **COMMANDS**:
```bash
cd C:/Users/savan/projects/shopify_manager
npx prisma migrate dev --name add_description_template
npx prisma generate
```
- **GOTCHA**: Run from `shopify_manager/` root, not from a subdirectory. The migration will also pick up `AuditLog` if both models were added in Task 1 — that's fine, name it `add_description_template_and_audit_log`.
- **VALIDATE**: `npx prisma studio` shows DescriptionTemplate and AuditLog tables in dev.db

---

### Task 3: CREATE `app/services/description-template.service.ts`

- **ACTION**: CREATE new file
- **IMPLEMENT**: Full CRUD — listTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, getDefaultTemplate
- **MIRROR**: `app/services/sequence.service.ts` — identical structure, swap model name
- **IMPORTS**: `import db from "~/db.server";`
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
  return db.descriptionTemplate.findFirst({
    where: { shopDomain, isDefault: true },
  });
}

export async function createTemplate(
  shopDomain: string,
  data: {
    name: string;
    sections: Array<{ tag: string; title: string; hint: string; required: boolean }>;
    isDefault?: boolean;
    productType?: string;
  }
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
  data: Partial<{ name: string; sections: string; isDefault: boolean; productType: string | null }>
) {
  return db.descriptionTemplate.update({
    where: { id, shopDomain },
    data,
  });
}

export async function deleteTemplate(shopDomain: string, id: string) {
  return db.descriptionTemplate.delete({ where: { id, shopDomain } });
}
```
- **GOTCHA**: `sections` is stored as JSON string in SQLite — always `JSON.stringify()` on write, `JSON.parse()` on read
- **VALIDATE**: TypeScript compiles — `npx tsc --noEmit`

---

### Task 4: CREATE `app/services/audit.service.ts`

- **ACTION**: CREATE new file
- **IMPLEMENT**: Single `logAction()` function. Fire-and-forget — never throw on audit failures (audit must not break the main flow).
- **MIRROR**: `app/services/email.service.ts` — shopDomain first param pattern
- **CONTENT**:
```typescript
import db from "~/db.server";

export async function logAction(
  shopDomain: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
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
    // Audit failures must never propagate — log only
    console.error({ shopDomain, action, entityId, err }, "Audit log write failed");
  }
}

export async function getAuditLog(
  shopDomain: string,
  entityType: string,
  entityId: string,
  limit = 50
) {
  return db.auditLog.findMany({
    where: { shopDomain, entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
```
- **GOTCHA**: Wrap `db.auditLog.create` in try/catch — audit failures must never propagate
- **VALIDATE**: `npx tsc --noEmit`

---

### Task 5: UPDATE `app/services/email.service.ts` — implement token refresh and actual send

- **ACTION**: UPDATE existing file
- **IMPLEMENT**: 
  1. Replace `getValidAccessToken()` stub with real refresh logic
  2. Replace `sendOutreachEmail()` stub with real provider dispatch + open tracking pixel injection
- **MIRROR**: `app/email/gmail.client.ts` `refreshGoogleToken()` + `sendGmailMessage()` signatures (read this file first)
- **READ FIRST**: `app/email/gmail.client.ts` and `app/email/outlook.client.ts` for exact function signatures
- **CHANGES to `getValidAccessToken()`** — replace lines 56-61:
```typescript
export async function getValidAccessToken(shopDomain: string): Promise<string> {
  const account = await db.emailAccount.findUniqueOrThrow({
    where: { shopDomain },
  });

  if (account.expiresAt && account.expiresAt < new Date()) {
    // Refresh the token using the appropriate provider client
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
- **CHANGES to `sendOutreachEmail()`** — replace the TODO comment block (lines 147-151):
```typescript
export async function sendOutreachEmail(
  shopDomain: string,
  supplierId: string,
  data: { subject: string; body: string; contactEmail?: string }
) {
  const supplier = await db.supplier.findFirstOrThrow({
    where: { id: supplierId, shopDomain },
  });

  const contacts = JSON.parse(supplier.contacts as string) as Array<{
    name?: string;
    email?: string;
  }>;

  // Use explicitly selected contact, or fall back to first contact with email
  const toEmail = data.contactEmail ?? contacts.find((c) => c.email)?.email;
  if (!toEmail) {
    throw new Error("No email contact found for supplier");
  }

  const account = await db.emailAccount.findUniqueOrThrow({ where: { shopDomain } });
  const accessToken = await getValidAccessToken(shopDomain);

  // Inject open-tracking pixel into HTML body
  const trackingBaseUrl = process.env.TRACKING_BASE_URL;
  let body = data.body;

  // Create the SupplierEmail record first to get the ID for the tracking URL
  const emailRecord = await db.supplierEmail.create({
    data: {
      shopDomain,
      supplierId,
      direction: "sent",
      subject: data.subject,
      body: data.body,
      sentAt: new Date(),
    },
  });

  if (trackingBaseUrl) {
    const pixelUrl = `${trackingBaseUrl}/track/open/${emailRecord.id}`;
    body += `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
  }

  // Dispatch via the connected provider
  if (account.provider === "GMAIL") {
    const { sendGmailMessage } = await import("~/email/gmail.client");
    const result = await sendGmailMessage(accessToken, {
      to: toEmail,
      subject: data.subject,
      body,
      from: account.email,
    });
    // Update with provider message IDs
    await db.supplierEmail.update({
      where: { id: emailRecord.id },
      data: { messageId: result.messageId ?? null, threadId: result.threadId ?? null },
    });
  } else {
    const { sendOutlookMessage } = await import("~/email/outlook.client");
    const result = await sendOutlookMessage(accessToken, {
      to: toEmail,
      subject: data.subject,
      body,
    });
    await db.supplierEmail.update({
      where: { id: emailRecord.id },
      data: { messageId: result.messageId ?? null },
    });
  }
}
```
- **GOTCHA**: The tracking pixel URL must use `emailRecord.id` (the `SupplierEmail` primary key) — NOT `messageId` (which is the provider's message ID and is only known after send). The tracking route handler will look up by this ID.
- **GOTCHA**: Dynamic `import()` is used to avoid circular dependencies between service and email client files. Remix supports top-level ESM dynamic imports on the server.
- **VALIDATE**: `npx tsc --noEmit`

---

### Task 6: CREATE `app/routes/track.open.$messageId.tsx`

- **ACTION**: CREATE new file
- **IMPLEMENT**: Public route (no `authenticate.admin`), returns 1×1 transparent GIF, updates `SupplierEmail.opened`
- **MIRROR**: Route file naming — `track.open.$messageId.tsx` maps to `/track/open/:messageId`
- **CONTENT**:
```typescript
import type { LoaderFunctionArgs } from "@remix-run/node";
import db from "~/db.server";

// 1×1 transparent GIF (base64 decoded at runtime)
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function loader({ params }: LoaderFunctionArgs) {
  const { messageId } = params;

  if (messageId) {
    // Fire and forget — never fail the pixel request on DB errors
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
- **GOTCHA**: This route is PUBLIC — do NOT call `authenticate.admin(request)`. Email clients will request this URL without any Shopify session token.
- **GOTCHA**: Use `updateMany` not `update` so it silently does nothing if the record is already `opened: true` or the ID is invalid — no throws.
- **VALIDATE**: `curl http://localhost:PORT/track/open/fake-id` returns HTTP 200 with `Content-Type: image/gif`

---

### Task 7: UPDATE `app/jobs/email-sync.job.ts` — implement IMAP poll pipeline

- **ACTION**: UPDATE existing file (replace the TODO stub)
- **IMPLEMENT**: Full IMAP poll using `fetchUnseenEmails` from `imap.client.ts`
- **MIRROR**: `app/jobs/price-monitor.job.ts` — same job processor signature
- **READ FIRST**: `app/email/imap.client.ts` — `fetchUnseenEmails()` signature and `ParsedEmail` type
- **CONTENT** (replace entire file body):
```typescript
import type { Job } from "bullmq";
import type { EmailSyncPayload } from "./queues";
import db from "~/db.server";
import { decrypt } from "~/utils/crypto.server";
import { getValidAccessToken } from "~/services/email.service";
import { recordReceivedEmail } from "~/services/email.service";
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

  // Fetch all suppliers with their contacts for matching
  const suppliers = await db.supplier.findMany({
    where: { shopDomain },
    select: { id: true, status: true, contacts: true },
  });

  // Build a map of email address → supplierId for O(1) match lookup
  const emailToSupplier = new Map<string, string>();
  for (const supplier of suppliers) {
    const contacts = JSON.parse(supplier.contacts as string) as Array<{
      email?: string;
    }>;
    for (const contact of contacts) {
      if (contact.email) {
        emailToSupplier.set(contact.email.toLowerCase(), supplier.id);
      }
    }
  }

  // Poll for unseen emails since 7 days ago (imapflow handles this)
  const messages = await fetchUnseenEmails(
    account.provider as ImapProvider,
    account.email,
    accessToken
  );

  await job.updateProgress(50);

  let matched = 0;
  for (const message of messages) {
    const supplierId = emailToSupplier.get(message.from.toLowerCase());
    if (!supplierId) continue;

    // Skip if we already have this messageId recorded
    if (message.messageId) {
      const existing = await db.supplierEmail.findFirst({
        where: { shopDomain, messageId: message.messageId },
      });
      if (existing) continue;
    }

    // 1. Record the received email
    await recordReceivedEmail(shopDomain, supplierId, {
      subject: message.subject,
      body: message.body,
      receivedAt: message.receivedAt,
      messageId: message.messageId,
    });

    // 2. Auto-pause active sequence for this supplier
    await pauseSupplierSequence(shopDomain, supplierId);

    // 3. Advance supplier status from CONTACTED → RESPONDED (only if currently CONTACTED)
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
- **GOTCHA**: `account.provider` in the DB is `"GMAIL"` or `"OUTLOOK"` — matches `ImapProvider` union type exactly. Cast with `as ImapProvider`.
- **GOTCHA**: `emailToSupplier` map uses `.toLowerCase()` on both sides — email matching is case-insensitive.
- **VALIDATE**: Job can be enqueued manually: `await emailSyncQueue.add("test", { shopDomain: "test.myshopify.com" })`

---

### Task 8: UPDATE `app/routes/app.suppliers.$id.tsx` — fill all TODO blocks + contact selection

- **ACTION**: UPDATE existing file
- **IMPLEMENT**: 
  1. Render contacts JSON array (name, email, phone, role)
  2. Render notes JSON array with timestamps
  3. Render linked products table with sync status
  4. Add contact selection UI and sequence enrollment form
- **MIRROR**: `app/routes/app.suppliers.tsx` — DataTable pattern, Badge status pattern
- **READ FIRST**: Full file at `app/routes/app.suppliers.$id.tsx` (especially lines 40-89)
- **LOADER changes** — fetch related data:
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
- **ACTION changes** — add enroll-sequence intent:
```typescript
const ActionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("update"),
    name: z.string().min(1).max(200),
    website: z.string().url().optional().or(z.literal("")),
    status: z.enum(["LEAD","CONTACTED","RESPONDED","NEGOTIATING","APPROVED","REJECTED","INACTIVE"]),
  }),
  z.object({
    intent: z.literal("add-note"),
    body: z.string().min(1),
  }),
  z.object({
    intent: z.literal("enroll-sequence"),
    sequenceId: z.string().cuid(),
    contactEmail: z.string().email(),
  }),
]);
```
- For `add-note` intent: append `{ body, createdAt: new Date().toISOString() }` to supplier.notes JSON array via `updateSupplier`
- For `enroll-sequence` intent: call `enrollSupplierInSequence(session.shop, params.id!, sequenceId)` from `sequence.service.ts`
- **CONTACTS render** — in the Contacts card (lines 74-77):
```typescript
{(JSON.parse(supplier.contacts as string) as Array<{name?:string;email?:string;phone?:string;role?:string}>).map((c, i) => (
  <BlockStack key={i} gap="100">
    <Text as="p" variant="bodyMd" fontWeight="semibold">{c.name ?? "—"}</Text>
    <Text as="p" variant="bodySm" tone="subdued">{c.email ?? ""} {c.phone ? `· ${c.phone}` : ""}</Text>
    {c.role && <Badge>{c.role}</Badge>}
  </BlockStack>
))}
```
- **NOTES render** — in the Notes card:
```typescript
{(JSON.parse(supplier.notes as string) as Array<{body:string;createdAt:string}>).map((n, i) => (
  <BlockStack key={i} gap="100">
    <Text as="p" variant="bodyMd">{n.body}</Text>
    <Text as="p" variant="bodySm" tone="subdued">{new Date(n.createdAt).toLocaleDateString()}</Text>
  </BlockStack>
))}
<form method="post">
  <input type="hidden" name="intent" value="add-note" />
  <TextField label="Add note" name="body" multiline={3} autoComplete="off" />
  <Button submit>Add Note</Button>
</form>
```
- **PRODUCTS render** — in the Products card:
```typescript
<DataTable
  columnContentTypes={["text", "text", "text"]}
  headings={["Title", "SKU", "Sync Status"]}
  rows={products.map((p) => [
    p.title,
    p.sku,
    <Badge key={p.id} tone={p.syncStatus === "SYNCED" ? "success" : "attention"}>{p.syncStatus}</Badge>
  ])}
/>
```
- **ENROLL UI** — sequence enrollment form with contact Select:
```typescript
<Card>
  <BlockStack gap="300">
    <Text as="h2" variant="headingMd">Enroll in Sequence</Text>
    <form method="post">
      <input type="hidden" name="intent" value="enroll-sequence" />
      <Select
        label="Sequence"
        name="sequenceId"
        options={sequences.map((s) => ({ label: s.name, value: s.id }))}
      />
      <Select
        label="Send to contact"
        name="contactEmail"
        options={(JSON.parse(supplier.contacts as string) as Array<{name?:string;email?:string}>)
          .filter((c) => c.email)
          .map((c) => ({ label: `${c.name ?? c.email} (${c.email})`, value: c.email! }))}
      />
      <Button submit>Enroll</Button>
    </form>
  </BlockStack>
</Card>
```
- **GOTCHA**: `Select` from `@shopify/polaris` requires `options` as `{label: string, value: string}[]`
- **GOTCHA**: Import `Select`, `TextField` from `@shopify/polaris` — add to the existing import statement
- **GOTCHA**: Import `listSequences` from `~/services/sequence.service` and `db` from `~/db.server` in loader
- **VALIDATE**: `npx tsc --noEmit` + visually verify supplier detail renders contacts

---

### Task 9: UPDATE `app/routes/app.settings.tsx` — implement disconnect-email

- **ACTION**: UPDATE existing file (implement lines 29-35)
- **IMPLEMENT**: The `disconnect-email` intent must revoke the OAuth token and delete the DB record
- **MIRROR**: Same action/intent pattern as this file already uses
- **CHANGES** — replace `void session` block:
```typescript
if (intent === "disconnect-email") {
  const account = await getEmailAccount(session.shop);
  if (account) {
    // Revoke token with provider (best-effort — don't fail if revocation fails)
    try {
      if (account.provider === "GMAIL") {
        const { revokeGoogleToken } = await import("~/email/gmail.client");
        await revokeGoogleToken(decrypt(account.accessToken));
      }
      // Outlook tokens auto-expire; revocation via Graph API is optional
    } catch (err) {
      console.warn({ shopDomain: session.shop, err }, "Token revocation failed (non-fatal)");
    }
    await deleteEmailAccount(session.shop);
  }
  return json({ success: true });
}
```
- **IMPORTS to add**: `import { deleteEmailAccount } from "~/services/email.service"` and `import { decrypt } from "~/utils/crypto.server"`
- **GOTCHA**: Read `app/email/gmail.client.ts` to verify `revokeGoogleToken()` exists — if it doesn't exist yet, add it (calls `https://oauth2.googleapis.com/revoke?token=<token>`). If it does exist, just import it.
- **VALIDATE**: `npx tsc --noEmit`

---

### Task 10: CREATE `app/routes/app.templates.tsx` — description template list page

- **ACTION**: CREATE new file
- **IMPLEMENT**: List existing templates, create button, delete action
- **MIRROR**: `app/routes/app.outreach.tsx` — DataTable + empty state pattern exactly
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

const ActionSchema = z.object({
  intent: z.enum(["delete"]),
  id: z.string().cuid(),
});

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const parsed = ActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return json({ errors: parsed.error.flatten() }, { status: 422 });
  if (parsed.data.intent === "delete") {
    await deleteTemplate(session.shop, parsed.data.id);
  }
  return json({ success: true });
}

export default function Templates() {
  const { templates } = useLoaderData<typeof loader>();
  const rows = templates.map((t) => [
    t.name,
    t.productType ?? "All products",
    JSON.parse(t.sections as string).length + " sections",
    t.isDefault ? <Badge tone="success">Default</Badge> : "—",
  ]);

  return (
    <Page
      title="Description Templates"
      primaryAction={{ content: "New Template", url: "/app/templates/new" }}
    >
      <BlockStack gap="500">
        <Card>
          {rows.length === 0 ? (
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
              rows={rows}
            />
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
```
- **GOTCHA**: The `id` field in ActionSchema uses `z.string().cuid()` — Prisma generates cuid IDs, not uuid
- **VALIDATE**: Route accessible at `/app/templates` with empty state shown

---

### Task 11: UPDATE `app/entry.server.tsx` and `app/entry.client.tsx` — initialize Sentry

- **ACTION**: UPDATE two existing files
- **READ FIRST**: Full `app/entry.server.tsx` and `app/entry.client.tsx` before editing
- **IMPLEMENT**: Initialize `@sentry/remix` (already in package.json at `^8.0.0`)
- **CHANGES to `entry.server.tsx`** — add at top of file:
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
- **CHANGES to `entry.client.tsx`** — add at top:
```typescript
import * as Sentry from "@sentry/remix";
import { useEffect } from "react";

if (typeof window !== "undefined" && (window as unknown as { ENV?: { SENTRY_DSN?: string } }).ENV?.SENTRY_DSN) {
  Sentry.init({
    dsn: (window as unknown as { ENV: { SENTRY_DSN: string } }).ENV.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      Sentry.browserTracingIntegration({
        useEffect,
        useLocation,
        useMatches,
      }),
    ],
    tracesSampleRate: 0.1,
  });
}
```
- **GOTCHA**: `SENTRY_DSN` is optional in `env.server.ts` — always guard with `if (process.env.SENTRY_DSN)` before calling `Sentry.init()` to avoid errors in dev
- **GOTCHA**: Client-side Sentry requires exposing `SENTRY_DSN` via `window.ENV` in the root loader. If `app/root.tsx` does not already expose `window.ENV`, add a `loader` to `root.tsx` that returns `{ ENV: { SENTRY_DSN: process.env.SENTRY_DSN } }` and a `<script>` tag in the component to set `window.ENV`
- **VALIDATE**: `npx tsc --noEmit` — no type errors on Sentry imports

---

### Task 12: UPDATE `app/env.server.ts` — clarify SHOPIFY_STORE_DOMAIN

- **ACTION**: UPDATE existing file (add comment, no behavior change)
- **IMPLEMENT**: Add a clarifying comment to the `SHOPIFY_STORE_DOMAIN` field
- **CHANGE** — modify line 8:
```typescript
  // SHOPIFY_STORE_DOMAIN is used ONLY for appUrl in shopify.server.ts.
  // At runtime, shopDomain always comes from the authenticated session (session.shop).
  // This env var is NOT used for tenant scoping. Legacy dev-only artifact from the standalone MVP.
  SHOPIFY_STORE_DOMAIN: z.string().min(1),
```
- **VALIDATE**: `npx tsc --noEmit`

---

### Task 13: CREATE Theme App Extension `extensions/content-blocks/`

- **ACTION**: CREATE via Shopify CLI, then edit generated files
- **IMPLEMENT**: Liquid block that renders `custom.description_html` and `custom.attributes` metafields as tabs/accordion
- **COMMAND**:
```bash
cd C:/Users/savan/projects/shopify_manager
shopify app generate extension --type theme_app_extension --name content-blocks
```
- **AFTER CLI creates the scaffold**, edit `extensions/content-blocks/blocks/content-blocks.liquid`:
```liquid
{% comment %}
  SourceDesk Content Blocks
  Renders AI-generated product content from custom metafields.
  Namespace: custom
  Keys: description_html, attributes
{% endcomment %}

{% assign description = block.settings.description_source == "metafield"
  ? product.metafields.custom.description_html.value
  : product.description %}

{% assign attributes_json = product.metafields.custom.attributes.value %}

<div class="sourcedesk-content-blocks" {{ block.shopify_attributes }}>
  {% if description != blank or attributes_json != blank %}
    <div class="sourcedesk-tabs">
      {% if description != blank %}
        <div class="sourcedesk-tab" data-tab="description">
          <h3>{{ 'products.product.description' | t }}</h3>
          <div class="sourcedesk-tab-content">
            {{ description }}
          </div>
        </div>
      {% endif %}

      {% if attributes_json != blank %}
        {% assign attributes = attributes_json | parse_json %}
        <div class="sourcedesk-tab" data-tab="specifications">
          <h3>{{ 'products.product.specifications' | t }}</h3>
          <div class="sourcedesk-tab-content">
            <table class="sourcedesk-specs-table">
              {% for attribute in attributes %}
                <tr>
                  <td>{{ attribute[0] }}</td>
                  <td>{{ attribute[1] }}</td>
                </tr>
              {% endfor %}
            </table>
          </div>
        </div>
      {% endif %}
    </div>
  {% endif %}
</div>

{% schema %}
{
  "name": "SourceDesk Content",
  "target": "section",
  "settings": [
    {
      "type": "select",
      "id": "description_source",
      "label": "Description source",
      "options": [
        { "value": "metafield", "label": "SourceDesk AI (custom.description_html)" },
        { "value": "native", "label": "Shopify product description" }
      ],
      "default": "metafield"
    }
  ],
  "presets": [
    {
      "name": "SourceDesk Content Blocks"
    }
  ]
}
{% endschema %}
```
- **GOTCHA**: The CLI must be run from the `shopify_manager/` root. If `shopify` CLI is not in PATH, install with `npm install -g @shopify/cli@latest`
- **GOTCHA**: Theme App Extensions use the `"target": "section"` not `"target": "block"` for standalone blocks; verify with current Shopify docs if the CLI generates a different target
- **VALIDATE**: `shopify app build` exits 0 (extension compiles)

---

### Task 14: Add `logAction()` calls at key user actions (audit trail wiring)

- **ACTION**: UPDATE `app/services/ai-acceptance.service.ts` and `app/routes/app.suppliers.$id.emails.tsx`
- **IMPLEMENT**: Call `logAction()` after each audit-worthy event
- **MIRROR**: `app/services/audit.service.ts:logAction()` signature just created

**In `ai-acceptance.service.ts`** — add after `updateProduct(...)` in `applyAiAcceptance`:
```typescript
import { logAction } from "~/services/audit.service";
// after await updateProduct(...):
await logAction(shopDomain, "ai.accepted", "product", productId);
```

**In `applyAiAcceptance` reject path** (`rejectAiContent`):
```typescript
await logAction(shopDomain, "ai.rejected", "product", productId);
```

**In `email.service.ts` sendOutreachEmail** — after successful send:
```typescript
await logAction(shopDomain, "email.sent", "supplier", supplierId, { to: toEmail });
```
- **GOTCHA**: `logAction()` is fire-and-forget (wrapped in try/catch internally) — await it but don't catch exceptions in callers
- **VALIDATE**: `npx tsc --noEmit`

---

## Testing Strategy

### Manual Verification Flows

| Flow | Steps | Validates |
|------|-------|-----------|
| Token refresh | Let access token expire → trigger send → verify new token written to DB | Task 5 |
| Actual email send | Connect Gmail → send outreach to real email → check inbox | Task 5 |
| Open tracking | Receive sent email in browser → load pixel URL → check DB opened=true | Task 6 |
| Reply detection | Reply to outreach email → wait for email-sync job → verify SupplierSequence.status=paused | Task 7 |
| Contact selection | Open supplier with 2+ contacts → enroll in sequence → verify correct email used | Task 8 |
| Template CRUD | Create template → set as default → verify enrichment service picks it up | Tasks 3, 10 |
| Sentry capture | Throw error in a loader → verify it appears in Sentry dashboard | Task 11 |
| Theme block | Install app on dev store → add Content Blocks block to product page → verify metafield renders | Task 13 |
| Audit log | Accept AI content → query AuditLog table via Prisma Studio → verify row exists | Task 14 |

### Edge Cases Checklist

- [ ] Supplier with no contacts: `sendOutreachEmail` throws `"No email contact found"`; UI shows error Banner
- [ ] Expired OAuth token: `getValidAccessToken` refreshes silently; if refresh fails, throws with meaningful message
- [ ] Email sync with no EmailAccount connected: job exits early after log message
- [ ] Open tracking with invalid/missing messageId: returns 200 GIF with no DB write (updateMany on non-existent ID is safe)
- [ ] Template delete of default template: subsequent enrichment falls back to `MerchantConfig.contentTemplate` JSON
- [ ] SENTRY_DSN not set: all Sentry.init() calls are guarded, no crashes
- [ ] `extensions/content-blocks/` attributes metafield is null: Liquid `{% if attributes_json != blank %}` guard skips specs table

---

## Validation Commands

### Level 1: STATIC_ANALYSIS
```bash
cd C:/Users/savan/projects/shopify_manager
npx tsc --noEmit
```
**EXPECT**: Exit 0, no TypeScript errors

### Level 2: PRISMA
```bash
npx prisma validate
npx prisma generate
```
**EXPECT**: Exit 0 on both commands

### Level 3: BUILD
```bash
npm run build
```
**EXPECT**: Exit 0, Remix build succeeds

### Level 4: EXTENSION BUILD
```bash
shopify app build
```
**EXPECT**: Exit 0, content-blocks extension compiles

---

## Acceptance Criteria

- [ ] `npx tsc --noEmit` exits 0 — no type errors anywhere
- [ ] `npm run build` exits 0 — no build failures  
- [ ] Supplier detail page renders contacts, notes, and linked products (no more `// TODO` blank cards)
- [ ] Clicking "Enroll in Sequence" with a contact selected creates a `SupplierSequence` record
- [ ] `sendOutreachEmail()` dispatches via Gmail or Outlook API (not just writes to DB)
- [ ] Sent email body contains `<img>` tracking pixel pointing to `/track/open/:id`
- [ ] `GET /track/open/:id` returns `Content-Type: image/gif` and updates `SupplierEmail.opened`
- [ ] `processEmailSync` job: new emails from known supplier contacts create `SupplierEmail` records + pause sequences
- [ ] `DescriptionTemplate` table exists in DB with CRUD routes at `/app/templates`
- [ ] `AuditLog` table exists in DB; `ai.accepted`, `ai.rejected`, `email.sent` rows created on relevant actions
- [ ] Sentry initializes without error when `SENTRY_DSN` is set; gracefully skips when unset
- [ ] `extensions/content-blocks/` renders `custom.description_html` and `custom.attributes` metafields in storefront
- [ ] `SHOPIFY_STORE_DOMAIN` in `env.server.ts` has clarifying comment

---

## Completion Checklist

- [ ] Tasks 1–2 completed (schema + migrations)
- [ ] Tasks 3–4 completed (new services)
- [ ] Task 5 completed (email.service.ts TODOs)
- [ ] Task 6 completed (tracking pixel route)
- [ ] Task 7 completed (email-sync job)
- [ ] Task 8 completed (supplier detail TODOs + contact selection)
- [ ] Task 9 completed (settings disconnect)
- [ ] Task 10 completed (templates route)
- [ ] Task 11 completed (Sentry init)
- [ ] Task 12 completed (env comment)
- [ ] Task 13 completed (Theme App Extension)
- [ ] Task 14 completed (audit trail wiring)
- [ ] Level 1–3 validation commands all pass

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `outlook.client.ts` missing `sendOutlookMessage` / `refreshOutlookToken` | Medium | High | Read the file before Task 5; if functions are missing, implement them in that file following the Gmail client pattern |
| `gmail.client.ts` missing `revokeGoogleToken` | Medium | Low | If absent, add to gmail.client.ts: `GET https://oauth2.googleapis.com/revoke?token=<token>` |
| Shopify CLI not installed / wrong version for extensions | Medium | Medium | Run `shopify version` first; install `@shopify/cli@latest` if absent |
| imapflow XOAUTH2 not working for Outlook | Medium | Medium | Outlook requires `XOAUTH2` auth method with the Graph API token — verify `ImapFlow` `auth.accessToken` field works for both providers |
| SQLite JSON field ordering differs from PostgreSQL | Low | Low | JSON stored as STRING in SQLite — always `JSON.parse()` / `JSON.stringify()` explicitly; never use Prisma JSON operators |
| Sentry `captureRemixServerException` API changed in v8 | Low | Low | Check @sentry/remix v8 release notes; fall back to `Sentry.captureException(error)` if the Remix-specific helper doesn't exist |

---

## Notes

**Dependency order rationale:**
Tasks 1–2 (schema) must run before Tasks 3–4 (services) because Prisma generates types at migration time. Tasks 3–4 (services) must exist before Tasks 5, 8, 10 (routes) because routes import from services. Tasks 5–9 are independent of each other and can be implemented in parallel by multiple agents (each edits a different file). Task 11 (Sentry) and Task 12 (env comment) are standalone. Task 13 (extension) requires Shopify CLI separately. Task 14 (audit wiring) depends on Task 4.

**Multi-template enrichment integration:**
The `enrichment.service.ts` currently reads `MerchantConfig.contentTemplate`. After Task 3 creates `DescriptionTemplate`, update the enrichment service to call `getDefaultTemplate(shopDomain)` first, fall back to `MerchantConfig.contentTemplate` if no template exists. This is a follow-on task not in scope here — but the service is designed to accept it without a breaking change.

**Token refresh implementation note:**
The `getValidAccessToken()` implementation in Task 5 uses dynamic `import()` for `gmail.client` and `outlook.client`. This avoids circular dependency issues at module load time (email.service imports from clients, clients should not import from email.service). Dynamic imports are fully supported in Node.js ESM and Remix server runtime.
