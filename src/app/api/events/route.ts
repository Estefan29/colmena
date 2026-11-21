import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createEvent, listEvents, type EventItemInput, type EventType } from "@/lib/events";
import { getDb } from "@/lib/db";
import type { Product } from "@/lib/products";

async function resolveProductRef(ref: {
  productId?: number | null;
  code?: string | null;
  name?: string | null;
}): Promise<{ productId: number | null; code: string | null; name: string | null; price: number | null } | null> {
  if (ref.productId) {
    const db = await getDb();
    const { rows } = await db.query<Product>(`SELECT * FROM products WHERE id = $1`, [ref.productId]);
    const product = rows[0];
    if (!product) return null;
    return { productId: product.id, code: product.code, name: product.name, price: product.price };
  }
  const code = ref.code?.trim() || null;
  const name = ref.name?.trim() || null;
  if (!name) return null;
  return { productId: null, code, name, price: null };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || 20)));
  const type = (searchParams.get("type") as EventType | null) || undefined;
  const reviewedParam = searchParams.get("reviewed");
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const q = searchParams.get("q") || undefined;

  const createdBy = session.role === "empleada" ? session.name : searchParams.get("createdBy") || undefined;

  const { items, total } = await listEvents({
    type,
    reviewed: reviewedParam === null ? undefined : reviewedParam === "1",
    from,
    to,
    q,
    createdBy,
    page,
    pageSize,
  });

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.type) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const createdBy = session.name;
  const items: EventItemInput[] = [];
  let motivo: string = (body.motivo || "").trim();
  let clientName: string | null = null;
  let status: string | null = null;

  if (body.type === "cambio") {
    if (!motivo) {
      return NextResponse.json({ error: "El motivo del cambio es obligatorio" }, { status: 400 });
    }
    const sale = await resolveProductRef(body.saleProduct || {});
    const entra = await resolveProductRef(body.entraProduct || {});
    if (!sale || !entra) {
      return NextResponse.json(
        { error: "Debes indicar el producto que sale y el que entra" },
        { status: 400 }
      );
    }
    items.push({
      role: "sale",
      productId: sale.productId,
      productCode: sale.code,
      productName: sale.name,
      quantity: Number(body.saleQuantity) || 1,
      unitPrice: sale.price,
    });
    items.push({
      role: "entra",
      productId: entra.productId,
      productCode: entra.code,
      productName: entra.name,
      quantity: Number(body.entraQuantity) || 1,
      unitPrice: entra.price,
    });
  } else if (body.type === "consumo") {
    if (!motivo) {
      return NextResponse.json({ error: "El motivo es obligatorio" }, { status: 400 });
    }
    const product = await resolveProductRef(body.product || {});
    if (!product) {
      return NextResponse.json({ error: "Selecciona el producto" }, { status: 400 });
    }
    items.push({
      role: "consumo",
      productId: product.productId,
      productCode: product.code,
      productName: product.name,
      quantity: Number(body.quantity) || 1,
      unitPrice: product.price,
    });
  } else if (body.type === "fiado") {
    clientName = (body.clientName || "").trim();
    if (!clientName) {
      return NextResponse.json({ error: "El nombre del cliente es obligatorio" }, { status: 400 });
    }
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Agrega al menos un producto" }, { status: 400 });
    }
    for (const raw of rawItems) {
      const product = await resolveProductRef(raw);
      if (!product) {
        return NextResponse.json({ error: "Hay un producto sin seleccionar" }, { status: 400 });
      }
      items.push({
        role: "fiado",
        productId: product.productId,
        productCode: product.code,
        productName: product.name,
        quantity: Number(raw.quantity) || 1,
        unitPrice: product.price,
      });
    }
    status = "pendiente";
    motivo = motivo || "Fiado";
  } else {
    return NextResponse.json({ error: "Tipo de registro inválido" }, { status: 400 });
  }

  const event = await createEvent({
    type: body.type,
    createdBy,
    motivo,
    clientName,
    status,
    items,
  });

  return NextResponse.json({ event }, { status: 201 });
}
