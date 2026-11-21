import { Pool, types } from "pg";

// Postgres returns NUMERIC as a string by default; we want plain numbers (prices, quantities).
types.setTypeParser(types.builtins.NUMERIC, (value) => parseFloat(value));

declare global {
  var __colmenaPool: Pool | undefined;
  var __colmenaSchemaReady: Promise<void> | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta la variable de entorno DATABASE_URL (conexión a Postgres). Revisa el README."
    );
  }
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  // The shop operates in Colombia; interpreting date-only filters ("today")
  // in that timezone instead of the DB server's default (UTC) keeps "today"
  // aligned with the shop's actual day.
  pool.on("connect", (client) => {
    client.query("SET TIME ZONE 'America/Bogota'").catch(() => {});
  });
  return pool;
}

function getPool() {
  if (!global.__colmenaPool) {
    global.__colmenaPool = createPool();
  }
  return global.__colmenaPool;
}

async function ensureSchema(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      price NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('cambio','consumo','fiado')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by TEXT NOT NULL,
      motivo TEXT NOT NULL,
      client_name TEXT,
      status TEXT,
      reviewed INTEGER NOT NULL DEFAULT 0,
      reviewed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_reviewed ON events(reviewed);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

    CREATE TABLE IF NOT EXISTS event_items (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('entra','sale','consumo','fiado')),
      product_id INTEGER REFERENCES products(id),
      product_code TEXT,
      product_name TEXT,
      quantity NUMERIC NOT NULL DEFAULT 1,
      unit_price NUMERIC
    );

    CREATE INDEX IF NOT EXISTS idx_event_items_event ON event_items(event_id);
  `);
}

export async function getDb() {
  const pool = getPool();
  if (!global.__colmenaSchemaReady) {
    global.__colmenaSchemaReady = ensureSchema(pool);
  }
  await global.__colmenaSchemaReady;
  return pool;
}
