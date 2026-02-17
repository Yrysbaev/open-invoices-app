import { cookies } from "next/headers";
import { getSalesCookieName } from "@/lib/sales-auth";
import { getUserByEmail } from "@/lib/users";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const email = cookieStore.get(getSalesCookieName())?.value;
  if (!email) return null;

  const user = await getUserByEmail(email);
  return user ?? null;
}

export async function requireAdminUser() {
  const user = await getCurrentUser();
  return Boolean(user && user.role === "admin");
}
