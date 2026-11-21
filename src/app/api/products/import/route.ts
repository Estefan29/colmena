import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth";
import { upsertProductsBulk, type UpsertRow } from "@/lib/products";

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(s: string) {
  return s.toString().trim().toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

function matchColumn(header: string) {
  const h = normalize(header);
  if (["codigo", "código", "code", "cod", "sku"].includes(h)) return "code";
  if (["nombre", "producto", "descripcion", "descripción", "name"].includes(h)) return "name";
  if (["precio", "price", "valor", "precio venta"].includes(h)) return "price";
  return null;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "duena") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(arrayBuffer);
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el archivo. Asegúrate de subir un .xlsx válido" },
      { status: 400 }
    );
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json({ error: "El archivo no tiene hojas" }, { status: 400 });
  }

  const headerRow = sheet.getRow(1);
  const columnMap: Record<number, "code" | "name" | "price"> = {};
  headerRow.eachCell((cell, colNumber) => {
    const match = matchColumn(String(cell.value ?? ""));
    if (match) columnMap[colNumber] = match;
  });

  if (
    !Object.values(columnMap).includes("code") ||
    !Object.values(columnMap).includes("name") ||
    !Object.values(columnMap).includes("price")
  ) {
    return NextResponse.json(
      {
        error:
          "El archivo debe tener columnas: codigo, nombre y precio (en la primera fila).",
      },
      { status: 400 }
    );
  }

  const errors: { row: number; message: string }[] = [];
  const validRows: UpsertRow[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0) continue;

    const record: Partial<Record<"code" | "name" | "price", string>> = {};
    for (const [colStr, field] of Object.entries(columnMap)) {
      const cell = row.getCell(Number(colStr));
      record[field] = cell.value != null ? String(cell.value).trim() : "";
    }

    const code = record.code?.trim();
    const name = record.name?.trim();
    const price = Number(record.price);

    if (!code && !name) continue;

    if (!code || !name || Number.isNaN(price) || price < 0) {
      errors.push({ row: rowNumber, message: "Faltan datos o el precio no es válido" });
      continue;
    }

    validRows.push({ code, name, price });
  }

  let created = 0;
  let updated = 0;
  try {
    const result = await upsertProductsBulk(validRows);
    created = result.created;
    updated = result.updated;
  } catch {
    return NextResponse.json(
      { error: "No se pudo guardar la importación en la base de datos" },
      { status: 500 }
    );
  }

  return NextResponse.json({ created, updated, errors });
}
