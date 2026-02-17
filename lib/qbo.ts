import {
  getQboConnectionRecord,
  hasQboConnectionRecord,
  upsertQboConnectionRecord,
} from "@/lib/db";

export function qboBaseUrl() {
  return process.env.QBO_ENV === "sandbox"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
}

export async function getQboCredentials(): Promise<{
  accessToken: string;
  realmId: string;
} | null> {
  const conn = await getQboConnectionRecord();

  if (!conn) return null;

  const now = Date.now();
  if (conn.access_token_expires_at <= now + 30_000) {
    const refreshed = await refreshQboToken(conn.refresh_token);
    if (!refreshed) return null;

    const nextExpiresAt = now + refreshed.expiresIn * 1000;
    await upsertQboConnectionRecord({
      realmId: conn.realm_id,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      accessTokenExpiresAt: nextExpiresAt,
    });

    return { accessToken: refreshed.accessToken, realmId: conn.realm_id };
  }

  return { accessToken: conn.access_token, realmId: conn.realm_id };
}

export async function saveQboConnection(params: {
  realmId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  const expiresAt = Date.now() + params.expiresIn * 1000;
  await upsertQboConnectionRecord({
    realmId: params.realmId,
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    accessTokenExpiresAt: expiresAt,
  });
}

export async function hasQboConnection() {
  return hasQboConnectionRecord();
}

async function refreshQboToken(refreshToken: string) {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const tokenUrl = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const r = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const data = await r.json().catch(() => null);
  if (!r.ok || !data?.access_token || !data?.refresh_token) return null;

  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token),
    expiresIn: Number(data.expires_in ?? 3600),
  };
}
