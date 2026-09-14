"use client";

import { useCallback, useEffect, useState } from "react";
import CambioForm from "@/components/forms/CambioForm";
import ConsumoForm from "@/components/forms/ConsumoForm";
import FiadoForm from "@/components/forms/FiadoForm";
import EventCard, { type EventWithItems } from "@/components/EventCard";

type Tab = "cambio" | "consumo" | "fiado";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "cambio", label: "Cambio", icon: "🔁" },
  { key: "consumo", label: "Consumo interno", icon: "🧴" },
  { key: "fiado", label: "Fiado", icon: "📒" },
];

export default function RegistrarPage() {
  const [tab, setTab] = useState<Tab>("cambio");
  const [today, setToday] = useState<EventWithItems[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);

  const loadToday = useCallback(async () => {
    setLoadingToday(true);
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const res = await fetch(`/api/events?from=${dateStr}&to=${dateStr}&pageSize=50`);
    if (res.ok) {
      const data = await res.json();
      setToday(data.items);
    }
    setLoadingToday(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadToday());
  }, [loadToday]);

  async function handleToggleFiadoStatus(id: number, status: "pendiente" | "pagado") {
    setToday((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Registrar movimiento</h1>
        <p className="text-sm text-muted">
          Anota aquí los cambios, fiados y consumos internos para que la dueña los vea.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="grid grid-cols-3 sm:flex gap-1 rounded-xl bg-honey-light/40 p-1 mb-5 sm:w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium leading-tight text-center transition-colors cursor-pointer ${
                tab === t.key ? "bg-honey text-white shadow-sm" : "text-foreground/70 hover:bg-honey-light/60"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === "cambio" && <CambioForm onSaved={loadToday} />}
        {tab === "consumo" && <ConsumoForm onSaved={loadToday} />}
        {tab === "fiado" && <FiadoForm onSaved={loadToday} />}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">
          Lo que registraste hoy
        </h2>
        {loadingToday ? (
          <p className="text-sm text-muted">Cargando…</p>
        ) : today.length === 0 ? (
          <p className="text-sm text-muted">Todavía no has registrado nada hoy.</p>
        ) : (
          <div className="space-y-3">
            {today.map((event) => (
              <EventCard key={event.id} event={event} onToggleFiadoStatus={handleToggleFiadoStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
