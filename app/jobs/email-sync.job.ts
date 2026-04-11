import type { Job } from "bullmq";
import type { EmailSyncPayload } from "./queues";

/**
 * Email sync job — IMAP inbox polling per connected shop
 * Detects supplier replies and automatically pauses outreach sequences.
 * Uses imapflow for modern IMAP access.
 */
export async function processEmailSync(job: Job<EmailSyncPayload>) {
  const { shopDomain } = job.data;

  console.info({ shopDomain }, "Starting email sync");

  // TODO: implement email sync pipeline
  // 1. Fetch EmailAccount for shopDomain (decrypt tokens, refresh if expired)
  // 2. Connect to IMAP via imapflow
  // 3. Fetch unseen messages since last sync
  // 4. For each message: check if sender matches a known supplier contact
  // 5. If match found:
  //    a. Create SupplierEmail record (direction: "received")
  //    b. Update supplier status: CONTACTED → RESPONDED
  //    c. Pause active SupplierSequence for this supplier
  //    d. Notify merchant
  // 6. Update sync timestamp

  await job.updateProgress(100);
}
