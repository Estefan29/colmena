import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth";
import { getAllProducts } from "@/lib/products";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "duena") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const products = await getAllProducts();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Productos");
  sheet.columns = [
    { header: "codigo", key: "code", width: 18 },
    { header: "nombre", key: "name", width: 45 },
    { header: "precio", key: "price", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const p of products) {
    sheet.addRow({ code: p.code, name: p.name, price: p.price });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="productos-distrivariedades.xlsx"`,
    },
  });
}
