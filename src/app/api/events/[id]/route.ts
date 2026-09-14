import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setReviewed, updateFiadoStatus } from "@/lib/events";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (typeof body?.reviewed === "boolean") {
    if (session.role !== "duena") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const event = setReviewed(Number(id), body.reviewed);
    return NextResponse.json({ event });
  }

  if (body?.status === "pendiente" || body?.status === "pagado") {
    const event = updateFiadoStatus(Number(id), body.status);
    return NextResponse.json({ event });
  }

  return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
}
