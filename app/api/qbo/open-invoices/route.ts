import { NextResponse } from "next/server";
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
