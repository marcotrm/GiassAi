import { useState } from "react";
import { motion } from "framer-motion";
import { Database, Table2, KeyRound, Link2, CheckCircle2, Loader2, AlertCircle, Rocket } from "lucide-react";
import { deployGestionale } from "../lib/api";
import type { GestionaleDef } from "../hooks/use-chat-stream";

interface Props {
  def: GestionaleDef;
  schemaId: string;
  onDeployed?: () => void;
}

const TYPE_BADGE: Record<string, string> = {
  relation: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  enum: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export default function GestionaleSchemaPreview({ def, schemaId, onDeployed }: Props) {
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    setDeploying(true);
    setError(null);
    try {
      await deployGestionale(schemaId);
      setDeployed(true);
      onDeployed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy fallito");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground leading-tight">{def.name}</h3>
            <p className="text-xs text-muted-foreground">
              {def.tables.length} tabelle · {def.relations.length} relazioni
            </p>
          </div>
        </div>

        {def.tables.map((table, i) => (
          <motion.div
            key={table.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
              <Table2 className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">{table.label}</span>
              <code className="text-[10px] text-muted-foreground font-mono">{table.name}</code>
            </div>
            <div className="divide-y divide-border">
              {table.columns.map((col) => (
                <div key={col.name} className="px-4 py-2 flex items-center gap-2 text-sm">
                  {col.name === table.primaryDisplayColumn && (
                    <KeyRound className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="text-foreground">{col.label}</span>
                  <code className="text-[10px] text-muted-foreground font-mono">{col.name}</code>
                  <span className="flex-1" />
                  {col.relationTo && (
                    <span className="text-[10px] text-purple-500 flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      {col.relationTo}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      TYPE_BADGE[col.type] ?? "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {col.type}
                  </span>
                  {!col.nullable && (
                    <span className="text-[10px] text-rose-500" title="Obbligatorio">*</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {def.enums.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Enum</h4>
            <div className="space-y-1">
              {def.enums.map((e) => (
                <div key={e.name} className="text-xs">
                  <code className="text-amber-500 font-mono">{e.name}</code>
                  <span className="text-muted-foreground"> : {e.values.map((v) => v.label).join(", ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-border bg-background/80 backdrop-blur-md">
        {error && (
          <div className="mb-3 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {deployed ? (
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            Gestionale creato!
          </div>
        ) : (
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold transition-colors"
            data-testid="btn-deploy-gestionale"
          >
            {deploying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Creazione in corso...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" /> Crea il gestionale
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
