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

  console.info(
    { shopDomain, totalMessages: messages.length, matched },
    "Email sync complete",
  );
  await job.updateProgress(100);
}
