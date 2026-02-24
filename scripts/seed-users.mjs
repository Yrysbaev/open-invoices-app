import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import postgres from "postgres";

const users = [
  { email: "ismail@sales.dallas", password: "Ismail2026!", role: "sales" },
  { email: "ali@sales.austin", password: "Ali2026!", role: "sales" },
  { email: "yusuf@sales.houston", password: "Yusuf2026!", role: "sales" },
  {
    email: "office@sales.assistant",
    password: "Office#8394Makro",
    role: "admin",
  },
];
const removedUsers = ["maksatbek@sales.assistant"];

const databaseUrl = process.env.DATABASE_URL;

async function seedPostgres() {
  const sql = postgres(databaseUrl);

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'sales',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  for (const user of users) {
    await sql`
      INSERT INTO users (email, password_hash, role)
      VALUES (${user.email.toLowerCase()}, ${bcrypt.hashSync(user.password, 10)}, ${user.role})
      ON CONFLICT(email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role
    `;
  }

  for (const oldUser of removedUsers) {
    await sql`DELETE FROM users WHERE email = ${oldUser.toLowerCase()}`;
  }

  const rows = await sql`SELECT COUNT(*)::int AS count FROM users`;
  console.log(`Users seeded successfully. Total users: ${rows[0].count}`);
  await sql.end();
}

function seedSqlite() {
  const dataDir = path.join(process.cwd(), "data");
  const dbPath = path.join(dataDir, "app.db");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'sales',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const hasRole = db
    .prepare("PRAGMA table_info(users)")
    .all()
    .some((c) => c.name === "role");
  if (!hasRole) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'sales'");
  }

  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash, role)
    VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      password_hash=excluded.password_hash,
      role=excluded.role
  `);

  for (const user of users) {
    stmt.run(
      user.email.toLowerCase(),
      bcrypt.hashSync(user.password, 10),
      user.role
    );
  }

  const deleteStmt = db.prepare(`DELETE FROM users WHERE email = ?`);
  for (const oldUser of removedUsers) {
    deleteStmt.run(oldUser.toLowerCase());
  }

  const count = db.prepare("SELECT COUNT(*) as count FROM users").get();
  console.log(`Users seeded successfully. Total users: ${count.count}`);
}

if (databaseUrl) {
  seedPostgres().catch((err) => {
    console.error("Failed to seed users into Postgres:", err);
    process.exit(1);
  });
} else {
  seedSqlite();
}
