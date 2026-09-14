import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(/* turbopackIgnore: true */ dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "colmena.db");

declare global {
  var __colmenaDb: Database.Database | undefined;
}

function createConnection() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('cambio','consumo','fiado')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      created_by TEXT NOT NULL,
      motivo TEXT NOT NULL,
      client_name TEXT,
      status TEXT,
      reviewed INTEGER NOT NULL DEFAULT 0,
      reviewed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_reviewed ON events(reviewed);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

    CREATE TABLE IF NOT EXISTS event_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('entra','sale','consumo','fiado')),
      product_id INTEGER REFERENCES products(id),
      product_code TEXT,
      product_name TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL
    );

    CREATE INDEX IF NOT EXISTS idx_event_items_event ON event_items(event_id);
  `);
  return db;
}

export function getDb() {
  if (!global.__colmenaDb) {
    global.__colmenaDb = createConnection();
  }
  return global.__colmenaDb;
}
