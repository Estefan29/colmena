"use client";

import { useState, type FormEvent } from "react";
import ProductPicker, { type PickedProduct } from "@/components/ProductPicker";

export default function CambioForm({ onSaved }: { onSaved: () => void }) {
  const [sale, setSale] = useState<PickedProduct | null>(null);
  const [saleQty, setSaleQty] = useState(1);
  const [entra, setEntra] = useState<PickedProduct | null>(null);
  const [entraQty, setEntraQty] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    if (!sale || !sale.name || !entra || !entra.name) {
      setError("Selecciona el producto que sale y el que entra");
      return;
    }
    if (!motivo.trim()) {
      setError("El motivo del cambio es obligatorio");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "cambio",
          motivo,
          saleProduct: sale,
          saleQuantity: saleQty,
          entraProduct: entra,
          entraQuantity: entraQty,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo registrar el cambio");
        return;
      }
      setSale(null);
      setEntra(null);
      setSaleQty(1);
      setEntraQty(1);
      setMotivo("");
      setOkMsg("Cambio registrado ✓");
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
        Usa esto cuando una clienta cambia un producto por otro (talla, olor, color, etc).
      </p>

      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <ProductPicker label="Producto que sale" value={sale} onChange={setSale} required />
        <div>
          <label className="block text-sm font-medium mb-1">Cant.</label>
          <input
            type="number"
            min={1}
            step={1}
            value={saleQty}
            onChange={(e) => setSaleQty(Number(e.target.value))}
            className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <ProductPicker label="Producto que entra" value={entra} onChange={setEntra} required />
        <div>
          <label className="block text-sm font-medium mb-1">Cant.</label>
          <input
            type="number"
            min={1}
            step={1}
            value={entraQty}
            onChange={(e) => setEntraQty(Number(e.target.value))}
            className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="motivo-cambio">
          Motivo del cambio <span className="text-warn">*</span>
        </label>
        <textarea
          id="motivo-cambio"
          required
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          placeholder="Ej: la clienta lo cambió porque le quedó grande"
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
        {loading ? "Guardando…" : "Registrar cambio"}
      </button>
    </form>
  );
}
