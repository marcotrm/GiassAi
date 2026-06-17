import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Plus, AlertCircle, Table2, X } from "lucide-react";
import {
  getGestionaleSchema,
  getGestionaleData,
  insertGestionaleRow,
  type GestionaleSchemaResponse,
  type GestionaleTableDef,
} from "../lib/api";

interface Props {
  projectId: string;
  projectName: string;
  onBack: () => void;
}

const SYSTEM_COLS = new Set(["id", "org_id", "created_at", "updated_at"]);

export default function GestionaleDataView({ projectId, projectName, onBack }: Props) {
  const [schema, setSchema] = useState<GestionaleSchemaResponse | null>(null);
  const [activeTable, setActiveTable] = useState<string>("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await getGestionaleSchema(projectId);
        setSchema(s);
        if (s.isDeployed && s.def.tables[0]) setActiveTable(s.def.tables[0].name);
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

  const enumValues = (enumName?: string) =>
    schema?.def.enums.find((e) => e.name === enumName)?.values ?? [];

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
        if (col.type === "number") values[col.name] = Number(v);
        else if (col.type === "decimal" || col.type === "currency") values[col.name] = Number(v);
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const dataCols = table?.columns.filter((c) => !SYSTEM_COLS.has(c.name)) ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{projectName}</h2>
          <p className="text-sm text-muted-foreground">{schema?.def.name}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {!schema?.isDeployed ? (
        <div className="p-6 rounded-xl border border-border bg-card text-muted-foreground">
          Questo gestionale non è ancora stato deployato. Torna nella chat di creazione e premi "Crea il gestionale".
        </div>
      ) : (
        <>
          {/* Table tabs */}
          <div className="flex flex-wrap gap-2">
            {schema.def.tables.map((t) => (
              <button
                key={t.name}
                onClick={() => { setActiveTable(t.name); setShowForm(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${
                  activeTable === t.name ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >
                <Table2 className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{table?.label}</h3>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Annulla" : "Aggiungi riga"}
            </button>
          </div>

          {/* Add-row form */}
          {showForm && table && (
            <form onSubmit={handleAdd} className="p-5 rounded-xl border border-border bg-card grid md:grid-cols-2 gap-4">
              {dataCols.map((col) => (
                <label key={col.name} className="block text-sm">
                  <span className="block mb-1 text-muted-foreground">{col.label}{!col.nullable && <span className="text-rose-500"> *</span>}</span>
                  {col.type === "enum" ? (
                    <select
                      value={form[col.name] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [col.name]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    >
                      <option value="">—</option>
                      {enumValues(col.enumName).map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  ) : col.type === "boolean" ? (
                    <select
                      value={form[col.name] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [col.name]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    >
                      <option value="">—</option>
                      <option value="true">Sì</option>
                      <option value="false">No</option>
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

          {/* Rows table */}
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            {rowsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Nessun dato. Aggiungi la prima riga.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left">
                      {dataCols.map((c) => <th key={c.name} className="px-4 py-2 font-semibold text-muted-foreground">{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={(row["id"] as string) ?? i} className="border-b border-border last:border-0">
                        {dataCols.map((c) => (
                          <td key={c.name} className="px-4 py-2 text-foreground">{formatCell(row[c.name])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sì" : "No";
  return String(v);
}
