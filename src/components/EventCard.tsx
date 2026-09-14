"use client";

type EventItem = {
  id: number;
  role: "entra" | "sale" | "consumo" | "fiado";
  product_id: number | null;
  product_code: string | null;
  product_name: string | null;
  quantity: number;
  unit_price: number | null;
};

export type EventWithItems = {
  id: number;
  type: "cambio" | "consumo" | "fiado";
  created_at: string;
  created_by: string;
  motivo: string;
  client_name: string | null;
  status: string | null;
  reviewed: number;
  items: EventItem[];
};

const TYPE_META: Record<EventWithItems["type"], { label: string; icon: string; className: string }> = {
  cambio: { label: "Cambio", icon: "🔁", className: "bg-blue-50 text-blue-800 border-blue-200" },
  consumo: { label: "Consumo interno", icon: "🧴", className: "bg-purple-50 text-purple-800 border-purple-200" },
  fiado: { label: "Fiado", icon: "📒", className: "bg-honey-light/60 text-honey-dark border-honey" },
};

function ProductLine({ item }: { item: EventItem }) {
  const roleLabel =
    item.role === "entra" ? "Entra" : item.role === "sale" ? "Sale" : item.role === "consumo" ? "Producto" : "Producto";
  return (
    <span className="text-sm">
      <span className="text-muted">{roleLabel}:</span>{" "}
      {item.product_code ? <span className="text-muted">{item.product_code} · </span> : null}
      {item.product_name}
      {item.quantity !== 1 && <span className="text-muted"> × {item.quantity}</span>}
    </span>
  );
}

export default function EventCard({
  event,
  onToggleReviewed,
  onToggleFiadoStatus,
  showReviewToggle,
}: {
  event: EventWithItems;
  onToggleReviewed?: (id: number, reviewed: boolean) => void;
  onToggleFiadoStatus?: (id: number, status: "pendiente" | "pagado") => void;
  showReviewToggle?: boolean;
}) {
  const meta = TYPE_META[event.type];
  const date = new Date(event.created_at.replace(" ", "T"));
  const dateStr = isNaN(date.getTime())
    ? event.created_at
    : date.toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`rounded-xl border p-4 bg-card ${event.reviewed ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${meta.className}`}>
            <span aria-hidden>{meta.icon}</span> {meta.label}
          </span>
          <span className="text-xs text-muted">{dateStr}</span>
          <span className="text-xs text-muted">· {event.created_by}</span>
        </div>
        {showReviewToggle && onToggleReviewed && (
          <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!event.reviewed}
              onChange={(e) => onToggleReviewed(event.id, e.target.checked)}
              className="accent-honey-dark"
            />
            Pasado a Siigo
          </label>
        )}
      </div>

      <div className="space-y-0.5 mb-2">
        {event.client_name && (
          <p className="text-sm">
            <span className="text-muted">Cliente:</span> {event.client_name}
          </p>
        )}
        {event.items.map((item) => (
          <div key={item.id}>
            <ProductLine item={item} />
          </div>
        ))}
      </div>

      {event.motivo && (
        <p className="text-sm text-foreground/80 italic">&ldquo;{event.motivo}&rdquo;</p>
      )}

      {event.type === "fiado" && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted">Estado:</span>
          {onToggleFiadoStatus ? (
            <select
              value={event.status || "pendiente"}
              onChange={(e) => onToggleFiadoStatus(event.id, e.target.value as "pendiente" | "pagado")}
              className={`text-xs font-medium rounded-full px-2 py-1 border cursor-pointer ${
                event.status === "pagado"
                  ? "bg-ok/10 text-ok border-ok/30"
                  : "bg-warn/10 text-warn border-warn/30"
              }`}
            >
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
            </select>
          ) : (
            <span className="text-xs font-medium">{event.status}</span>
          )}
        </div>
      )}
    </div>
  );
}
