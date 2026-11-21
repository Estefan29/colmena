import { cookies } from "next/headers";

export const SESSION_COOKIE = "colmena_session";

export type Role = "empleada" | "duena";

export type Session = {
  role: Role;
  name: string;
};

function getSecret() {
  return process.env.AUTH_SECRET || "colmena-dev-secret-cambia-esto";
}

let cachedKey: Promise<CryptoKey> | null = null;

function getKey() {
  if (!cachedKey) {
    cachedKey = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(getSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return cachedKey;
}

function bytesToHex(bytes: ArrayBuffer | Uint8Array) {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sign(payloadBytes: Uint8Array) {
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, payloadBytes as BufferSource);
  return bytesToHex(sig);
}

export async function createSessionToken(session: Session) {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(session));
  const payloadHex = bytesToHex(payloadBytes);
  const sigHex = await sign(payloadBytes);
  return `${payloadHex}.${sigHex}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const [payloadHex, sigHex] = token.split(".");
  if (!payloadHex || !sigHex) return null;

  let payloadBytes: Uint8Array;
  try {
    payloadBytes = hexToBytes(payloadHex);
  } catch {
    return null;
  }

  const expectedSigHex = await sign(payloadBytes);
  if (!timingSafeEqualHex(sigHex, expectedSigHex)) return null;

  try {
    const session = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (
      session &&
      (session.role === "empleada" || session.role === "duena") &&
      typeof session.name === "string"
    ) {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export function checkPassword(role: Role, password: string) {
  const expected =
    role === "duena"
      ? process.env.OWNER_PASSWORD || "duena123"
      : process.env.EMPLOYEE_PASSWORD || "empleada123";
  return password === expected;
}
