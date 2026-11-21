"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Product = {
  id: number;
  code: string;
  name: string;
  price: number;
};

type ImportSummary = {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
};

function formatPrice(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export default function ProductosPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (p: number, query: string) => {
    setLoading(true);
    const params = new URLSearchParams({ mode: "list", page: String(p), pageSize: String(pageSize), q: query });
    const res = await fetch(`/api/products?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setPage(p);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => load(1, q), 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    const price = Number(newPrice);
    if (!newCode.trim() || !newName.trim() || Number.isNaN(price) || price < 0) {
      setAddError("Completa código, nombre y un precio válido");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode, name: newName, price }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "No se pudo crear");
        return;
      }
      setNewCode("");
      setNewName("");
      setNewPrice("");
      setShowAdd(false);
      load(1, q);
    } catch {
      setAddError("Error de conexión");
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEditCode(p.code);
    setEditName(p.name);
    setEditPrice(String(p.price));
    setEditError(null);
  }

  async function saveEdit(id: number) {
    setEditError(null);
    const price = Number(editPrice);
    if (!editCode.trim() || !editName.trim() || Number.isNaN(price) || price < 0) {
      setEditError("Datos inválidos");
      return;
    }
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: editCode, name: editName, price }),
    });
    const data = await res.json();
    if (!res.ok) {
      setEditError(data.error || "No se pudo guardar");
      return;
    }
    setEditingId(null);
    load(page, q);
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este producto del catálogo?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load(page, q);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/products/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "No se pudo importar el archivo");
        return;
      }
      setImportSummary(data);
      load(1, q);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold mb-1">Catálogo de productos</h1>
          <p className="text-sm text-muted">{total} productos cargados</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- descarga de archivo, no navegación de página */}
          <a
            href="/api/products/template"
            className="rounded-lg border border-border text-sm px-3 py-2 hover:bg-honey-light/30 transition-colors"
          >
            Descargar plantilla
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- descarga de archivo, no navegación de página */}
          <a
            href="/api/products/export"
            className="rounded-lg border border-border text-sm px-3 py-2 hover:bg-honey-light/30 transition-colors"
          >
            Exportar catálogo
          </a>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-lg border border-honey text-honey-dark text-sm px-3 py-2 hover:bg-honey-light/40 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {importing ? "Importando…" : "Importar Excel"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
            }}
          />
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-lg bg-honey-dark text-white text-sm font-medium px-3 py-2 hover:bg-honey transition-colors cursor-pointer"
          >
            + Agregar producto
          </button>
        </div>
      </div>

      {importSummary && (
        <div className="rounded-xl border border-honey bg-honey-light/30 p-4 text-sm">
          <p className="font-medium mb-1">Importación terminada</p>
          <p>
            {importSummary.created} creados · {importSummary.updated} actualizados
            {importSummary.errors.length > 0 && ` · ${importSummary.errors.length} filas con error`}
          </p>
          {importSummary.errors.length > 0 && (
            <ul className="mt-2 list-disc list-inside text-warn">
              {importSummary.errors.slice(0, 10).map((e, i) => (
                <li key={i}>
                  Fila {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => setImportSummary(null)}
            className="mt-2 text-xs text-muted hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-card border border-border rounded-2xl p-5 grid sm:grid-cols-[1fr_2fr_1fr_auto] gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Código interno</label>
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Nombre</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Precio</label>
            <input
              type="number"
              min={0}
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
            />
          </div>
          <button
            type="submit"
            disabled={addLoading}
            className="rounded-lg bg-honey-dark text-white text-sm font-medium px-4 py-2 hover:bg-honey transition-colors disabled:opacity-50 cursor-pointer"
          >
            Guardar
          </button>
          {addError && <p className="sm:col-span-4 text-sm text-warn">{addError}</p>}
        </form>
      )}

      <div>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por código o nombre…"
          className="w-full sm:w-80 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-honey"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-2 sm:px-4 py-2 font-medium">Código</th>
                <th className="px-2 sm:px-4 py-2 font-medium">Nombre</th>
                <th className="px-2 sm:px-4 py-2 font-medium text-right">Precio</th>
                <th className="px-2 sm:px-4 py-2 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    Cargando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    Sin productos. Importa tu Excel o agrega uno manualmente.
                  </td>
                </tr>
              ) : (
                items.map((p) =>
                  editingId === p.id ? (
                    <tr key={p.id} className="border-b border-border last:border-0 bg-honey-light/20">
                      <td className="px-4 py-2">
                        <input
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-right"
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button
                          onClick={() => saveEdit(p.id)}
                          className="text-ok text-xs font-medium mr-2 cursor-pointer"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-muted text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                        {editError && <p className="text-xs text-warn">{editError}</p>}
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-honey-light/10">
                      <td className="px-2 sm:px-4 py-2 text-muted">{p.code}</td>
                      <td className="px-2 sm:px-4 py-2">{p.name}</td>
                      <td className="px-2 sm:px-4 py-2 text-right">{formatPrice(p.price)}</td>
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-right">
                        <button
                          onClick={() => startEdit(p)}
                          aria-label="Editar"
                          title="Editar"
                          className="text-honey-dark hover:opacity-70 cursor-pointer mr-1 sm:mr-2"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          aria-label="Eliminar"
                          title="Eliminar"
                          className="text-warn hover:opacity-70 cursor-pointer"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => load(page - 1, q)}
            disabled={page <= 1}
            className="text-sm px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 cursor-pointer"
          >
            Anterior
          </button>
          <span className="text-sm text-muted">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => load(page + 1, q)}
            disabled={page >= totalPages}
            className="text-sm px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 cursor-pointer"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
