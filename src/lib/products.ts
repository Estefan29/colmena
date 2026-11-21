import { getDb } from "./db";

export type Product = {
  id: number;
  code: string;
  name: string;
  price: number;
  created_at: string;
  updated_at: string;
};

export async function searchProducts(query: string, limit = 20) {
  const db = await getDb();
  const q = `%${query.trim()}%`;
  const { rows } = await db.query<Product>(
    `SELECT * FROM products
     WHERE code ILIKE $1 OR name ILIKE $1
     ORDER BY name ASC
     LIMIT $2`,
    [q, limit]
  );
  return rows;
}

export async function listProducts(query: string, page: number, pageSize: number) {
  const db = await getDb();
  const q = `%${query.trim()}%`;
  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM products WHERE code ILIKE $1 OR name ILIKE $1`,
    [q]
  );
  const total = Number(countResult.rows[0].count);
  const { rows } = await db.query<Product>(
    `SELECT * FROM products
     WHERE code ILIKE $1 OR name ILIKE $1
     ORDER BY name ASC
     LIMIT $2 OFFSET $3`,
    [q, pageSize, (page - 1) * pageSize]
  );
  return { items: rows, total };
}

export async function createProduct(code: string, name: string, price: number) {
  const db = await getDb();
  const { rows } = await db.query<Product>(
    `INSERT INTO products (code, name, price) VALUES ($1, $2, $3) RETURNING *`,
    [code.trim(), name.trim(), price]
  );
  return rows[0];
}

export async function updateProduct(id: number, code: string, name: string, price: number) {
  const db = await getDb();
  const { rows } = await db.query<Product>(
    `UPDATE products SET code = $1, name = $2, price = $3, updated_at = now() WHERE id = $4 RETURNING *`,
    [code.trim(), name.trim(), price, id]
  );
  return rows[0] as Product | undefined;
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  await db.query(`DELETE FROM products WHERE id = $1`, [id]);
}

export type UpsertRow = { code: string; name: string; price: number };

/**
 * Upserts many rows in a handful of bulk statements instead of one round-trip
 * per row — needed because an import can have 3000+ rows and each round-trip
 * to a remote Postgres adds real latency.
 */
export async function upsertProductsBulk(rows: UpsertRow[], chunkSize = 500) {
  const db = await getDb();
  let created = 0;
  let updated = 0;

  // A single INSERT ... ON CONFLICT can't touch the same key twice, so if the
  // file has a duplicated code, keep only its last occurrence (same result as
  // applying the rows one by one, in order).
  const byCode = new Map<string, UpsertRow>();
  for (const row of rows) byCode.set(row.code, row);
  const deduped = [...byCode.values()];

  for (let i = 0; i < deduped.length; i += chunkSize) {
    const chunk = deduped.slice(i, i + chunkSize);
    const values: string[] = [];
    const params: (string | number)[] = [];
    chunk.forEach((row, idx) => {
      const base = idx * 3;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      params.push(row.code, row.name, row.price);
    });

    const { rows: resultRows } = await db.query<{ inserted: boolean }>(
      `INSERT INTO products (code, name, price)
       VALUES ${values.join(", ")}
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      params
    );

    for (const r of resultRows) {
      if (r.inserted) created++;
      else updated++;
    }
  }

  return { created, updated };
}

export async function getAllProducts() {
  const db = await getDb();
  const { rows } = await db.query<Product>(`SELECT * FROM products ORDER BY name ASC`);
  return rows;
}
