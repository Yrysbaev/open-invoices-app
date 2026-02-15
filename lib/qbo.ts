import { cookies } from "next/headers";

export function qboBaseUrl() {
  return process.env.QBO_ENV === "sandbox"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
}

export async function getQboCredentials(): Promise<{
  accessToken: string;
  realmId: string;
} | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("qbo_access_token")?.value;
  const realmId = cookieStore.get("qbo_realm_id")?.value;

  if (!accessToken || !realmId) return null;
  return { accessToken, realmId };
}
