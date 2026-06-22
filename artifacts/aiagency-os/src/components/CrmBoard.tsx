import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Plus, Loader2, Trash2, Bot, Link2, X, Mail, Phone, User,
  GripVertical, Check, Pencil, AlertCircle, ClipboardCopy, Sparkles, BookOpen,
} from "lucide-react";
import {
  getCrmBoard, createStage, updateStage, deleteStage,
  createContact, updateContact, deleteContact,
  linkLandingToWorkflow, getProjects,
  getScheda, saveScheda, prefillScheda, generateContactDraft,
  type CrmStage, type CrmContact, type Project, type BusinessScheda,
} from "../lib/api";

interface Props {
  project: Project;
  onBack: () => void;
  onOpenEditor: () => void;
}

const EMPTY_SCHEDA: BusinessScheda = {
  nomeAttivita: "",
  settore: "",
  orari: "",
  servizi: "",
  obiettivo: "fissare un appuntamento",
  tono: "amichevole e professionale",
  noteAggiuntive: "",
};

export default function CrmBoard({ project, onBack, onOpenEditor }: Props) {
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [landings, setLandings] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [linkedLandingId, setLinkedLandingId] = useState<string | null>(
    (project.config?.["sourceLandingProjectId"] as string) ?? null,
  );
  const [linking, setLinking] = useState(false);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [selected, setSelected] = useState<CrmContact | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const [showScheda, setShowScheda] = useState(false);

  const load = useCallback(async () => {
    try {
      const board = await getCrmBoard(project.id);
      setStages(board.stages);
      setContacts(board.contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Caricamento fallito");
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    load();
    getProjects()
      .then((all) => setLandings(all.filter((p) => p.type === "landing" && p.status !== "archived")))
      .catch(() => {});
  }, [load]);

  const linkedLanding = landings.find((l) => l.id === linkedLandingId) ?? null;

  async function handleLink(landingProjectId: string) {
    if (!landingProjectId) return;
    setLinking(true);
    setError(null);
    try {
      await linkLandingToWorkflow(project.id, landingProjectId);
      setLinkedLandingId(landingProjectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Collegamento fallito");
    } finally {
      setLinking(false);
    }
  }

  // ---- Drag & drop ---------------------------------------------------------
  async function dropOn(stageId: string) {
    setOverStage(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const contact = contacts.find((c) => c.id === id);
    if (!contact || contact.stageId === stageId) return;
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, stageId } : c)));
    try {
      await updateContact(id, { stageId });
    } catch {
      load();
    }
  }

  // ---- Stage CRUD ----------------------------------------------------------
  async function addStage() {
    try {
      const s = await createStage(project.id, { name: "Nuova colonna" });
      setStages((prev) => [...prev, s]);
      setEditingStage(s.id);
      setEditingName(s.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  }
  async function saveStageName(id: string) {
    const name = editingName.trim();
    setEditingStage(null);
    if (!name) return;
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    try { await updateStage(id, { name }); } catch { load(); }
  }
  async function removeStage(id: string) {
    if (!window.confirm("Eliminare questa colonna? I contatti verranno spostati nella prima colonna.")) return;
    setStages((prev) => prev.filter((s) => s.id !== id));
    try { await deleteStage(id); } finally { load(); }
  }

  // ---- Contact CRUD --------------------------------------------------------
  async function addContact(stageId: string) {
    const name = newName.trim();
    if (!name) { setAddingIn(null); return; }
    setNewName("");
    setAddingIn(null);
    try {
      const c = await createContact(project.id, { name, stageId });
      setContacts((prev) => [...prev, c]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  }
  async function removeContact(id: string) {
    setSelected(null);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    try { await deleteContact(id); } catch { load(); }
  }
  async function saveContact(updated: CrmContact) {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelected(updated);
    try {
      await updateContact(updated.id, {
        name: updated.name, email: updated.email, phone: updated.phone,
        notes: updated.notes ?? "", aiDraft: updated.aiDraft ?? null,
      });
    } catch { load(); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 bg-card flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-bold text-foreground text-lg leading-tight truncate">{project.name}</h2>
            <p className="text-xs text-muted-foreground">{contacts.length} contatti · {stages.length} fasi</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowScheda(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <BookOpen className="w-4 h-4" /> Scheda Business
          </button>
          <button onClick={onOpenEditor} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
            <Bot className="w-4 h-4" /> Editor AI
          </button>
        </div>
      </header>

      {/* Landing link bar */}
      <div className="px-6 py-3 border-b border-border bg-background/60 flex items-center gap-3 flex-shrink-0">
        <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-muted-foreground">Contatti dalla landing:</span>
        <select
          value={linkedLandingId ?? ""}
          onChange={(e) => handleLink(e.target.value)}
          disabled={linking}
          className="text-sm bg-card border border-border rounded-lg px-3 py-1.5 text-foreground focus:border-primary/50 outline-none disabled:opacity-50"
        >
          <option value="">— Seleziona una landing —</option>
          {landings.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        {linking && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        {linkedLanding && !linking && (
          <span className="text-xs text-emerald-500 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> collegata</span>
        )}
        {landings.length === 0 && (
          <span className="text-xs text-amber-500">Nessuna landing: creane una nella sezione Funnel.</span>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-3 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-4 h-full items-start">
          {stages.map((stage) => {
            const items = contacts.filter((c) => c.stageId === stage.id);
            return (
              <div
                key={stage.id}
                onDragOver={(e) => { e.preventDefault(); setOverStage(stage.id); }}
                onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
                onDrop={() => dropOn(stage.id)}
                className={`w-72 flex-shrink-0 rounded-2xl bg-muted/40 border flex flex-col max-h-full transition-colors ${
                  overStage === stage.id ? "border-primary/60 bg-primary/5" : "border-border"
                }`}
              >
                {/* Column header */}
                <div className="p-3 flex items-center gap-2 border-b border-border">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                  {editingStage === stage.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => saveStageName(stage.id)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveStageName(stage.id); if (e.key === "Escape") setEditingStage(null); }}
                      className="flex-1 bg-background border border-border rounded px-2 py-0.5 text-sm font-semibold text-foreground outline-none"
                    />
                  ) : (
                    <h3 className="flex-1 font-semibold text-sm text-foreground truncate">{stage.name}</h3>
                  )}
                  <span className="text-xs text-muted-foreground font-mono">{items.length}</span>
                  <button onClick={() => { setEditingStage(stage.id); setEditingName(stage.name); }} title="Rinomina" className="text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeStage(stage.id)} title="Elimina colonna" className="text-muted-foreground hover:text-rose-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[60px]">
                  {items.map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setSelected(c)}
                      className={`group bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/40 transition-colors ${dragId === c.id ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-foreground truncate">{c.name || c.email || c.phone || "Senza nome"}</div>
                          {c.email && <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{c.email}</div>}
                          {c.phone && <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{c.phone}</div>}
                          {c.aiDraft && <div className="text-xs text-primary/60 mt-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Bozza AI pronta</div>}
                        </div>
                        {c.source === "landing" && <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary flex-shrink-0">landing</span>}
                      </div>
                    </div>
                  ))}

                  {addingIn === stage.id ? (
                    <div className="bg-card border border-primary/40 rounded-xl p-2">
                      <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={() => addContact(stage.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") addContact(stage.id); if (e.key === "Escape") { setAddingIn(null); setNewName(""); } }}
                        placeholder="Nome contatto…"
                        className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground outline-none"
                      />
                    </div>
                  ) : (
                    <button onClick={() => { setAddingIn(stage.id); setNewName(""); }} className="w-full flex items-center justify-center gap-1 py-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Aggiungi
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add column */}
          <button onClick={addStage} className="w-56 flex-shrink-0 flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            <Plus className="w-4 h-4" /> Aggiungi colonna
          </button>
        </div>
      </div>

      {/* Contact detail drawer */}
      {selected && (
        <ContactDrawer
          contact={selected}
          onClose={() => setSelected(null)}
          onSave={saveContact}
          onDelete={() => removeContact(selected.id)}
        />
      )}

      {/* Scheda business panel */}
      {showScheda && (
        <SchedaPanel
          projectId={project.id}
          hasLinkedLanding={!!linkedLandingId}
          onClose={() => setShowScheda(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scheda Business Panel
// ---------------------------------------------------------------------------
function SchedaPanel({
  projectId,
  hasLinkedLanding,
  onClose,
}: {
  projectId: string;
  hasLinkedLanding: boolean;
  onClose: () => void;
}) {
  const [scheda, setScheda] = useState<BusinessScheda>(EMPTY_SCHEDA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getScheda(projectId)
      .then((s) => { if (s) setScheda(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handlePrefill() {
    setPrefilling(true);
    setError(null);
    try {
      const suggested = await prefillScheda(projectId);
      setScheda(suggested);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prefill fallito");
    } finally {
      setPrefilling(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveScheda(projectId, scheda);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-md h-full bg-card border-l border-border shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Scheda Business
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <p className="text-xs text-muted-foreground">
              L'AI usa queste informazioni per personalizzare i messaggi ai contatti e raggiungere l'obiettivo scelto.
            </p>

            {hasLinkedLanding && (
              <button
                onClick={handlePrefill}
                disabled={prefilling}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                {prefilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Pre-compila dalla landing
              </button>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <SchedaField label="Nome attività" value={scheda.nomeAttivita} onChange={(v) => setScheda({ ...scheda, nomeAttivita: v })} placeholder="es. Palestra FitZone" />
            <SchedaField label="Settore" value={scheda.settore} onChange={(v) => setScheda({ ...scheda, settore: v })} placeholder="es. fitness, ristorante, consulenza" />
            <SchedaField label="Orari di apertura" value={scheda.orari} onChange={(v) => setScheda({ ...scheda, orari: v })} placeholder="es. Lun-Ven 7:00-22:00, Sab 9:00-18:00" />
            <SchedaTextarea label="Servizi e prezzi" value={scheda.servizi} onChange={(v) => setScheda({ ...scheda, servizi: v })} placeholder="es. Abbonamento mensile €49, corsi in sala, personal trainer €70/h" rows={3} />
            <SchedaField label="Obiettivo AI" value={scheda.obiettivo} onChange={(v) => setScheda({ ...scheda, obiettivo: v })} placeholder="es. fissare una prova gratuita" />
            <SchedaField label="Tono di comunicazione" value={scheda.tono} onChange={(v) => setScheda({ ...scheda, tono: v })} placeholder="es. amichevole e motivante" />
            <SchedaTextarea label="Note aggiuntive" value={scheda.noteAggiuntive} onChange={(v) => setScheda({ ...scheda, noteAggiuntive: v })} placeholder="Altre info utili per l'AI (es. offerte speciali, FAQ frequenti)" rows={3} />
          </div>
        )}

        <footer className="p-5 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {saved ? "Salvata!" : "Salva scheda"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contact Detail Drawer
// ---------------------------------------------------------------------------
function ContactDrawer({
  contact, onClose, onSave, onDelete,
}: {
  contact: CrmContact;
  onClose: () => void;
  onSave: (c: CrmContact) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<CrmContact>(contact);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  useEffect(() => setDraft(contact), [contact]);

  const extra = draft.fields && typeof draft.fields === "object" ? Object.entries(draft.fields) : [];

  async function handleGenerateDraft() {
    setGeneratingDraft(true);
    setDraftError(null);
    try {
      const result = await generateContactDraft(draft.id);
      setDraft((prev) => ({ ...prev, aiDraft: result.draft }));
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Generazione fallita");
    } finally {
      setGeneratingDraft(false);
    }
  }

  async function handleCopy() {
    if (!draft.aiDraft) return;
    await navigator.clipboard.writeText(draft.aiDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-md h-full bg-card border-l border-border shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground flex items-center gap-2"><User className="w-4 h-4" /> Contatto</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Field label="Nome" value={draft.name ?? ""} onChange={(v) => setDraft({ ...draft, name: v })} />
          <Field label="Email" value={draft.email ?? ""} onChange={(v) => setDraft({ ...draft, email: v })} />
          <Field label="Telefono" value={draft.phone ?? ""} onChange={(v) => setDraft({ ...draft, phone: v })} />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Note</label>
            <textarea
              value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={3}
              className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 resize-none"
            />
          </div>

          {/* AI Draft Section */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Bozza messaggio AI
              </span>
              <button
                onClick={handleGenerateDraft}
                disabled={generatingDraft}
                className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 disabled:opacity-50 font-medium"
              >
                {generatingDraft ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {draft.aiDraft ? "Rigenera" : "Genera"}
              </button>
            </div>

            {draftError && <p className="text-xs text-rose-500">{draftError}</p>}

            {generatingDraft && (
              <div className="flex items-center gap-2 py-4 justify-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Generazione in corso…
              </div>
            )}

            {!generatingDraft && draft.aiDraft ? (
              <div className="space-y-2">
                <textarea
                  value={draft.aiDraft}
                  onChange={(e) => setDraft({ ...draft, aiDraft: e.target.value })}
                  rows={5}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 resize-none"
                />
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                  {copied ? "Copiato!" : "Copia messaggio"}
                </button>
              </div>
            ) : !generatingDraft ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Clicca "Genera" per creare un messaggio personalizzato basato sulla scheda business.
              </p>
            ) : null}
          </div>

          {extra.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Dati dal form</label>
              <div className="mt-1 space-y-1 rounded-lg border border-border bg-muted/30 p-3">
                {extra.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground text-right break-all">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="p-5 border-t border-border flex items-center gap-3">
          <button onClick={onDelete} className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex-shrink-0">
            <Trash2 className="w-5 h-5" />
          </button>
          <button onClick={() => onSave(draft)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
            <Check className="w-4 h-4" /> Salva
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
      />
    </div>
  );
}

function SchedaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
      />
    </div>
  );
}

function SchedaTextarea({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40"
      />
    </div>
  );
}
