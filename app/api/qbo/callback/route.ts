import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  // Intuit usually sends `realmId`, but tolerate casing variations.
  const realmId =
    searchParams.get("realmId") ??
    searchParams.get("realmid") ??
    searchParams.get("realmID");

  if (!code || !realmId) {
    const receivedParams = Array.from(searchParams.keys());
    return NextResponse.json(
      {
        error:
          "Missing company context from QuickBooks (realmId). Reconnect and select a company.",
        details: { hasCode: Boolean(code), receivedParams },
      },
      { status: 400 }
    );
  }

  const tokenUrl = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
  const basic = Buffer.from(
    `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
  ).toString("base64");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.QBO_REDIRECT_URI!,
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

  const data = await r.json();

  if (!r.ok) {
    return NextResponse.json({ error: data }, { status: 500 });
  }

  // TODO: save tokens + realmId to your DB (encrypted), tied to your company/account
  // For MVP: store in httpOnly cookies (replace with DB for production)
  const baseUrl = new URL(req.url).origin;
  const response = NextResponse.redirect(new URL("/dashboard", baseUrl));

  response.cookies.set("qbo_realm_id", realmId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
  response.cookies.set("qbo_access_token", data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hour (QBO tokens expire in ~1h)
    path: "/",
  });
  response.cookies.set("qbo_refresh_token", data.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 100, // ~100 days
    path: "/",
  });

  return response;
}
