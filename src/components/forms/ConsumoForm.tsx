"use client";

import { useState, type FormEvent } from "react";
import ProductPicker, { type PickedProduct } from "@/components/ProductPicker";

export default function ConsumoForm({ onSaved }: { onSaved: () => void }) {
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [qty, setQty] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    if (!product || !product.name) {
      setError("Selecciona el producto");
      return;
    }
    if (!motivo.trim()) {
      setError("El motivo es obligatorio");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "consumo", motivo, product, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo registrar");
        return;
      }
      setProduct(null);
      setQty(1);
      setMotivo("");
      setOkMsg("Consumo registrado ✓");
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
        Usa esto cuando se saca un producto del local para uso propio (ej: un shampoo para lavar
        cabezas en el negocio).
      </p>

      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <ProductPicker label="Producto" value={product} onChange={setProduct} required />
        <div>
          <label className="block text-sm font-medium mb-1">Cant.</label>
          <input
            type="number"
            min={1}
            step={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="motivo-consumo">
          Motivo <span className="text-warn">*</span>
        </label>
        <textarea
          id="motivo-consumo"
          required
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          placeholder="Ej: se usó en el local para un servicio"
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
        {loading ? "Guardando…" : "Registrar consumo"}
      </button>
    </form>
  );
}
