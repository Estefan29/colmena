import { getDb } from "./db";

export type Product = {
  id: number;
  code: string;
  name: string;
  price: number;
  created_at: string;
  updated_at: string;
};

export function searchProducts(query: string, limit = 20) {
  const db = getDb();
  const q = `%${query.trim()}%`;
  return db
    .prepare(
      `SELECT * FROM products
       WHERE code LIKE ? OR name LIKE ?
       ORDER BY name ASC
       LIMIT ?`
    )
    .all(q, q, limit) as Product[];
}

export function listProducts(query: string, page: number, pageSize: number) {
  const db = getDb();
  const q = `%${query.trim()}%`;
  const total = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM products WHERE code LIKE ? OR name LIKE ?`
      )
      .get(q, q) as { count: number }
  ).count;
  const items = db
    .prepare(
      `SELECT * FROM products
       WHERE code LIKE ? OR name LIKE ?
       ORDER BY name ASC
       LIMIT ? OFFSET ?`
    )
    .all(q, q, pageSize, (page - 1) * pageSize) as Product[];
  return { items, total };
}

export function createProduct(code: string, name: string, price: number) {
  const db = getDb();
  const info = db
    .prepare(`INSERT INTO products (code, name, price) VALUES (?, ?, ?)`)
    .run(code.trim(), name.trim(), price);
  return db.prepare(`SELECT * FROM products WHERE id = ?`).get(info.lastInsertRowid) as Product;
}

export function updateProduct(id: number, code: string, name: string, price: number) {
  const db = getDb();
  db.prepare(
    `UPDATE products SET code = ?, name = ?, price = ?, updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(code.trim(), name.trim(), price, id);
  return db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as Product | undefined;
}

export function deleteProduct(id: number) {
  const db = getDb();
  db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
}

export function upsertProductByCode(code: string, name: string, price: number) {
  const db = getDb();
  const existing = db.prepare(`SELECT id FROM products WHERE code = ?`).get(code) as
    | { id: number }
    | undefined;
  if (existing) {
    db.prepare(
      `UPDATE products SET name = ?, price = ?, updated_at = datetime('now','localtime') WHERE id = ?`
    ).run(name, price, existing.id);
    return "updated" as const;
  }
  db.prepare(`INSERT INTO products (code, name, price) VALUES (?, ?, ?)`).run(code, name, price);
  return "created" as const;
}

export function getAllProducts() {
  const db = getDb();
  return db.prepare(`SELECT * FROM products ORDER BY name ASC`).all() as Product[];
}

export function countProducts() {
  const db = getDb();
  return (db.prepare(`SELECT COUNT(*) as count FROM products`).get() as { count: number }).count;
}
