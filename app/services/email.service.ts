import { randomUUID } from "node:crypto";
import db from "~/db.server";
import type { EmailAccount, SupplierEmail } from "@prisma/client";
import { sendGmailMessage, refreshGoogleToken } from "~/email/gmail.client";
import {
  sendOutlookMessage,
  refreshMicrosoftToken,
} from "~/email/outlook.client";
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
 * Refreshes automatically if expired and persists the rotated tokens.
 */
export async function getValidAccessToken(shopDomain: string): Promise<string> {
  const account = await db.emailAccount.findUniqueOrThrow({
    where: { shopDomain },
  });

  if (account.expiresAt < new Date()) {
    const provider = account.provider;
    console.info(
      { shopDomain, provider },
      "Refreshing expired email access token",
    );

    try {
      const decryptedRefresh = decrypt(account.refreshToken);
      const refreshed =
        provider === "GMAIL"
          ? await refreshGoogleToken(decryptedRefresh)
          : await refreshMicrosoftToken(decryptedRefresh);

      // Persist rotated tokens. If this write fails, the in-memory access
      // token is unusable on the next call (DB still holds the old one), so
      // we surface the error rather than silently returning a token that
      // will go stale.
      await db.emailAccount.update({
        where: { shopDomain },
        data: {
          accessToken: encrypt(refreshed.accessToken),
          refreshToken: encrypt(refreshed.refreshToken),
          expiresAt: refreshed.expiresAt,
        },
      });

      console.info(
        { shopDomain, provider },
        "Email access token refreshed and persisted",
      );

      return refreshed.accessToken;
    } catch (err) {
      console.error(
        { shopDomain, provider, err },
        "Email access token refresh failed",
      );
      throw err;
    }
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
 *
 * Pre-generates the SupplierEmail id so it can be embedded in the
 * open-tracking pixel URL, dispatches via the configured provider, and only
 * persists the row after the provider call succeeds — failed dispatches
 * leave no phantom "sent" rows. For Gmail, the provider message id and
 * thread id are stored on the row; Microsoft Graph's sendMail does not
 * return a message id, so those fields stay null for Outlook sends.
 */
export async function sendOutreachEmail(
  shopDomain: string,
  supplierId: string,
  data: { subject: string; body: string; contactEmail?: string },
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
  const toEmail =
    data.contactEmail ?? contacts.find((c) => c.email)?.email ?? null;
  if (!toEmail) {
    throw new Error("No email contact found for supplier");
  }

  const accessToken = await getValidAccessToken(shopDomain);

  // Pre-generate the SupplierEmail id so the open-tracking pixel URL can
  // reference it before the row exists. The row is only written after the
  // provider call succeeds, so a dispatch failure leaves no phantom row.
  const emailId = randomUUID();

  let body = data.body;
  const trackingBaseUrl = process.env.TRACKING_BASE_URL;
  if (trackingBaseUrl) {
    const pixelUrl = `${trackingBaseUrl}/track/open/${emailId}`;
    body += `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
  }

  let messageId: string | null = null;
  let threadId: string | null = null;

  if (account.provider === "GMAIL") {
    const result = await sendGmailMessage(accessToken, {
      to: toEmail,
      subject: data.subject,
      body,
      from: account.email,
    });
    messageId = result.messageId ?? null;
    threadId = result.threadId ?? null;
  } else {
    await sendOutlookMessage(accessToken, {
      to: toEmail,
      subject: data.subject,
      body,
    });
    // Microsoft Graph sendMail does not return the created message id directly;
    // the message id will be discovered later via IMAP/Graph sync if needed.
  }

  await db.supplierEmail.create({
    data: {
      id: emailId,
      shopDomain,
      supplierId,
      direction: "sent",
      subject: data.subject,
      body: data.body,
      sentAt: new Date(),
      messageId,
      threadId,
    },
  });
}
