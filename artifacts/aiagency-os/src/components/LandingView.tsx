import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, AlertCircle, Rocket, ExternalLink, MessageSquare, Trash2,
  CheckCircle2, MousePointerClick, Pencil, X, Sparkles, Type, Check,
} from "lucide-react";
import {
  getLanding, publishLanding, deleteProject, editLandingElement, saveLandingHtml,
  type LandingResponse,
} from "../lib/api";

interface Props {
  projectId: string;
  projectName: string;
  onBack: () => void;
  onResumeChat: () => void;
  onDeleted: () => void;
}

interface Selection {
  eid: string;
  tag: string;
  html: string;
  isText: boolean;
  sectionEid: string;
  sectionHtml: string;
}

// Injected into the iframe in edit mode: tag elements, highlight on hover,
// report clicks, apply edits and serialize a clean HTML back to the parent.
const EDITOR = `
<style id="__ged_style">
  [data-ged]:hover { outline: 2px dashed #f59e0b !important; outline-offset: 1px; cursor: pointer; }
  .__ged_sel { outline: 3px solid #f59e0b !important; outline-offset: 1px; }
  [contenteditable="true"] { outline: 3px solid #22c55e !important; cursor: text; }
</style>
<script id="__ged_script">
(function(){
  var idc=0;
  function tagAll(){ var els=document.body.querySelectorAll('*'); for(var i=0;i<els.length;i++){ if(!els[i].hasAttribute('data-ged')) els[i].setAttribute('data-ged','g'+(idc++)); } }
  tagAll();
  var sel=null;
  function section(el){ var c=el; while(c && c!==document.body){ if(c.tagName==='SECTION') return c; c=c.parentElement; } return el; }
  function clean(el){ var c=el.cloneNode(true); if(c.removeAttribute) c.removeAttribute('data-ged'); if(c.classList) c.classList.remove('__ged_sel'); var d=c.querySelectorAll?c.querySelectorAll('[data-ged]'):[]; for(var i=0;i<d.length;i++){ d[i].removeAttribute('data-ged'); d[i].classList.remove('__ged_sel'); } return c.outerHTML; }
  document.addEventListener('click', function(e){
    if(!document.body) return;
    var el=e.target;
    if(el===document.documentElement||el===document.body) return;
    if(el.getAttribute('contenteditable')==='true') return;
    e.preventDefault(); e.stopPropagation();
    if(sel) sel.classList.remove('__ged_sel');
    sel=el; el.classList.add('__ged_sel');
    var sec=section(el);
    var isText=el.children.length===0 && (el.textContent||'').trim().length>0;
    parent.postMessage({source:'ged',type:'select',eid:el.getAttribute('data-ged'),tag:el.tagName,html:clean(el),isText:isText,sectionEid:sec.getAttribute('data-ged'),sectionHtml:clean(sec)},'*');
  }, true);
  function serialize(){
    var clone=document.documentElement.cloneNode(true);
    var st=clone.querySelector('#__ged_style'); if(st) st.remove();
    var sc=clone.querySelector('#__ged_script'); if(sc) sc.remove();
    var all=clone.querySelectorAll('[data-ged]'); for(var i=0;i<all.length;i++){ all[i].removeAttribute('data-ged'); all[i].classList.remove('__ged_sel'); all[i].removeAttribute('contenteditable'); }
    return '<!DOCTYPE html>\\n'+clone.outerHTML;
  }
  window.addEventListener('message', function(e){
    var d=e.data; if(!d||d.source!=='ged-parent') return;
    if(d.type==='apply'){ var el=document.querySelector('[data-ged="'+d.eid+'"]'); if(el){ if(d.html===''){ el.remove(); } else { el.outerHTML=d.html; } } parent.postMessage({source:'ged',type:'updated',html:serialize()},'*'); }
    else if(d.type==='editText'){ var e2=document.querySelector('[data-ged="'+d.eid+'"]'); if(e2){ e2.setAttribute('contenteditable','true'); e2.focus(); } }
    else if(d.type==='commitText'){ var e3=document.querySelector('[data-ged="'+d.eid+'"]'); if(e3){ e3.removeAttribute('contenteditable'); } parent.postMessage({source:'ged',type:'updated',html:serialize()},'*'); }
  });
})();
</script>`;

function injectEditor(html: string): string {
  return html.includes("</body>") ? html.replace("</body>", EDITOR + "</body>") : html + EDITOR;
}

export default function LandingView({ projectId, projectName, onBack, onResumeChat, onDeleted }: Props) {
  const [landing, setLanding] = useState<LandingResponse | null>(null);
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [target, setTarget] = useState<"element" | "section">("element");
  const [instruction, setInstruction] = useState("");
  const [editing, setEditing] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const l = await getLanding(projectId);
        setLanding(l);
        setHtml(l.html);
        setPublished(l.isPublished);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore nel caricamento");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  // Listen to messages coming from the iframe editor.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || d.source !== "ged") return;
      if (d.type === "select") {
        setSelected({ eid: d.eid, tag: d.tag, html: d.html, isText: d.isText, sectionEid: d.sectionEid, sectionHtml: d.sectionHtml });
        setTarget("element");
        setEditingText(false);
      } else if (d.type === "updated" && typeof d.html === "string") {
        setHtml(d.html);
        if (landing) saveLandingHtml(landing.landingId, d.html).catch(() => {});
        setSelected(null);
        setInstruction("");
        setEditingText(false);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [landing]);

  const post = (msg: Record<string, unknown>) => iframeRef.current?.contentWindow?.postMessage({ source: "ged-parent", ...msg }, "*");

  const applyAiEdit = async () => {
    if (!selected || !instruction.trim() || !landing) return;
    setEditing(true);
    setError(null);
    try {
      const snippet = target === "section" ? selected.sectionHtml : selected.html;
      const eid = target === "section" ? selected.sectionEid : selected.eid;
      const { html: newSnippet } = await editLandingElement(landing.landingId, snippet, instruction);
      post({ type: "apply", eid, html: newSnippet });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modifica fallita");
    } finally {
      setEditing(false);
    }
  };

  const fullUrl = landing ? `/api/landing/${landing.landingId}/html` : "#";

  const handlePublish = async () => {
    if (!landing) return;
    setPublishing(true);
    try {
      await publishLanding(landing.landingId);
      setPublished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pubblicazione fallita");
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Eliminare la landing "${projectName}"?`)) return;
    setDeleting(true);
    try {
      await deleteProject(projectId);
      onDeleted();
    } catch {
      setError("Eliminazione fallita");
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100dvh-4rem)]">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="font-bold text-foreground leading-tight truncate">{projectName}</h2>
            <p className="text-xs text-muted-foreground">{editMode ? "Modifica: clicca un elemento" : published ? "Pubblicata" : "Bozza"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {editMode ? (
            <button onClick={() => { setEditMode(false); setSelected(null); }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Check className="w-4 h-4" /> Fine modifica
            </button>
          ) : (
            <>
              <a href={fullUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm hover:border-primary/50">
                <ExternalLink className="w-4 h-4" /> Schermo intero
              </a>
              <button onClick={() => setEditMode(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                <Pencil className="w-4 h-4" /> Modifica
              </button>
              {published ? (
                <span className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Pubblicata
                </span>
              ) : (
                <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm hover:border-primary/50 disabled:opacity-50">
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />} Pubblica
                </button>
              )}
              <button onClick={onResumeChat} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm hover:border-primary/50">
                <MessageSquare className="w-4 h-4" /> Chat
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center justify-center w-9 h-9 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 disabled:opacity-50">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-3 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="flex-1 min-h-0 bg-white relative">
        <iframe
          ref={iframeRef}
          title="Landing"
          srcDoc={editMode ? injectEditor(html) : html}
          className="w-full h-full border-0"
          sandbox={editMode ? "allow-same-origin allow-scripts" : "allow-same-origin allow-scripts allow-popups"}
        />

        {/* Mini-chat editor panel */}
        {editMode && selected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(680px,92%)] rounded-2xl bg-card border border-border shadow-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MousePointerClick className="w-4 h-4 text-primary" />
                Selezionato: <code className="text-foreground">{selected.tag.toLowerCase()}</code>
              </div>
              <button onClick={() => { setSelected(null); setEditingText(false); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>

            {/* element vs section */}
            <div className="flex items-center gap-1 mb-3 p-1 rounded-lg bg-muted w-fit text-xs">
              <button onClick={() => setTarget("element")} className={`px-3 py-1 rounded ${target === "element" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Elemento</button>
              <button onClick={() => setTarget("section")} className={`px-3 py-1 rounded ${target === "section" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Intera sezione</button>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !editing) applyAiEdit(); }}
                placeholder="Cosa vuoi cambiare? Es. 'rendi il titolo verde'…"
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-sm"
                disabled={editing}
              />
              <button onClick={applyAiEdit} disabled={editing || !instruction.trim()} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Applica
              </button>
            </div>

            {selected.isText && target === "element" && (
              <div className="mt-3 flex items-center gap-2">
                {!editingText ? (
                  <button onClick={() => { post({ type: "editText", eid: selected.eid }); setEditingText(true); }} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Type className="w-4 h-4" /> Modifica il testo a mano (gratis)
                  </button>
                ) : (
                  <button onClick={() => post({ type: "commitText", eid: selected.eid })} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium">
                    <Check className="w-4 h-4" /> Salva testo
                  </button>
                )}
                {editingText && <span className="text-xs text-muted-foreground">Scrivi direttamente nella pagina, poi salva.</span>}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
