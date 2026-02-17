import { NextResponse } from "next/server";
import { getQboCredentials, qboBaseUrl } from "@/lib/qbo";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoiceId");

  if (!invoiceId) {
    return NextResponse.json(
      { error: "invoiceId required" },
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

  const url = `${qboBaseUrl()}/v3/company/${creds.realmId}/invoice/${invoiceId}/pdf`;

  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      Accept: "application/pdf",
    },
  });

  if (!r.ok) {
    const txt = await r.text();
    return NextResponse.json({ error: txt }, { status: 500 });
  }

  const pdf = await r.arrayBuffer();
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoiceId}.pdf"`,
    },
  });
}
