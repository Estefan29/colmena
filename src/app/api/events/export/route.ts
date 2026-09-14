import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth";
import { listEvents, type EventType } from "@/lib/events";

const TYPE_LABEL: Record<EventType, string> = {
  cambio: "Cambio",
  consumo: "Consumo interno",
  fiado: "Fiado",
};

const ROLE_LABEL: Record<string, string> = {
  entra: "Entra",
  sale: "Sale",
  consumo: "Consumo",
  fiado: "Fiado",
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "duena") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") as EventType | null) || undefined;
  const reviewedParam = searchParams.get("reviewed");
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const q = searchParams.get("q") || undefined;

  const { items } = listEvents({
    type,
    reviewed: reviewedParam === null ? undefined : reviewedParam === "1",
    from,
    to,
    q,
    page: 1,
    pageSize: 10000,
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Movimientos");
  sheet.columns = [
    { header: "Fecha", key: "fecha", width: 20 },
    { header: "Tipo", key: "tipo", width: 16 },
    { header: "Registrado por", key: "registrado_por", width: 16 },
    { header: "Detalle", key: "detalle", width: 45 },
    { header: "Cantidad", key: "cantidad", width: 10 },
    { header: "Cliente (fiado)", key: "cliente", width: 20 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "Motivo", key: "motivo", width: 40 },
    { header: "Revisado en Siigo", key: "revisado", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const event of items) {
    const detalle = event.items
      .map((i) => `${ROLE_LABEL[i.role] || i.role}: ${i.product_name || i.product_code || "?"} x${i.quantity}`)
      .join(" | ");
    sheet.addRow({
      fecha: event.created_at,
      tipo: TYPE_LABEL[event.type],
      registrado_por: event.created_by,
      detalle,
      cantidad: event.items.reduce((sum, i) => sum + i.quantity, 0),
      cliente: event.client_name || "",
      estado: event.status || "",
      motivo: event.motivo,
      revisado: event.reviewed ? "Sí" : "No",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="movimientos-distrivariedades.xlsx"`,
    },
  });
}
