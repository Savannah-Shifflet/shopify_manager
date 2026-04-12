/**
 * Microsoft OAuth 2.0 + Graph API client (Outlook / Microsoft 365)
 * Scopes: Mail.Send, Mail.Read
 * Tenant: "common" for multi-tenant support (configured via MICROSOFT_TENANT_ID)
 */

const AUTHORITY_BASE = "https://login.microsoftonline.com";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export function getMicrosoftAuthUrl(state: string): string {
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? "common";
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI ?? "",
    response_mode: "query",
    scope: "offline_access Mail.Send Mail.Read",
    state,
  });
  return `${AUTHORITY_BASE}/${tenantId}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeMicrosoftCode(code: string) {
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? "common";
  const response = await fetch(
    `${AUTHORITY_BASE}/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI ?? "",
        client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
        scope: "offline_access Mail.Send Mail.Read",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Microsoft token exchange failed: ${await response.text()}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function refreshMicrosoftToken(refreshToken: string) {
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? "common";
  const response = await fetch(
    `${AUTHORITY_BASE}/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
        scope: "offline_access Mail.Send Mail.Read",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Microsoft token refresh failed: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Sends an email via Microsoft Graph API.
 */
export async function sendOutlookMessage(
  accessToken: string,
  message: { to: string; subject: string; body: string },
) {
  const response = await fetch(`${GRAPH_BASE}/me/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: message.subject,
        body: { contentType: "HTML", content: message.body },
        toRecipients: [{ emailAddress: { address: message.to } }],
      },
      saveToSentItems: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Graph API send failed: ${await response.text()}`);
  }
}
