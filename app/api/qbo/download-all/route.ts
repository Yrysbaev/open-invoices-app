import { NextResponse } from "next/server";
import { PassThrough, Readable } from "stream";
import archiver from "archiver";
import { getCurrentUser } from "@/lib/auth-server";
import { canAccessCustomerByDisplayName } from "@/lib/customer-access";
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

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creds = await getQboCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Not connected to QuickBooks. Connect first." },
      { status: 401 }
    );
  }

  const customerName = await getCustomerDisplayName(
    creds.accessToken,
    creds.realmId,
    customerId
  );
  if (!customerName) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  if (
    !canAccessCustomerByDisplayName({
      email: user.email,
      role: user.role,
      displayName: customerName,
    })
  ) {
    return NextResponse.json({ error: "Forbidden customer access" }, { status: 403 });
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

async function getCustomerDisplayName(
  accessToken: string,
  realmId: string,
  customerId: string
) {
  const query = `select Id, DisplayName, FullyQualifiedName from Customer where Id='${customerId}' maxresults 1`;
  const url = `${qboBaseUrl()}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!r.ok) return null;
  const data = await r.json();
  return (
    data?.QueryResponse?.Customer?.[0]?.FullyQualifiedName ??
    data?.QueryResponse?.Customer?.[0]?.DisplayName ??
    null
  );
}
