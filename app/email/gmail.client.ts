/**
 * Google OAuth 2.0 + Gmail API client
 * Scopes: gmail.send, gmail.readonly
 *
 * Token lifecycle: access tokens expire in 1 hour.
 * Always refresh before making API calls (handled by email.service.ts getValidAccessToken).
 */

import { google } from "googleapis";

export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

/**
 * Generates the Google OAuth authorization URL.
 * Merchant is redirected here to connect their Gmail account.
 */
export function getGoogleAuthUrl(state: string): string {
  const oauth2Client = getGoogleOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Force refresh token on every auth
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
    state,
  });
}

/**
 * Exchanges authorization code for access + refresh tokens.
 */
export async function exchangeGoogleCode(code: string) {
  const oauth2Client = getGoogleOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Google OAuth did not return required tokens");
  }
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
  };
}

/**
 * Refreshes an expired Google access token.
 */
export async function refreshGoogleToken(refreshToken: string) {
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Failed to refresh Google access token");
  }
  return {
    accessToken: credentials.access_token,
    refreshToken: credentials.refresh_token ?? refreshToken,
    expiresAt: new Date(credentials.expiry_date ?? Date.now() + 3600 * 1000),
  };
}

/**
 * Sends an email via Gmail API using an OAuth access token.
 */
export async function sendGmailMessage(
  accessToken: string,
  message: { to: string; subject: string; body: string; from: string },
) {
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Encode email as RFC 2822 base64url
  const raw = Buffer.from(
    `From: ${message.from}\r\n` +
      `To: ${message.to}\r\n` +
      `Subject: ${message.subject}\r\n` +
      `Content-Type: text/html; charset=utf-8\r\n\r\n` +
      message.body,
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return {
    messageId: response.data.id,
    threadId: response.data.threadId,
  };
}
