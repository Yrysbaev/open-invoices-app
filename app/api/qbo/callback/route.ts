import { NextResponse } from "next/server";
import { saveQboConnection } from "@/lib/qbo";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");

  if (!code || !realmId) {
    return NextResponse.json(
      { error: "Missing code or realmId from QuickBooks" },
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

  await saveQboConnection({
    realmId,
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token),
    expiresIn: Number(data.expires_in ?? 3600),
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
