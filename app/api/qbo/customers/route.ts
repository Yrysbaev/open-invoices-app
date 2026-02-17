import { NextResponse } from "next/server";
import { getQboCredentials, qboBaseUrl } from "@/lib/qbo";

export async function GET() {
  const creds = await getQboCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "QuickBooks is not connected. Ask admin to reconnect." },
      { status: 401 }
    );
  }

  const query = `select Id, DisplayName from Customer maxresults 1000`;
  const url = `${qboBaseUrl()}/v3/company/${creds.realmId}/query?query=${encodeURIComponent(query)}`;

  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      Accept: "application/json",
    },
  });

  const data = await r.json();

  if (!r.ok) {
    return NextResponse.json(
      { error: data?.Fault || data },
      { status: r.status }
    );
  }

  return NextResponse.json(data);
}
