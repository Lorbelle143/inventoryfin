import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(process.env.DATABASE_URL);

// ── Bootstrap tables (runs on cold start) ─────────────────────────────────────
export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      email      TEXT   UNIQUE NOT NULL,
      password   TEXT   NOT NULL,
      name       TEXT   NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id         SERIAL PRIMARY KEY,
      user_id    INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      balance    FLOAT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id          SERIAL PRIMARY KEY,
      user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      quantity    INT NOT NULL DEFAULT 0,
      unit_price  FLOAT NOT NULL DEFAULT 0,
      total_value FLOAT NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id          SERIAL PRIMARY KEY,
      user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type        TEXT NOT NULL,
      description TEXT NOT NULL,
      amount      FLOAT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS item_transactions (
      id             SERIAL PRIMARY KEY,
      transaction_id INT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      item_id        INT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      quantity       INT NOT NULL,
      unit_price     FLOAT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         SERIAL PRIMARY KEY,
      token      TEXT UNIQUE NOT NULL,
      user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      revoked    BOOLEAN NOT NULL DEFAULT FALSE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function initializeAccount(userId: number) {
  const existing = await sql`SELECT id FROM accounts WHERE user_id = ${userId}`;
  if (existing.length === 0) {
    await sql`INSERT INTO accounts (user_id, balance) VALUES (${userId}, 10000)`;
  }
}

export async function seedInitialInventory(userId: number) {
  const count = await sql`SELECT COUNT(*) as c FROM inventory_items WHERE user_id = ${userId}`;
  if (Number(count[0].c) === 0) {
    await sql`
      INSERT INTO inventory_items (user_id, name, quantity, unit_price, total_value) VALUES
      (${userId}, 'Rice',            50, 40, 2000),
      (${userId}, 'Biscuits',        30, 25,  750),
      (${userId}, 'Instant Noodles', 40, 20,  800)
    `;
  }
}
