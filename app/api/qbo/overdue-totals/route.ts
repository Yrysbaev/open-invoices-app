import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { filterCustomersForUser } from "@/lib/customer-access";
import { getQboCredentials, qboBaseUrl } from "@/lib/qbo";

export async function GET() {
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

  // Fetch customers and filter to those this user can access
  const custQuery = `select Id, DisplayName, FullyQualifiedName from Customer maxresults 1000`;
  const custUrl = `${qboBaseUrl()}/v3/company/${creds.realmId}/query?query=${encodeURIComponent(custQuery)}`;
  const custRes = await fetch(custUrl, {
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      Accept: "application/json",
    },
  });
  if (!custRes.ok) {
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: custRes.status }
    );
  }
  const custData = await custRes.json();
  const allCustomers = (custData?.QueryResponse?.Customer ?? []) as Array<{
    Id: string;
    DisplayName?: string;
    FullyQualifiedName?: string;
  }>;
  const allowed = filterCustomersForUser(allCustomers, user);
  const allowedIds = new Set(allowed.map((c) => c.Id));

  // All open invoices (Balance > 0)
  const invQuery = `select CustomerRef, DueDate, Balance from Invoice where Balance > '0' maxresults 1000`;
  const invUrl = `${qboBaseUrl()}/v3/company/${creds.realmId}/query?query=${encodeURIComponent(invQuery)}`;
  const invRes = await fetch(invUrl, {
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      Accept: "application/json",
    },
  });
  if (!invRes.ok) {
    const err = await invRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err?.Fault || "Failed to load invoices" },
      { status: invRes.status }
    );
  }
  const invData = await invRes.json();
  const invoices = (invData?.QueryResponse?.Invoice ?? []) as Array<{
    CustomerRef?: { value?: string };
    DueDate?: string;
    Balance?: number;
  }>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totals: Record<string, number> = {};
  for (const inv of invoices) {
    const customerId =
      typeof inv.CustomerRef === "object" && inv.CustomerRef?.value
        ? inv.CustomerRef.value
        : (inv as unknown as { CustomerRef?: string }).CustomerRef;
    if (!customerId || !allowedIds.has(customerId)) continue;

    const dueStr = inv.DueDate;
    if (!dueStr) continue;
    const due = new Date(dueStr);
    if (Number.isNaN(due.getTime()) || due >= today) continue;

    const balance = Number(inv.Balance) || 0;
    totals[customerId] = (totals[customerId] ?? 0) + balance;
  }

  return NextResponse.json(totals);
}
