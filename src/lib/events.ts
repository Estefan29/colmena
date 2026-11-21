import { getDb } from "./db";

export type EventType = "cambio" | "consumo" | "fiado";
export type ItemRole = "entra" | "sale" | "consumo" | "fiado";

export type EventItemInput = {
  role: ItemRole;
  productId?: number | null;
  productCode?: string | null;
  productName?: string | null;
  quantity: number;
  unitPrice?: number | null;
};

export type CreateEventInput = {
  type: EventType;
  createdBy: string;
  motivo: string;
  clientName?: string | null;
  status?: string | null;
  items: EventItemInput[];
};

export type EventRow = {
  id: number;
  type: EventType;
  created_at: string;
  created_by: string;
  motivo: string;
  client_name: string | null;
  status: string | null;
  reviewed: number;
  reviewed_at: string | null;
};

export type EventItemRow = {
  id: number;
  event_id: number;
  role: ItemRole;
  product_id: number | null;
  product_code: string | null;
  product_name: string | null;
  quantity: number;
  unit_price: number | null;
};

export async function createEvent(input: CreateEventInput) {
  const pool = await getDb();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const eventResult = await client.query<{ id: number }>(
      `INSERT INTO events (type, created_by, motivo, client_name, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [input.type, input.createdBy, input.motivo, input.clientName ?? null, input.status ?? null]
    );
    const eventId = eventResult.rows[0].id;
    for (const item of input.items) {
      await client.query(
        `INSERT INTO event_items (event_id, role, product_id, product_code, product_name, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          eventId,
          item.role,
          item.productId ?? null,
          item.productCode ?? null,
          item.productName ?? null,
          item.quantity,
          item.unitPrice ?? null,
        ]
      );
    }
    await client.query("COMMIT");
    return getEventById(eventId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getEventById(id: number) {
  const db = await getDb();
  const eventResult = await db.query<EventRow>(`SELECT * FROM events WHERE id = $1`, [id]);
  const event = eventResult.rows[0];
  if (!event) return null;
  const itemsResult = await db.query<EventItemRow>(
    `SELECT * FROM event_items WHERE event_id = $1 ORDER BY id ASC`,
    [id]
  );
  return { ...event, items: itemsResult.rows };
}

export type ListFilters = {
  type?: EventType;
  reviewed?: boolean;
  from?: string;
  to?: string;
  q?: string;
  createdBy?: string;
  page: number;
  pageSize: number;
};

export async function listEvents(filters: ListFilters) {
  const db = await getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  function addParam(value: string | number) {
    params.push(value);
    return `$${params.length}`;
  }

  if (filters.type) {
    conditions.push(`e.type = ${addParam(filters.type)}`);
  }
  if (filters.reviewed !== undefined) {
    conditions.push(`e.reviewed = ${addParam(filters.reviewed ? 1 : 0)}`);
  }
  if (filters.from) {
    conditions.push(`e.created_at >= ${addParam(filters.from)}`);
  }
  if (filters.to) {
    conditions.push(`e.created_at <= ${addParam(filters.to + " 23:59:59")}`);
  }
  if (filters.createdBy) {
    conditions.push(`e.created_by = ${addParam(filters.createdBy)}`);
  }
  if (filters.q) {
    const q = `%${filters.q}%`;
    const p1 = addParam(q);
    const p2 = addParam(q);
    const p3 = addParam(q);
    const p4 = addParam(q);
    conditions.push(
      `(e.motivo ILIKE ${p1} OR e.client_name ILIKE ${p2} OR e.created_by ILIKE ${p3} OR EXISTS (
        SELECT 1 FROM event_items ei WHERE ei.event_id = e.id AND (ei.product_name ILIKE ${p4} OR ei.product_code ILIKE ${p4})
      ))`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM events e ${where}`,
    params
  );
  const total = Number(countResult.rows[0].count);

  const limitParam = addParam(filters.pageSize);
  const offsetParam = addParam((filters.page - 1) * filters.pageSize);

  const rowsResult = await db.query<EventRow>(
    `SELECT e.* FROM events e ${where}
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params
  );

  const items = await Promise.all(
    rowsResult.rows.map(async (row) => {
      const itemsResult = await db.query<EventItemRow>(
        `SELECT * FROM event_items WHERE event_id = $1 ORDER BY id ASC`,
        [row.id]
      );
      return { ...row, items: itemsResult.rows };
    })
  );

  return { items, total };
}

export async function setReviewed(id: number, reviewed: boolean) {
  const db = await getDb();
  await db.query(`UPDATE events SET reviewed = $1, reviewed_at = $2 WHERE id = $3`, [
    reviewed ? 1 : 0,
    reviewed ? new Date().toISOString() : null,
    id,
  ]);
  return getEventById(id);
}

export async function updateFiadoStatus(id: number, status: "pendiente" | "pagado") {
  const db = await getDb();
  await db.query(`UPDATE events SET status = $1 WHERE id = $2 AND type = 'fiado'`, [status, id]);
  return getEventById(id);
}
