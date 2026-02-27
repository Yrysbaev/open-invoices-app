import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { getQboCredentials, qboBaseUrl } from "@/lib/qbo";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const creds = await getQboCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Not connected to QuickBooks. Connect first." },
      { status: 401 }
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);

  let totalOverdue = 0;
  let totalOpen = 0;
  let overdueCount = 0;
  let openInvoiceCount = 0;
  let comingSoonAmount = 0;
  let comingSoonCount = 0;
  const customerIds = new Set<string>();

  let startPosition = 1;
  const pageSize = 1000;
  const maxPages = 20;

  for (let page = 0; page < maxPages; page++) {
    const invQuery = `select CustomerRef, DueDate, Balance from Invoice where Balance > '0' maxresults ${pageSize} startposition ${startPosition}`;
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

    for (const inv of invoices) {
      const customerId =
        typeof inv.CustomerRef === "object" && inv.CustomerRef?.value
          ? inv.CustomerRef.value
          : (inv as unknown as { CustomerRef?: string }).CustomerRef;
      if (customerId) customerIds.add(customerId);

      const balance = Number(inv.Balance) || 0;
      totalOpen += balance;
      openInvoiceCount += 1;

      const dueStr = inv.DueDate;
      if (dueStr) {
        const due = new Date(dueStr);
        if (!Number.isNaN(due.getTime())) {
          if (due < today) {
            totalOverdue += balance;
            overdueCount += 1;
          } else if (due <= in30Days) {
            comingSoonAmount += balance;
            comingSoonCount += 1;
          }
        }
      }
    }

    if (invoices.length < pageSize) break;
    startPosition += pageSize;
  }

  return NextResponse.json({
    totalOverdue,
    totalOpen,
    overdueCount,
    openInvoiceCount,
    comingSoonAmount,
    comingSoonCount,
    customersWithOpenBalance: customerIds.size,
  });
}
