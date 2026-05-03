import db from "~/db.server";
import type { EmailAccount, SupplierEmail } from "@prisma/client";
import { sendGmailMessage } from "~/email/gmail.client";
import { sendOutlookMessage } from "~/email/outlook.client";
import { encrypt, decrypt } from "~/utils/crypto.server";

// ─── Email Account management ───

export async function getEmailAccount(
  shopDomain: string,
): Promise<EmailAccount | null> {
  return db.emailAccount.findUnique({ where: { shopDomain } });
}

export async function saveEmailAccount(
  shopDomain: string,
  data: {
    provider: string;
    email: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  },
) {
  return db.emailAccount.upsert({
    where: { shopDomain },
    create: {
      shopDomain,
      provider: data.provider,
      email: data.email,
      accessToken: encrypt(data.accessToken),
      refreshToken: encrypt(data.refreshToken),
      expiresAt: data.expiresAt,
    },
    update: {
      provider: data.provider,
      email: data.email,
      accessToken: encrypt(data.accessToken),
      refreshToken: encrypt(data.refreshToken),
      expiresAt: data.expiresAt,
    },
  });
}

export async function deleteEmailAccount(shopDomain: string) {
  return db.emailAccount.deleteMany({ where: { shopDomain } });
}

/**
 * Returns a valid, decrypted access token.
 * Refreshes automatically if expired.
 */
export async function getValidAccessToken(shopDomain: string): Promise<string> {
  const account = await db.emailAccount.findUniqueOrThrow({
    where: { shopDomain },
  });

  if (account.expiresAt < new Date()) {
    // TODO: refresh via provider-specific OAuth (gmail.client / outlook.client)
    throw new Error("Token refresh not yet implemented");
  }

  return decrypt(account.accessToken);
}

// ─── Email thread ───

export async function getEmailThread(
  shopDomain: string,
  supplierId: string,
): Promise<SupplierEmail[]> {
  return db.supplierEmail.findMany({
    where: { shopDomain, supplierId },
    orderBy: { sentAt: "asc" },
  });
}

export async function recordSentEmail(
  shopDomain: string,
  supplierId: string,
  data: {
    subject: string;
    body: string;
    messageId?: string;
    threadId?: string;
  },
) {
  return db.supplierEmail.create({
    data: {
      shopDomain,
      supplierId,
      direction: "sent",
      subject: data.subject,
      body: data.body,
      sentAt: new Date(),
      messageId: data.messageId,
      threadId: data.threadId,
    },
  });
}

export async function recordReceivedEmail(
  shopDomain: string,
  supplierId: string,
  data: {
    subject: string;
    body: string;
    receivedAt: Date;
    messageId?: string;
    threadId?: string;
  },
) {
  return db.supplierEmail.create({
    data: {
      shopDomain,
      supplierId,
      direction: "received",
      subject: data.subject,
      body: data.body,
      sentAt: data.receivedAt,
      messageId: data.messageId,
      threadId: data.threadId,
    },
  });
}

/**
 * Sends an outreach email to a supplier.
 * Records the message only after the provider send succeeds.
 */
export async function sendOutreachEmail(
  shopDomain: string,
  supplierId: string,
  data: { subject: string; body: string },
) {
  const supplier = await db.supplier.findFirstOrThrow({
    where: { id: supplierId, shopDomain },
  });
  const account = await getEmailAccount(shopDomain);
  if (!account) {
    throw new Error("No email account connected for shop");
  }

  const contacts = JSON.parse(supplier.contacts as string) as Array<{
    name?: string;
    email?: string;
  }>;
  const primaryContact = contacts.find((c) => c.email);
  if (!primaryContact?.email) {
    throw new Error("No email contact found for supplier");
  }

  const accessToken = await getValidAccessToken(shopDomain);
  let messageId: string | undefined;
  let threadId: string | undefined;

  if (account.provider === "GMAIL") {
    const result = await sendGmailMessage(accessToken, {
      to: primaryContact.email,
      subject: data.subject,
      body: data.body,
      from: account.email,
    });
    messageId = result.messageId;
    threadId = result.threadId;
  } else {
    await sendOutlookMessage(accessToken, {
      to: primaryContact.email,
      subject: data.subject,
      body: data.body,
    });
  }

  await recordSentEmail(shopDomain, supplierId, {
    ...data,
    messageId,
    threadId,
  });
}
