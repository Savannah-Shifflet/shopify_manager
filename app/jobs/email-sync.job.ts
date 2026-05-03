import { createHash } from "node:crypto";
import type { Job } from "bullmq";
import type { EmailSyncPayload } from "./queues";
import db from "~/db.server";
import {
  getValidAccessToken,
  recordReceivedEmail,
} from "~/services/email.service";
import { pauseSupplierSequence } from "~/services/sequence.service";
import { fetchUnseenEmails } from "~/email/imap.client";
import type { ImapProvider } from "~/email/imap.client";

/**
 * Email sync job — IMAP inbox polling per connected shop.
 *
 * Detects supplier replies, records them as received SupplierEmail rows,
 * pauses any active outreach sequence, and advances the supplier from
 * CONTACTED to RESPONDED. Skips silently if no email account is connected.
 */
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

  // email address (lowercased) → supplierId for O(1) match lookup
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

  const messages = await fetchUnseenEmails(
    account.provider as ImapProvider,
    account.email,
    accessToken,
  );

  await job.updateProgress(50);

  let matched = 0;
  let skippedErrors = 0;
  for (const message of messages) {
    try {
      const supplierId = emailToSupplier.get(message.from.toLowerCase());
      if (!supplierId) continue;

      // Some auto-replies, list footers, and bulk MTAs omit Message-ID.
      // Synthesize a stable dedup key from sender/subject/body so the row
      // isn't re-inserted on every 30-min poll (fetchUnseenEmails uses a
      // 7-day window, not the unseen flag).
      const dedupKey =
        message.messageId ??
        `hash:${createHash("sha256")
          .update(
            `${message.from}|${message.subject}|${message.receivedAt.toISOString()}|${message.body.slice(0, 500)}`,
          )
          .digest("hex")}`;

      const existing = await db.supplierEmail.findFirst({
        where: { shopDomain, messageId: dedupKey },
      });
      if (existing) continue;

      await recordReceivedEmail(shopDomain, supplierId, {
        subject: message.subject,
        body: message.body,
        receivedAt: message.receivedAt,
        messageId: dedupKey,
      });

      await pauseSupplierSequence(shopDomain, supplierId);

      // Status filter in `where` makes this a CAS: a merchant who manually
      // advanced the supplier to NEGOTIATING mid-job is not silently rolled
      // back to RESPONDED.
      await db.supplier.updateMany({
        where: { id: supplierId, shopDomain, status: "CONTACTED" },
        data: { status: "RESPONDED" },
      });

      matched++;
    } catch (err) {
      // Per-message isolation: one bad message must not abort the loop and
      // strand the rest for 30 minutes until the next poll.
      skippedErrors++;
      console.error(
        { shopDomain, messageId: message.messageId, err },
        "Email sync: failed to process message, continuing",
      );
    }
  }

  console.info(
    { shopDomain, totalMessages: messages.length, matched, skippedErrors },
    "Email sync complete",
  );
  await job.updateProgress(100);
}
