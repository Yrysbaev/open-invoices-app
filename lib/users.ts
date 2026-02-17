import bcrypt from "bcryptjs";
import { findUserByEmail, upsertUserRecord } from "@/lib/db";

export async function verifyUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return null;

  const user = await findUserByEmail(normalizedEmail);
  if (!user) return null;

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return null;

  return { id: user.id, email: user.email, role: user.role };
}

export async function upsertUser(
  email: string,
  plainPassword: string,
  role: "admin" | "sales" = "sales"
) {
  const normalizedEmail = email.trim().toLowerCase();
  const hash = bcrypt.hashSync(plainPassword, 10);
  await upsertUserRecord(normalizedEmail, hash, role);
}

export async function getUserByEmail(email: string) {
  const user = await findUserByEmail(email);
  if (!user) return undefined;
  return { id: user.id, email: user.email, role: user.role };
}
