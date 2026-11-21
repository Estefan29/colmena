"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Role = "empleada" | "duena";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("empleada");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo iniciar sesión");
        return;
      }
      router.push(role === "duena" ? "/panel" : "/registrar");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2" aria-hidden>
            🍯
          </div>
          <h1 className="text-2xl font-semibold">DistriVariedades</h1>
          <p className="text-sm text-muted mt-1">Registro de cambios, fiados y consumo</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5"
        >
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-honey-light/40 p-1">
            {(["empleada", "duena"] as Role[]).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  role === r
                    ? "bg-honey text-white shadow-sm"
                    : "text-foreground/70 hover:bg-honey-light/60"
                }`}
              >
                {r === "empleada" ? "Soy empleada" : "Soy la dueña"}
              </button>
            ))}
          </div>

          {role === "empleada" && (
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="name">
                Tu nombre
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Karol"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
            />
          </div>

          {error && <p className="text-sm text-warn">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-honey-dark text-white font-medium py-2.5 text-sm hover:bg-honey transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
