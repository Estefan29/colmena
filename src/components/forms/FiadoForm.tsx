"use client";

import { useState, type FormEvent } from "react";
import ProductPicker, { type PickedProduct } from "@/components/ProductPicker";

type Line = { id: number; product: PickedProduct | null; quantity: number };

let nextId = 1;

export default function FiadoForm({ onSaved }: { onSaved: () => void }) {
  const [clientName, setClientName] = useState("");
  const [lines, setLines] = useState<Line[]>([{ id: nextId++, product: null, quantity: 1 }]);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function updateLine(id: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { id: nextId++, product: null, quantity: 1 }]);
  }

  function removeLine(id: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    if (!clientName.trim()) {
      setError("El nombre del cliente es obligatorio");
      return;
    }
    if (lines.some((l) => !l.product || !l.product.name)) {
      setError("Selecciona todos los productos o quítalos de la lista");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fiado",
          clientName,
          motivo: nota,
          items: lines.map((l) => ({ ...l.product, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo registrar el fiado");
        return;
      }
      setClientName("");
      setNota("");
      setLines([{ id: nextId++, product: null, quantity: 1 }]);
      setOkMsg("Fiado registrado ✓");
      onSaved();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted">
        Registra lo que una clienta se lleva fiado, para que la dueña lo tenga presente.
      </p>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="cliente-fiado">
          Cliente <span className="text-warn">*</span>
        </label>
        <input
          id="cliente-fiado"
          required
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Nombre de la clienta"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
        />
      </div>

      <div className="space-y-3">
        {lines.map((line) => (
          <div key={line.id} className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <ProductPicker
              label="Producto"
              value={line.product}
              onChange={(p) => updateLine(line.id, { product: p })}
              required
            />
            <div>
              <label className="block text-sm font-medium mb-1">Cant.</label>
              <input
                type="number"
                min={1}
                step={1}
                value={line.quantity}
                onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
              />
            </div>
            <button
              type="button"
              onClick={() => removeLine(line.id)}
              disabled={lines.length === 1}
              className="text-muted hover:text-warn text-sm px-2 py-2 disabled:opacity-30 cursor-pointer"
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addLine}
          className="text-sm text-honey-dark hover:underline cursor-pointer"
        >
          + Agregar otro producto
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="nota-fiado">
          Nota (opcional)
        </label>
        <textarea
          id="nota-fiado"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          placeholder="Ej: paga el viernes"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
        />
      </div>

      {error && <p className="text-sm text-warn">{error}</p>}
      {okMsg && <p className="text-sm text-ok">{okMsg}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-honey-dark text-white font-medium px-5 py-2.5 text-sm hover:bg-honey transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Guardando…" : "Registrar fiado"}
      </button>
    </form>
  );
}
