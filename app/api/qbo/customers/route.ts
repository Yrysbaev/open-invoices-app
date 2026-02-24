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

  const query = `select Id, DisplayName, FullyQualifiedName from Customer maxresults 1000`;
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

  const customers = (data?.QueryResponse?.Customer ?? []) as Array<{
    Id: string;
    DisplayName?: string;
    FullyQualifiedName?: string;
  }>;
  const filtered = filterCustomersForUser(customers, user);
  if (data?.QueryResponse) {
    data.QueryResponse.Customer = filtered;
  }

  return NextResponse.json(data);
}
