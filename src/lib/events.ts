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

export function createEvent(input: CreateEventInput) {
  const db = getDb();
  const insertEvent = db.prepare(
    `INSERT INTO events (type, created_by, motivo, client_name, status)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO event_items (event_id, role, product_id, product_code, product_name, quantity, unit_price)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const run = db.transaction(() => {
    const info = insertEvent.run(
      input.type,
      input.createdBy,
      input.motivo,
      input.clientName ?? null,
      input.status ?? null
    );
    const eventId = info.lastInsertRowid as number;
    for (const item of input.items) {
      insertItem.run(
        eventId,
        item.role,
        item.productId ?? null,
        item.productCode ?? null,
        item.productName ?? null,
        item.quantity,
        item.unitPrice ?? null
      );
    }
    return eventId;
  });

  const eventId = run();
  return getEventById(eventId);
}

export function getEventById(id: number) {
  const db = getDb();
  const event = db.prepare(`SELECT * FROM events WHERE id = ?`).get(id) as EventRow | undefined;
  if (!event) return null;
  const items = db
    .prepare(`SELECT * FROM event_items WHERE event_id = ? ORDER BY id ASC`)
    .all(id) as EventItemRow[];
  return { ...event, items };
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

export function listEvents(filters: ListFilters) {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.type) {
    conditions.push("e.type = ?");
    params.push(filters.type);
  }
  if (filters.reviewed !== undefined) {
    conditions.push("e.reviewed = ?");
    params.push(filters.reviewed ? 1 : 0);
  }
  if (filters.from) {
    conditions.push("e.created_at >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push("e.created_at <= ?");
    params.push(filters.to + " 23:59:59");
  }
  if (filters.createdBy) {
    conditions.push("e.created_by = ?");
    params.push(filters.createdBy);
  }
  if (filters.q) {
    conditions.push(
      `(e.motivo LIKE ? OR e.client_name LIKE ? OR e.created_by LIKE ? OR EXISTS (
        SELECT 1 FROM event_items ei WHERE ei.event_id = e.id AND (ei.product_name LIKE ? OR ei.product_code LIKE ?)
      ))`
    );
    const q = `%${filters.q}%`;
    params.push(q, q, q, q, q);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = (
    db.prepare(`SELECT COUNT(*) as count FROM events e ${where}`).get(...params) as {
      count: number;
    }
  ).count;

  const rows = db
    .prepare(
      `SELECT e.* FROM events e ${where}
       ORDER BY e.created_at DESC, e.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, filters.pageSize, (filters.page - 1) * filters.pageSize) as EventRow[];

  const itemsStmt = db.prepare(`SELECT * FROM event_items WHERE event_id = ? ORDER BY id ASC`);
  const items = rows.map((row) => ({
    ...row,
    items: itemsStmt.all(row.id) as EventItemRow[],
  }));

  return { items, total };
}

export function setReviewed(id: number, reviewed: boolean) {
  const db = getDb();
  db.prepare(
    `UPDATE events SET reviewed = ?, reviewed_at = ? WHERE id = ?`
  ).run(reviewed ? 1 : 0, reviewed ? new Date().toISOString() : null, id);
  return getEventById(id);
}

export function countPendingEvents() {
  const db = getDb();
  return (
    db.prepare(`SELECT COUNT(*) as count FROM events WHERE reviewed = 0`).get() as {
      count: number;
    }
  ).count;
}

export function updateFiadoStatus(id: number, status: "pendiente" | "pagado") {
  const db = getDb();
  db.prepare(`UPDATE events SET status = ? WHERE id = ? AND type = 'fiado'`).run(status, id);
  return getEventById(id);
}
