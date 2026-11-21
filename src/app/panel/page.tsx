"use client";

import { useCallback, useEffect, useState } from "react";
import EventCard, { type EventWithItems } from "@/components/EventCard";

type TypeFilter = "" | "cambio" | "consumo" | "fiado";
type ReviewedFilter = "" | "0" | "1";

export default function PanelPage() {
  const [items, setItems] = useState<EventWithItems[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<TypeFilter>("");
  const [reviewed, setReviewed] = useState<ReviewedFilter>("0");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  const buildParams = useCallback(
    (p: number) => {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("pageSize", String(pageSize));
      if (type) params.set("type", type);
      if (reviewed) params.set("reviewed", reviewed);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (q) params.set("q", q);
      return params;
    },
    [type, reviewed, from, to, q]
  );

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      const res = await fetch(`/api/events?${buildParams(p).toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
        setPage(p);
      }
      setLoading(false);
    },
    [buildParams]
  );

  useEffect(() => {
    void Promise.resolve().then(() => load(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, reviewed, from, to, q]);

  async function toggleReviewed(id: number, value: boolean) {
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, reviewed: value ? 1 : 0 } : e)));
    await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewed: value }),
    });
    if (reviewed !== "") {
      load(page);
    }
  }

  async function toggleFiadoStatus(id: number, status: "pendiente" | "pagado") {
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold mb-1">Panel de movimientos</h1>
          <p className="text-sm text-muted">
            Todo lo que registran tus compañeras: cambios, fiados y consumo interno.
          </p>
        </div>
        <a
          href={`/api/events/export?${buildParams(1).toString()}`}
          className="rounded-lg border border-honey text-honey-dark font-medium px-4 py-2 text-sm hover:bg-honey-light/40 transition-colors"
        >
          Exportar a Excel
        </a>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TypeFilter)}
            className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
          >
            <option value="">Todos</option>
            <option value="cambio">Cambios</option>
            <option value="consumo">Consumo interno</option>
            <option value="fiado">Fiados</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Estado Siigo</label>
          <select
            value={reviewed}
            onChange={(e) => setReviewed(e.target.value as ReviewedFilter)}
            className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
          >
            <option value="">Todos</option>
            <option value="0">Pendientes</option>
            <option value="1">Ya pasados</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Buscar</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Producto, cliente, empleada…"
            className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
          />
        </div>
      </div>

      <div>
        <p className="text-sm text-muted mb-3">
          {total} {total === 1 ? "resultado" : "resultados"}
        </p>

        {loading ? (
          <p className="text-sm text-muted">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">No hay movimientos con estos filtros.</p>
        ) : (
          <div className="space-y-3">
            {items.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                showReviewToggle
                onToggleReviewed={toggleReviewed}
                onToggleFiadoStatus={toggleFiadoStatus}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => load(page - 1)}
              disabled={page <= 1}
              className="text-sm px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 cursor-pointer"
            >
              Anterior
            </button>
            <span className="text-sm text-muted">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => load(page + 1)}
              disabled={page >= totalPages}
              className="text-sm px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
