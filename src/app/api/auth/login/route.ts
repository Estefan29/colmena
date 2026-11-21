import { NextRequest, NextResponse } from "next/server";
import { checkPassword, createSessionToken, SESSION_COOKIE, type Role } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const role: Role | undefined = body?.role;
  const name: string | undefined = body?.name?.trim();
  const password: string | undefined = body?.password;

  if (!role || (role !== "empleada" && role !== "duena")) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }
  if (role === "empleada" && !name) {
    return NextResponse.json({ error: "Escribe tu nombre" }, { status: 400 });
  }
  if (!password || !checkPassword(role, password)) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const token = await createSessionToken({
    role,
    name: role === "duena" ? "Dueña" : name!,
  });

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
