import { NextResponse } from "next/server";
import { getQboCredentials, qboBaseUrl } from "@/lib/qbo";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json(
      { error: "customerId required" },
      { status: 400 }
    );
  }

  const creds = await getQboCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "QuickBooks is not connected. Ask admin to reconnect." },
      { status: 401 }
    );
  }

  // QBO uses Balance > 0 for open/unpaid invoices
  const query = `select Id, DocNumber, TxnDate, TotalAmt, Balance from Invoice where CustomerRef='${customerId}' and Balance > '0' order by TxnDate desc maxresults 1000`;

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
