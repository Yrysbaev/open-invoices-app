import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.QBO_CLIENT_ID;
  const redirectUri = process.env.QBO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "QBO_CLIENT_ID and QBO_REDIRECT_URI must be set in .env.local" },
      { status: 500 }
    );
  }

  const scope = encodeURIComponent("com.intuit.quickbooks.accounting");
  const state = crypto.randomUUID();

  // TODO: store state securely (cookie/db) to verify on callback

  const url =
    `https://appcenter.intuit.com/connect/oauth2` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  return NextResponse.redirect(url);
}
