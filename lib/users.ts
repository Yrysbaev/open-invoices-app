import bcrypt from "bcryptjs";
import db from "@/lib/db";

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
};

export function verifyUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return null;

  const stmt = db.prepare(
    "SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1"
  );
  const user = stmt.get(normalizedEmail) as UserRow | undefined;
  if (!user) return null;

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return null;

  return { id: user.id, email: user.email };
}

export function upsertUser(email: string, plainPassword: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const hash = bcrypt.hashSync(plainPassword, 10);

  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash)
    VALUES (?, ?)
    ON CONFLICT(email) DO UPDATE SET
      password_hash=excluded.password_hash
  `);
  stmt.run(normalizedEmail, hash);
}
