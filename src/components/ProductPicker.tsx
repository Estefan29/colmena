"use client";

import { useEffect, useRef, useState } from "react";

export type PickedProduct = {
  productId: number | null;
  code: string | null;
  name: string;
};

type ProductResult = {
  id: number;
  code: string;
  name: string;
  price: number;
};

export default function ProductPicker({
  label,
  placeholder = "Busca por código o nombre…",
  value,
  onChange,
  required,
}: {
  label: string;
  placeholder?: string;
  value: PickedProduct | null;
  onChange: (product: PickedProduct | null) => void;
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualName, setManualName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const res = await fetch(`/api/products?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.items);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  if (manualMode) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">
            {label} {required && <span className="text-warn">*</span>}
          </label>
          <button
            type="button"
            onClick={() => {
              setManualMode(false);
              onChange(null);
            }}
            className="text-xs text-honey-dark hover:underline cursor-pointer"
          >
            Buscar en catálogo
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Código (opcional)"
            value={manualCode}
            onChange={(e) => {
              setManualCode(e.target.value);
              onChange({ productId: null, code: e.target.value, name: manualName });
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
          />
          <input
            placeholder="Nombre del producto"
            value={manualName}
            onChange={(e) => {
              setManualName(e.target.value);
              onChange({ productId: null, code: manualCode, name: e.target.value });
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium">
          {label} {required && <span className="text-warn">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="text-xs text-honey-dark hover:underline cursor-pointer"
        >
          No está en el catálogo
        </button>
      </div>

      {value ? (
        <div className="flex items-center justify-between rounded-lg border border-honey bg-honey-light/40 px-3 py-2 text-sm">
          <span className="truncate">
            {value.code ? <span className="text-muted">{value.code} · </span> : null}
            {value.name}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
            className="text-muted hover:text-warn cursor-pointer ml-2 shrink-0"
            aria-label="Quitar"
          >
            ✕
          </button>
        </div>
      ) : (
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
        />
      )}

      {open && !value && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-border bg-card shadow-lg">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ productId: r.id, code: r.code, name: r.name });
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-honey-light/40 cursor-pointer"
              >
                <span className="text-muted">{r.code}</span> — {r.name}{" "}
                <span className="text-muted">
                  ${r.price.toLocaleString("es-CO")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !value && query.trim() && results.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg px-3 py-2 text-sm text-muted">
          Sin resultados para “{query}”.
        </div>
      )}
    </div>
  );
}
