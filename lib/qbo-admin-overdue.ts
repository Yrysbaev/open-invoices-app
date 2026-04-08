import { getResponsibleForDisplayName } from "@/lib/customer-access";
import { qboBaseUrl } from "@/lib/qbo";

export type OverdueRow = {
  customerId: string;
  displayName: string;
  phone: string;
  totalOverdue: number;
  responsible: string;
};

export async function fetchOverdueListForAdmin(params: {
  accessToken: string;
  realmId: string;
}): Promise<OverdueRow[]> {
  const { accessToken, realmId } = params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueByCustomer: Record<string, number> = {};
  let startPosition = 1;
  const pageSize = 1000;
  const maxPages = 20;

  for (let page = 0; page < maxPages; page++) {
    const invQuery = `select CustomerRef, DueDate, Balance from Invoice where Balance > '0' maxresults ${pageSize} startposition ${startPosition}`;
    const invUrl = `${qboBaseUrl()}/v3/company/${realmId}/query?query=${encodeURIComponent(invQuery)}`;
    const invRes = await fetch(invUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    if (!invRes.ok) {
      const err = await invRes.json().catch(() => ({}));
      throw new Error(
        typeof err?.Fault === "string"
          ? err.Fault
          : "Failed to load invoices from QuickBooks"
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

      const balance = Number(inv.Balance) || 0;
      const dueStr = inv.DueDate;
      if (dueStr) {
        const due = new Date(dueStr);
        if (!Number.isNaN(due.getTime()) && due < today && customerId) {
          overdueByCustomer[customerId] =
            (overdueByCustomer[customerId] ?? 0) + balance;
        }
      }
    }

    if (invoices.length < pageSize) break;
    startPosition += pageSize;
  }

  const overdueCustomerIds = Object.keys(overdueByCustomer);
  const overdueList: OverdueRow[] = [];

  if (overdueCustomerIds.length === 0) return overdueList;

  const custQuery = `select Id, DisplayName, FullyQualifiedName, PrimaryPhone from Customer maxresults 1000`;
  const custUrl = `${qboBaseUrl()}/v3/company/${realmId}/query?query=${encodeURIComponent(custQuery)}`;
  const custRes = await fetch(custUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!custRes.ok) return overdueList;

  const custData = await custRes.json();
  const customers = (custData?.QueryResponse?.Customer ?? []) as Array<{
    Id: string;
    DisplayName?: string;
    FullyQualifiedName?: string;
    PrimaryPhone?: { FreeFormNumber?: string };
  }>;
  const byId = new Map(customers.map((c) => [c.Id, c]));
  for (const cid of overdueCustomerIds) {
    const c = byId.get(cid);
    const phone =
      c?.PrimaryPhone && typeof c.PrimaryPhone === "object"
        ? (c.PrimaryPhone as { FreeFormNumber?: string }).FreeFormNumber ?? ""
        : "";
    const displayName = c?.FullyQualifiedName ?? c?.DisplayName ?? "—";
    overdueList.push({
      customerId: cid,
      displayName,
      phone: phone || "—",
      totalOverdue: overdueByCustomer[cid] ?? 0,
      responsible: getResponsibleForDisplayName(displayName),
    });
  }
  overdueList.sort((a, b) => b.totalOverdue - a.totalOverdue);
  return overdueList;
}
