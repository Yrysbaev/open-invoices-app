import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const users = [
  { email: "ismail@sales.dallas", password: "ismail2026!" },
  { email: "ali@sales.austin", password: "ali2026!" },
  { email: "yusuf@sales.houston", password: "yusuf2026!" },
  { email: "maksatbek@sales.assistant", password: "maksatbek2026!" },
];

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "app.db");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const stmt = db.prepare(`
  INSERT INTO users (email, password_hash)
  VALUES (?, ?)
  ON CONFLICT(email) DO UPDATE SET
    password_hash=excluded.password_hash
`);

for (const user of users) {
  stmt.run(
    user.email.toLowerCase(),
    bcrypt.hashSync(user.password, 10)
  );
}

const count = db.prepare("SELECT COUNT(*) as count FROM users").get();
console.log(`Users seeded successfully. Total users: ${count.count}`);
