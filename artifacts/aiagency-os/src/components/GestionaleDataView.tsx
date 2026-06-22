import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Plus, AlertCircle, Table2, X, Search, Trash2, MessageSquare, Database, LayoutDashboard, TrendingUp } from "lucide-react";
import {
  getGestionaleSchema,
  getGestionaleData,
  insertGestionaleRow,
  deleteGestionaleRow,
  deleteProject,
  type GestionaleSchemaResponse,
  type GestionaleTableDef,
} from "../lib/api";

interface Props {
  projectId: string;
  projectName: string;
  onBack: () => void;
  onResumeChat: () => void;
  onDeleted: () => void;
}

const SYSTEM_COLS = new Set(["id", "org_id", "created_at", "updated_at"]);

export default function GestionaleDataView({ projectId, projectName, onBack, onResumeChat, onDeleted }: Props) {
  const [schema, setSchema] = useState<GestionaleSchemaResponse | null>(null);
  const [activeTable, setActiveTable] = useState<string>("__overview__");
  const [overviewCounts, setOverviewCounts] = useState<Record<string, number>>({});
  const [overviewRecent, setOverviewRecent] = useState<{ table: string; label: string; rows: Record<string, unknown>[] }[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingRow, setDeletingRow] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [relOptions, setRelOptions] = useState<Record<string, { id: string; label: string }[]>>({});

  useEffect(() => {
    (async () => {
      try {
        const s = await getGestionaleSchema(projectId);
        setSchema(s);
        if (s.isDeployed) {
          // Load overview counts in parallel
          const counts: Record<string, number> = {};
          const recent: { table: string; label: string; rows: Record<string, unknown>[] }[] = [];
          await Promise.all(
            s.def.tables.map(async (t) => {
              try {
                const rows = await getGestionaleData(projectId, t.name);
                counts[t.name] = rows.length;
                if (rows.length > 0) recent.push({ table: t.name, label: t.label, rows: rows.slice(-3).reverse() });
              } catch { counts[t.name] = 0; }
            }),
          );
          setOverviewCounts(counts);
          setOverviewRecent(recent);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore nel caricamento");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const loadRows = useCallback(async (table: string) => {
    setRowsLoading(true);
    try {
      setRows(await getGestionaleData(projectId, table));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento dati");
    } finally {
      setRowsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (activeTable) loadRows(activeTable);
  }, [activeTable, loadRows]);

  const table: GestionaleTableDef | undefined = schema?.def.tables.find((t) => t.name === activeTable);
  const dataCols = table?.columns.filter((c) => !SYSTEM_COLS.has(c.name)) ?? [];
  const enumValues = (enumName?: string) => schema?.def.enums.find((e) => e.name === enumName)?.values ?? [];

  const filteredRows = search.trim()
    ? rows.filter((r) => dataCols.some((c) => String(r[c.name] ?? "").toLowerCase().includes(search.toLowerCase())))
    : rows;

  // Load options for relation fields (show names, store the related row id).
  useEffect(() => {
    if (!table || !schema) return;
    for (const c of table.columns) {
      if (c.type !== "relation" || !c.relationTo) continue;
      const target = schema.def.tables.find((t) => t.name === c.relationTo);
      if (!target) continue;
      getGestionaleData(projectId, c.relationTo)
        .then((data) =>
          setRelOptions((prev) => ({
            ...prev,
            [c.name]: data.map((r) => ({ id: String(r["id"]), label: String(r[target.primaryDisplayColumn] ?? r["id"]) })),
          })),
        )
        .catch(() => {});
    }
  }, [table, schema, projectId]);

  // Map a relation cell (uuid) to the related record's display label.
  const relLabel = (col: { relationTo?: string; name: string }, value: unknown): string => {
    const opt = relOptions[col.name]?.find((o) => o.id === String(value));
    return opt?.label ?? (value ? String(value) : "—");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!table) return;
    setSaving(true);
    setError(null);
    try {
      const values: Record<string, unknown> = {};
      for (const col of table.columns) {
        const v = form[col.name];
        if (v === undefined || v === "") continue;
        if (col.type === "number" || col.type === "decimal" || col.type === "currency") values[col.name] = Number(v);
        else if (col.type === "boolean") values[col.name] = v === "true";
        else values[col.name] = v;
      }
      await insertGestionaleRow(projectId, table.name, values);
      setForm({});
      setShowForm(false);
      await loadRows(table.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inserimento fallito");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRow = async (id: string) => {
    if (!table || !window.confirm("Eliminare questa riga?")) return;
    setDeletingRow(id);
    try {
      await deleteGestionaleRow(projectId, table.name, id);
      setRows((prev) => prev.filter((r) => r["id"] !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eliminazione fallita");
    } finally {
      setDeletingRow(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Eliminare il gestionale "${projectName}"?`)) return;
    setDeletingProject(true);
    try {
      await deleteProject(projectId);
      onDeleted();
    } catch {
      setError("Eliminazione del gestionale fallita");
      setDeletingProject(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Database className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground leading-tight">{projectName}</h2>
            <p className="text-xs text-muted-foreground">{schema?.def.name} · ERP</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onResumeChat} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm hover:border-primary/50">
            <MessageSquare className="w-4 h-4" /> Continua chat
          </button>
          <button onClick={handleDeleteProject} disabled={deletingProject} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-500/20 text-rose-500 text-sm hover:bg-rose-500/10 disabled:opacity-50">
            {deletingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Elimina
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {!schema?.isDeployed ? (
        <div className="m-6 p-6 rounded-xl border border-border bg-card text-muted-foreground">
          Questo gestionale non è ancora stato deployato. Apri la chat di creazione e premi "Crea il gestionale".
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Sidebar — modules (tables) */}
          <aside className="w-56 border-r border-border p-3 overflow-y-auto flex-shrink-0">
            <nav className="space-y-1 mb-3">
              <button
                onClick={() => { setActiveTable("__overview__"); setShowForm(false); setSearch(""); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors font-medium ${
                  activeTable === "__overview__" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 flex-shrink-0" /> Overview
              </button>
            </nav>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-2">Moduli</p>
            <nav className="space-y-1">
              {schema.def.tables.map((t) => (
                <button
                  key={t.name}
                  onClick={() => { setActiveTable(t.name); setShowForm(false); setSearch(""); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    activeTable === t.name ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Table2 className="w-4 h-4 flex-shrink-0" /> {t.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <div className="flex-1 min-w-0 flex flex-col">
            {activeTable === "__overview__" ? (
              <div className="flex-1 overflow-auto p-6 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground text-lg">Overview</h3>
                  <span className="text-xs text-muted-foreground">— riepilogo dei dati nel gestionale</span>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {schema.def.tables.map((t) => {
                    const count = overviewCounts[t.name] ?? 0;
                    return (
                      <button
                        key={t.name}
                        onClick={() => setActiveTable(t.name)}
                        className="glass-panel p-4 rounded-xl border border-border bg-card text-left hover:border-primary/40 transition-colors group"
                      >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Table2 className="w-3 h-3" /> {t.label}
                        </p>
                        <p className="text-3xl font-mono font-bold text-foreground group-hover:text-primary transition-colors">{count}</p>
                        <p className="text-xs text-muted-foreground mt-1">{count === 1 ? "record" : "record"}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Recent activity */}
                {overviewRecent.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Attività recente</h4>
                    <div className="space-y-3">
                      {overviewRecent.map(({ table: tName, label, rows }) => {
                        const tDef = schema.def.tables.find((t) => t.name === tName);
                        const displayCol = tDef?.primaryDisplayColumn ?? tDef?.columns[0]?.name;
                        return (
                          <div key={tName} className="rounded-xl border border-border bg-card p-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                            <div className="space-y-1">
                              {rows.map((row, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                                  <span className="text-foreground truncate">
                                    {displayCol ? String(row[displayCol] ?? "—") : JSON.stringify(row).slice(0, 60)}
                                  </span>
                                  {Boolean(row["created_at"]) && (
                                    <span className="text-muted-foreground text-xs ml-auto flex-shrink-0">
                                      {new Date(row["created_at"] as string).toLocaleDateString("it-IT")}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
                    Nessun dato ancora — aggiungi i primi record dai moduli per vedere l'attività qui.
                  </div>
                )}
              </div>
            ) : (
            <><div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">{table?.label}</h3>
                <p className="text-xs text-muted-foreground">{filteredRows.length} record</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cerca…"
                    className="pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm w-48"
                  />
                </div>
                <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                  {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showForm ? "Annulla" : "Aggiungi"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-4">
              {showForm && table && (
                <form onSubmit={handleAdd} className="p-5 rounded-xl border border-border bg-card grid md:grid-cols-2 gap-4">
                  {dataCols.map((col) => (
                    <label key={col.name} className="block text-sm">
                      <span className="block mb-1 text-muted-foreground">{col.label}{!col.nullable && <span className="text-rose-500"> *</span>}</span>
                      {col.type === "relation" ? (
                        <select value={form[col.name] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [col.name]: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background">
                          <option value="">—</option>
                          {(relOptions[col.name] ?? []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      ) : col.type === "enum" ? (
                        <select value={form[col.name] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [col.name]: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background">
                          <option value="">—</option>
                          {enumValues(col.enumName).map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                        </select>
                      ) : col.type === "boolean" ? (
                        <select value={form[col.name] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [col.name]: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background">
                          <option value="">—</option><option value="true">Sì</option><option value="false">No</option>
                        </select>
                      ) : (
                        <input
                          type={col.type === "number" || col.type === "decimal" || col.type === "currency" ? "number" : col.type === "date" ? "date" : col.type === "datetime" ? "datetime-local" : col.type === "email" ? "email" : "text"}
                          step={col.type === "decimal" || col.type === "currency" ? "0.01" : undefined}
                          value={form[col.name] ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, [col.name]: e.target.value }))}
                          placeholder={col.relationTo ? `id ${col.relationTo}` : ""}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                        />
                      )}
                    </label>
                  ))}
                  <div className="md:col-span-2">
                    <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center gap-2">
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salva
                    </button>
                  </div>
                </form>
              )}

              <div className="rounded-xl border border-border overflow-hidden bg-card">
                {rowsLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : filteredRows.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">{search ? "Nessun risultato." : "Nessun dato. Aggiungi il primo record."}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-left">
                          {dataCols.map((c) => <th key={c.name} className="px-4 py-2 font-semibold text-muted-foreground whitespace-nowrap">{c.label}</th>)}
                          <th className="px-4 py-2 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row, i) => {
                          const id = row["id"] as string;
                          return (
                            <tr key={id ?? i} className="border-b border-border last:border-0 hover:bg-muted/20">
                              {dataCols.map((c) => <td key={c.name} className="px-4 py-2 text-foreground whitespace-nowrap">{c.type === "relation" ? relLabel(c, row[c.name]) : formatCell(row[c.name])}</td>)}
                              <td className="px-4 py-2">
                                <button onClick={() => handleDeleteRow(id)} disabled={deletingRow === id} title="Elimina riga" className="text-muted-foreground hover:text-rose-500 transition-colors">
                                  {deletingRow === id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sì" : "No";
  return String(v);
}
