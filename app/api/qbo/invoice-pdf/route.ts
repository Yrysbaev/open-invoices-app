import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { canAccessCustomerByDisplayName } from "@/lib/customer-access";
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

  const customerName = await getInvoiceCustomerDisplayName(
    creds.accessToken,
    creds.realmId,
    invoiceId
  );
  if (!customerName) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (
    !canAccessCustomerByDisplayName({
      email: user.email,
      role: user.role,
      displayName: customerName,
    })
  ) {
    return NextResponse.json({ error: "Forbidden invoice access" }, { status: 403 });
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

async function getInvoiceCustomerDisplayName(
  accessToken: string,
  realmId: string,
  invoiceId: string
) {
  const invoiceUrl = `${qboBaseUrl()}/v3/company/${realmId}/invoice/${invoiceId}`;
  const invoiceRes = await fetch(invoiceUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!invoiceRes.ok) return null;
  const invoiceData = await invoiceRes.json();
  const customerId = invoiceData?.Invoice?.CustomerRef?.value as string | undefined;
  if (!customerId) return null;

  const query = `select Id, DisplayName, FullyQualifiedName from Customer where Id='${customerId}' maxresults 1`;
  const customerUrl = `${qboBaseUrl()}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`;
  const customerRes = await fetch(customerUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!customerRes.ok) return null;
  const customerData = await customerRes.json();
  return (
    customerData?.QueryResponse?.Customer?.[0]?.FullyQualifiedName ??
    customerData?.QueryResponse?.Customer?.[0]?.DisplayName ??
    null
  );
}
