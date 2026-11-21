import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createProduct, listProducts, searchProducts } from "@/lib/products";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const mode = searchParams.get("mode");

  if (mode === "list") {
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 20)));
    const { items, total } = await listProducts(q, page, pageSize);
    return NextResponse.json({ items, total, page, pageSize });
  }

  const items = await searchProducts(q, 20);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "duena") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const code = body?.code?.trim();
  const name = body?.name?.trim();
  const price = Number(body?.price);

  if (!code || !name || Number.isNaN(price) || price < 0) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const product = await createProduct(code, name, price);
    return NextResponse.json({ product }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Ya existe un producto con ese código" }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear el producto" }, { status: 500 });
  }
}
