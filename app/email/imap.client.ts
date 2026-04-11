/**
 * imapflow-based IMAP client for reply detection polling.
 * Used by email-sync.job.ts to check for supplier replies.
 *
 * Supports Gmail IMAP (imap.gmail.com) and Microsoft 365 (outlook.office365.com).
 */

import { ImapFlow } from "imapflow";

export type ImapProvider = "GMAIL" | "OUTLOOK";

const IMAP_HOSTS: Record<ImapProvider, string> = {
  GMAIL: "imap.gmail.com",
  OUTLOOK: "outlook.office365.com",
};

interface ParsedEmail {
  messageId: string | undefined;
  subject: string;
  from: string;
  body: string;
  receivedAt: Date;
  threadId?: string;
}

/**
 * Fetches unseen emails from the INBOX since a given date.
 * Uses XOAUTH2 with the provided access token.
 */
export async function fetchUnseenEmails(
  provider: ImapProvider,
  email: string,
  accessToken: string,
  since?: Date,
): Promise<ParsedEmail[]> {
  const client = new ImapFlow({
    host: IMAP_HOSTS[provider],
    port: 993,
    secure: true,
    auth: {
      user: email,
      accessToken,
    },
    logger: false,
  });

  const results: ParsedEmail[] = [];

  try {
    await client.connect();
    await client.mailboxOpen("INBOX");

    const sinceDate = since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for await (const message of client.fetch(
      { since: sinceDate },
      { envelope: true, bodyStructure: true, source: true },
    )) {
      if (!message.envelope) continue;

      const from = message.envelope.from?.[0];
      if (!from?.address) continue;

      // Parse plain text body
      const sourceText = message.source?.toString("utf-8") ?? "";
      const body = extractTextBody(sourceText);

      results.push({
        messageId: message.envelope.messageId ?? undefined,
        subject: message.envelope.subject ?? "(no subject)",
        from: from.address,
        body,
        receivedAt: message.envelope.date ?? new Date(),
      });
    }
  } finally {
    await client.logout();
  }

  return results;
}

/**
 * Naive plain-text body extractor from raw RFC 2822 source.
 * TODO: replace with a proper MIME parser for production use.
 */
function extractTextBody(source: string): string {
  const lines = source.split("\n");
  const bodyStart = lines.findIndex((l) => l.trim() === "");
  if (bodyStart === -1) return source.slice(0, 500);
  return lines
    .slice(bodyStart + 1)
    .join("\n")
    .slice(0, 2000);
}
