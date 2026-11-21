import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteProduct, updateProduct } from "@/lib/products";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "duena") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const code = body?.code?.trim();
  const name = body?.name?.trim();
  const price = Number(body?.price);

  if (!code || !name || Number.isNaN(price) || price < 0) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const product = await updateProduct(Number(id), code, name, price);
    if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ product });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Ya existe un producto con ese código" }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "duena") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  await deleteProduct(Number(id));
  return NextResponse.json({ ok: true });
}
