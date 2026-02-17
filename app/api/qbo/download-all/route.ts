import { NextResponse } from "next/server";
import { PassThrough, Readable } from "stream";
import archiver from "archiver";
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

  // Fetch open invoices
  const query = `select Id, DocNumber from Invoice where CustomerRef='${customerId}' and Balance > '0' order by TxnDate desc maxresults 100`;
  const queryUrl = `${qboBaseUrl()}/v3/company/${creds.realmId}/query?query=${encodeURIComponent(query)}`;

  const queryRes = await fetch(queryUrl, {
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      Accept: "application/json",
    },
  });

  const queryData = await queryRes.json();
  const invoices = queryData?.QueryResponse?.Invoice ?? [];

  if (invoices.length === 0) {
    return NextResponse.json(
      { error: "No open invoices to download" },
      { status: 404 }
    );
  }

  const archive = archiver("zip", { zlib: { level: 6 } });
  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  for (const inv of invoices) {
    const pdfUrl = `${qboBaseUrl()}/v3/company/${creds.realmId}/invoice/${inv.Id}/pdf`;
    const pdfRes = await fetch(pdfUrl, {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        Accept: "application/pdf",
      },
    });

    if (pdfRes.ok) {
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
      archive.append(pdfBuffer, {
        name: `invoice-${inv.DocNumber || inv.Id}.pdf`,
      });
    }
  }

  archive.finalize();

  return new Response(Readable.toWeb(passThrough) as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="open-invoices.zip"`,
    },
  });
}
