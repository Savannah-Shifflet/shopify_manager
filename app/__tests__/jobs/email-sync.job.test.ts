import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Job } from "bullmq";
import type { EmailSyncPayload } from "~/jobs/queues";

vi.mock("~/db.server", () => ({
  default: {
    emailAccount: { findUnique: vi.fn() },
    supplier: { findMany: vi.fn(), update: vi.fn() },
    supplierEmail: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("~/services/email.service", () => ({
  getValidAccessToken: vi.fn(),
  recordReceivedEmail: vi.fn(),
}));

vi.mock("~/services/sequence.service", () => ({
  pauseSupplierSequence: vi.fn(),
}));

vi.mock("~/email/imap.client", () => ({
  fetchUnseenEmails: vi.fn(),
}));

import db from "~/db.server";
import { getValidAccessToken, recordReceivedEmail } from "~/services/email.service";
import { pauseSupplierSequence } from "~/services/sequence.service";
import { fetchUnseenEmails } from "~/email/imap.client";
import { processEmailSync } from "~/jobs/email-sync.job";

const mockDb = db as unknown as {
  emailAccount: { findUnique: ReturnType<typeof vi.fn> };
  supplier: { findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  supplierEmail: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
};

const shopDomain = "test-shop.myshopify.com";

function makeJob(): Job<EmailSyncPayload> {
  return { data: { shopDomain }, updateProgress: vi.fn() } as unknown as Job<EmailSyncPayload>;
}

describe("processEmailSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getValidAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue("tok");
    mockDb.supplier.update.mockResolvedValue({});
  });

  it("exits early when no email account is connected", async () => {
    mockDb.emailAccount.findUnique.mockResolvedValue(null);
    await processEmailSync(makeJob());
    expect(getValidAccessToken).not.toHaveBeenCalled();
  });

  it("skips messages whose messageId already exists in the DB (dedup)", async () => {
    mockDb.emailAccount.findUnique.mockResolvedValue({
      shopDomain,
      provider: "GMAIL",
      email: "me@gmail.com",
    });
    mockDb.supplier.findMany.mockResolvedValue([
      { id: "sup-1", status: "CONTACTED", contacts: JSON.stringify([{ email: "supplier@example.com" }]) },
    ]);
    (fetchUnseenEmails as ReturnType<typeof vi.fn>).mockResolvedValue([
      { from: "supplier@example.com", subject: "Re:", body: "Yes", receivedAt: new Date(), messageId: "dup-id", threadId: "t1" },
    ]);
    mockDb.supplierEmail.findFirst.mockResolvedValue({ id: "existing" });

    await processEmailSync(makeJob());

    expect(recordReceivedEmail).not.toHaveBeenCalled();
    expect(pauseSupplierSequence).not.toHaveBeenCalled();
  });

  it("calls pauseSupplierSequence exactly once per supplier even with multiple messages", async () => {
    mockDb.emailAccount.findUnique.mockResolvedValue({
      shopDomain,
      provider: "GMAIL",
      email: "me@gmail.com",
    });
    mockDb.supplier.findMany.mockResolvedValue([
      { id: "sup-1", status: "CONTACTED", contacts: JSON.stringify([{ email: "supplier@example.com" }]) },
    ]);
    (fetchUnseenEmails as ReturnType<typeof vi.fn>).mockResolvedValue([
      { from: "supplier@example.com", subject: "Re: 1", body: "A", receivedAt: new Date(), messageId: "m1", threadId: "t1" },
      { from: "supplier@example.com", subject: "Re: 2", body: "B", receivedAt: new Date(), messageId: "m2", threadId: "t1" },
    ]);
    mockDb.supplierEmail.findFirst.mockResolvedValue(null);

    await processEmailSync(makeJob());

    expect(recordReceivedEmail).toHaveBeenCalledTimes(2);
    expect(pauseSupplierSequence).toHaveBeenCalledTimes(1);
  });

  it("transitions supplier status from CONTACTED to RESPONDED", async () => {
    mockDb.emailAccount.findUnique.mockResolvedValue({
      shopDomain,
      provider: "GMAIL",
      email: "me@gmail.com",
    });
    mockDb.supplier.findMany.mockResolvedValue([
      { id: "sup-1", status: "CONTACTED", contacts: JSON.stringify([{ email: "supplier@example.com" }]) },
    ]);
    (fetchUnseenEmails as ReturnType<typeof vi.fn>).mockResolvedValue([
      { from: "supplier@example.com", subject: "Re:", body: "OK", receivedAt: new Date(), messageId: "m1", threadId: "t1" },
    ]);
    mockDb.supplierEmail.findFirst.mockResolvedValue(null);

    await processEmailSync(makeJob());

    expect(mockDb.supplier.update).toHaveBeenCalledWith({
      where: { id: "sup-1", shopDomain },
      data: { status: "RESPONDED" },
    });
  });

  it("does not transition status for suppliers not in CONTACTED state", async () => {
    mockDb.emailAccount.findUnique.mockResolvedValue({
      shopDomain,
      provider: "GMAIL",
      email: "me@gmail.com",
    });
    mockDb.supplier.findMany.mockResolvedValue([
      { id: "sup-1", status: "RESPONDED", contacts: JSON.stringify([{ email: "supplier@example.com" }]) },
    ]);
    (fetchUnseenEmails as ReturnType<typeof vi.fn>).mockResolvedValue([
      { from: "supplier@example.com", subject: "Re:", body: "OK", receivedAt: new Date(), messageId: "m1", threadId: "t1" },
    ]);
    mockDb.supplierEmail.findFirst.mockResolvedValue(null);

    await processEmailSync(makeJob());

    expect(mockDb.supplier.update).not.toHaveBeenCalled();
  });

  it("ignores messages from unknown email addresses", async () => {
    mockDb.emailAccount.findUnique.mockResolvedValue({
      shopDomain,
      provider: "GMAIL",
      email: "me@gmail.com",
    });
    mockDb.supplier.findMany.mockResolvedValue([
      { id: "sup-1", status: "CONTACTED", contacts: JSON.stringify([{ email: "known@example.com" }]) },
    ]);
    (fetchUnseenEmails as ReturnType<typeof vi.fn>).mockResolvedValue([
      { from: "unknown@other.com", subject: "Hi", body: "Spam", receivedAt: new Date(), messageId: "m1", threadId: "t1" },
    ]);
    mockDb.supplierEmail.findFirst.mockResolvedValue(null);

    await processEmailSync(makeJob());

    expect(recordReceivedEmail).not.toHaveBeenCalled();
    expect(pauseSupplierSequence).not.toHaveBeenCalled();
  });
});
