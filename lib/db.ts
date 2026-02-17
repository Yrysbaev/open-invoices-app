import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import postgres from "postgres";

type SqliteDb = Database.Database;

export type DbUser = {
  id: number;
  email: string;
  password_hash: string;
  role: "admin" | "sales";
};

export type DbQboConnection = {
  realm_id: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: number;
};

const hasPostgres = Boolean(process.env.DATABASE_URL);
const pg = hasPostgres ? postgres(process.env.DATABASE_URL as string) : null;
let sqliteDb: SqliteDb | null = null;
let initialized = false;

function getSqliteDb() {
  if (sqliteDb) return sqliteDb;
  const dataDir = path.join(process.cwd(), "data");
  const dbPath = path.join(dataDir, "app.db");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  sqliteDb = new Database(dbPath);
  return sqliteDb;
}

function initSqlite() {
  const db = getSqliteDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'sales',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const rows = db.prepare("PRAGMA table_info(users)").all() as Array<{
    name: string;
  }>;
  if (!rows.some((r) => r.name === "role")) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'sales'");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS qbo_connection (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      realm_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      access_token_expires_at INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

async function initPostgres() {
  if (!pg) return;
  await pg`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'sales',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await pg`
    CREATE TABLE IF NOT EXISTS qbo_connection (
      id INTEGER PRIMARY KEY,
      realm_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      access_token_expires_at BIGINT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
}

async function ensureInit() {
  if (initialized) return;
  if (hasPostgres) {
    await initPostgres();
  } else {
    initSqlite();
  }
  initialized = true;
}

export async function findUserByEmail(email: string) {
  await ensureInit();
  const normalized = email.trim().toLowerCase();

  if (hasPostgres && pg) {
    const rows = await pg<DbUser[]>`
      SELECT id, email, password_hash, role
      FROM users
      WHERE email = ${normalized}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  const row = getSqliteDb()
    .prepare("SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1")
    .get(normalized) as DbUser | undefined;
  return row ?? null;
}

export async function upsertUserRecord(
  email: string,
  passwordHash: string,
  role: "admin" | "sales"
) {
  await ensureInit();
  const normalized = email.trim().toLowerCase();

  if (hasPostgres && pg) {
    await pg`
      INSERT INTO users (email, password_hash, role)
      VALUES (${normalized}, ${passwordHash}, ${role})
      ON CONFLICT(email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role
    `;
    return;
  }

  getSqliteDb()
    .prepare(
      `INSERT INTO users (email, password_hash, role)
       VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         password_hash=excluded.password_hash,
         role=excluded.role`
    )
    .run(normalized, passwordHash, role);
}

export async function getQboConnectionRecord() {
  await ensureInit();
  if (hasPostgres && pg) {
    const rows = await pg<DbQboConnection[]>`
      SELECT realm_id, access_token, refresh_token, access_token_expires_at
      FROM qbo_connection
      WHERE id = 1
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  const row = getSqliteDb()
    .prepare(
      "SELECT realm_id, access_token, refresh_token, access_token_expires_at FROM qbo_connection WHERE id = 1"
    )
    .get() as DbQboConnection | undefined;
  return row ?? null;
}

export async function upsertQboConnectionRecord(params: {
  realmId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
}) {
  await ensureInit();

  if (hasPostgres && pg) {
    await pg`
      INSERT INTO qbo_connection (id, realm_id, access_token, refresh_token, access_token_expires_at, updated_at)
      VALUES (1, ${params.realmId}, ${params.accessToken}, ${params.refreshToken}, ${params.accessTokenExpiresAt}, NOW())
      ON CONFLICT(id) DO UPDATE SET
        realm_id = EXCLUDED.realm_id,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        access_token_expires_at = EXCLUDED.access_token_expires_at,
        updated_at = NOW()
    `;
    return;
  }

  getSqliteDb()
    .prepare(
      `INSERT INTO qbo_connection (id, realm_id, access_token, refresh_token, access_token_expires_at, updated_at)
       VALUES (1, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         realm_id=excluded.realm_id,
         access_token=excluded.access_token,
         refresh_token=excluded.refresh_token,
         access_token_expires_at=excluded.access_token_expires_at,
         updated_at=datetime('now')`
    )
    .run(
      params.realmId,
      params.accessToken,
      params.refreshToken,
      params.accessTokenExpiresAt
    );
}

export async function hasQboConnectionRecord() {
  await ensureInit();
  if (hasPostgres && pg) {
    const rows = await pg<{ id: number }[]>`
      SELECT id FROM qbo_connection WHERE id = 1 LIMIT 1
    `;
    return rows.length > 0;
  }

  const row = getSqliteDb()
    .prepare("SELECT id FROM qbo_connection WHERE id = 1")
    .get() as { id: number } | undefined;
  return Boolean(row);
}

// Compatibility default export for older imports.
export default {
  hasPostgres,
};
