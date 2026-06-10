import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, CheckCircle2, Play, Loader2, Code, Database, MousePointerClick, Network, Link as LinkIcon, Zap } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { CreationType } from "../App";

interface CreationRoomProps {
  type: CreationType;
  onNavigate: () => void;
}

const TYPE_LABEL: Record<CreationType, string> = {
  gestionale: "Gestionale",
  landing: "Landing & Funnel",
  workflow: "Workflow",
};

const RECAP_TEXT: Record<CreationType, string> = {
  gestionale: "Quindi, ricapitolando: vorresti aggiungere una colonna per le scadenze dei pagamenti e inviare un WhatsApp in automatico. È corretto?",
  landing: "Quindi, ricapitolando: vorresti creare una Hero section accattivante e un form di contatto per la raccolta lead. Procedo?",
  workflow: "Quindi, ricapitolando: vorresti collegare un trigger Stripe a una condizione di pagamento e inviare una mail. Confermi?",
};

export default function CreationRoom({ type, onNavigate }: CreationRoomProps) {
  const recapText = RECAP_TEXT[type];
  const [messages, setMessages] = useState([
    { role: "ai", text: `Ciao! Sono il tuo AI Master. Ho analizzato la tua richiesta per il tuo ${TYPE_LABEL[type]}.` },
    { role: "ai", text: recapText },
  ]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [showConfirm, setShowConfirm] = useState(true);
  const [linkMode, setLinkMode] = useState(false);
  
  // States for previews
  const [showRows, setShowRows] = useState(0);
  const [showLandingBlocks, setShowLandingBlocks] = useState(0);
  const [showNodes, setShowNodes] = useState(0);

  const timers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current.forEach(clearInterval);
    };
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setMessages(prev => [...prev, { role: "user", text: inputText }]);
    setInputText("");
    setIsGenerating(true);

    const t1 = setTimeout(() => {
      setMessages(prev => [...prev, { role: "ai", text: recapText }]);
      setIsGenerating(false);
      setShowConfirm(true);
    }, 1000);
    timers.current.push(t1);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    setMessages(prev => [...prev, { role: "user", text: "Sì, procedi" }]);
    setIsGenerating(true);

    const t1 = setTimeout(() => {
      setMessages(prev => [...prev, { role: "ai", text: "Perfetto. Sto attivando gli agenti necessari..." }]);
      
      let count = 0;
      const max = type === "gestionale" ? 6 : type === "landing" ? 2 : 3;
      
      const interval = setInterval(() => {
        if (count < max) {
          if (type === "gestionale") setShowRows(count + 1);
          if (type === "landing") setShowLandingBlocks(count + 1);
          if (type === "workflow") setShowNodes(count + 1);
          count++;
        } else {
          clearInterval(interval);
          setGenerationComplete(true);
          setIsGenerating(false);
          setMessages(prev => [...prev, { role: "ai", text: "Operazione completata con successo! Guarda l'anteprima." }]);
        }
      }, type === "gestionale" ? 400 : 800);
      timers.current.push(interval);
    }, 1000);
    timers.current.push(t1);
  };

  const handleLinkProject = () => {
    setShowConfirm(false);
    setMessages(prev => [...prev, { role: "user", text: "Collega la Landing dei Lead al mio CRM" }]);
    setIsGenerating(true);
    
    const t1 = setTimeout(() => {
      setMessages(prev => [...prev, { role: "ai", text: "Sto creando un ponte logico tra la Landing e il CRM..." }]);
      setLinkMode(true);
      
      const t2 = setTimeout(() => {
        setIsGenerating(false);
        setGenerationComplete(true);
        setMessages(prev => [...prev, { role: "ai", text: "I progetti sono ora collegati. I lead della landing finiranno direttamente nel CRM." }]);
      }, 2500);
      timers.current.push(t2);
    }, 1000);
    timers.current.push(t1);
  };

  const getStatusColor = (stato: string) => {
    switch(stato) {
      case 'Pagato': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'In attesa': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'Scaduto': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const fakeData = [
    { name: "Marco Rossi", email: "marco@azienda.it", fattura: "F-2023-001", importo: "€ 4.500", stato: "Pagato", data: "12/10/2023" },
    { name: "Giulia Bianchi", email: "giulia@studio.it", fattura: "F-2023-002", importo: "€ 2.100", stato: "In attesa", data: "15/10/2023" },
    { name: "Alessandro Verdi", email: "alessandro@tech.it", fattura: "F-2023-003", importo: "€ 8.900", stato: "Pagato", data: "01/11/2023" },
    { name: "Laura Neri", email: "laura@design.it", fattura: "F-2023-004", importo: "€ 1.200", stato: "Scaduto", data: "05/11/2023" },
    { name: "Roberto Gialli", email: "roberto@consult.it", fattura: "F-2023-005", importo: "€ 5.600", stato: "Pagato", data: "10/11/2023" },
    { name: "Elena Viola", email: "elena@media.it", fattura: "F-2023-006", importo: "€ 3.400", stato: "In attesa", data: "18/11/2023" },
  ];

  const renderPreview = () => {
    if (linkMode) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex items-center gap-8 w-full max-w-2xl relative">
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex-1 glass-panel p-6 rounded-2xl border-primary/30 bg-card text-center"
            >
              <MousePointerClick className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-lg">Landing Lead</h3>
            </motion.div>
            
            <div className="w-32 h-1 relative overflow-hidden flex-shrink-0">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-secondary"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="absolute inset-y-0 w-1/2 bg-white/50 blur-sm"
              />
            </div>

            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex-1 glass-panel p-6 rounded-2xl border-secondary/30 bg-card text-center"
            >
              <Database className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h3 className="font-bold text-lg">CRM Clienti</h3>
            </motion.div>
          </div>
        </div>
      );
    }

    if (type === "gestionale") {
      return (
        <div className="flex-1 p-8 overflow-y-auto z-10">
          <div className="glass-panel rounded-2xl border border-border overflow-hidden bg-card">
            <div className="p-4 border-b border-border bg-muted/50 flex items-center gap-2 font-medium text-foreground">
              <Database className="w-4 h-4 text-primary" />
              CRM Clienti
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-mono">Nome</th>
                    <th className="px-6 py-4 font-mono">Email</th>
                    <th className="px-6 py-4 font-mono">Fattura</th>
                    <th className="px-6 py-4 font-mono">Importo</th>
                    <th className="px-6 py-4 font-mono">Stato</th>
                    <th className="px-6 py-4 font-mono">Scadenza</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <AnimatePresence>
                    {fakeData.slice(0, showRows).map((row, i) => (
                      <motion.tr 
                        key={i}
                        initial={{ opacity: 0, x: -20, backgroundColor: "hsl(var(--primary) / 0.1)" }}
                        animate={{ opacity: 1, x: 0, backgroundColor: "transparent" }}
                        transition={{ duration: 0.5 }}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-foreground">{row.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{row.email}</td>
                        <td className="px-6 py-4 font-mono text-primary">{row.fattura}</td>
                        <td className="px-6 py-4 font-mono font-medium text-foreground">{row.importo}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(row.stato)}`}>
                            {row.stato}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{row.data}</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {showRows === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground border-dashed border-2 border-border m-4">
                        In attesa di istruzioni per generare i dati...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (type === "landing") {
      return (
        <div className="flex-1 p-8 overflow-y-auto z-10 flex flex-col items-center">
          <div className="w-full max-w-3xl space-y-8">
            {showLandingBlocks > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-12 rounded-3xl border-border bg-card text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-primary/5" />
                <h1 className="text-4xl font-bold text-foreground mb-4 relative z-10">Rivoluziona il tuo Business</h1>
                <p className="text-muted-foreground text-lg mb-8 relative z-10">Scopri come automatizzare i tuoi processi in pochi click senza scrivere codice.</p>
                <button className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold relative z-10">Inizia Ora</button>
              </motion.div>
            )}
            {showLandingBlocks > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8 rounded-3xl border-border bg-card max-w-md mx-auto"
              >
                <h2 className="text-xl font-bold mb-4">Contattaci</h2>
                <div className="space-y-4">
                  <input type="text" placeholder="Nome" className="w-full p-3 rounded-xl bg-muted border-border border" disabled />
                  <input type="email" placeholder="Email" className="w-full p-3 rounded-xl bg-muted border-border border" disabled />
                  <button className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-bold">Invia Richiesta</button>
                </div>
              </motion.div>
            )}
            {showLandingBlocks === 0 && (
              <div className="px-6 py-12 text-center text-muted-foreground border-dashed border-2 border-border rounded-xl">
                In attesa di generare i blocchi della pagina...
              </div>
            )}
          </div>
        </div>
      );
    }

    if (type === "workflow") {
      return (
        <div className="flex-1 p-8 overflow-y-auto z-10 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            {showNodes > 0 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="glass-panel p-4 rounded-xl border-emerald-500/30 bg-card flex items-center gap-3 w-64 shadow-lg shadow-emerald-500/10">
                <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg"><Zap className="w-5 h-5" /></div>
                <div className="font-medium text-foreground">Trigger: Pagamento Stripe</div>
              </motion.div>
            )}
            
            {showNodes > 1 && (
              <>
                <motion.div initial={{ height: 0 }} animate={{ height: 40 }} className="w-1 bg-border relative">
                  <motion.div initial={{ top: 0, bottom: "100%" }} animate={{ bottom: 0 }} className="absolute inset-0 bg-primary" />
                </motion.div>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="glass-panel p-4 rounded-xl border-amber-500/30 bg-card flex items-center gap-3 w-64 shadow-lg shadow-amber-500/10">
                  <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg"><Network className="w-5 h-5" /></div>
                  <div className="font-medium text-foreground">Condizione: &gt; €500</div>
                </motion.div>
              </>
            )}

            {showNodes > 2 && (
              <>
                <motion.div initial={{ height: 0 }} animate={{ height: 40 }} className="w-1 bg-border relative">
                  <motion.div initial={{ top: 0, bottom: "100%" }} animate={{ bottom: 0 }} className="absolute inset-0 bg-primary" />
                </motion.div>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="glass-panel p-4 rounded-xl border-blue-500/30 bg-card flex items-center gap-3 w-64 shadow-lg shadow-blue-500/10">
                  <div className="p-2 bg-blue-500/20 text-blue-500 rounded-lg"><CheckCircle2 className="w-5 h-5" /></div>
                  <div className="font-medium text-foreground">Azione: Invia Email</div>
                </motion.div>
              </>
            )}

            {showNodes === 0 && (
              <div className="px-6 py-12 text-center text-muted-foreground border-dashed border-2 border-border rounded-xl">
                In attesa di collegare i nodi...
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02, transition: { duration: 0.2 } }}
      className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground"
    >
      {/* Left Column: AI Chat */}
      <div className="w-1/2 flex flex-col border-r border-border glass-panel relative z-10 bg-card">
        <header className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onNavigate}
              data-testid="btn-back"
              className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-lg leading-tight">AI Master</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_var(--color-emerald-500)] animate-pulse" />
                  Online e pronto
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
              >
                {msg.role === "ai" ? (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center border border-primary/20 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center border border-border mt-1 overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/initials/svg?seed=Admin&backgroundColor=transparent" alt="User" className="w-full h-full" />
                  </div>
                )}
                
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground shadow-[0_4px_20px_hsl(var(--primary)/30%)] rounded-tr-none" 
                    : "bg-muted border border-border text-foreground rounded-tl-none"
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}

            {showConfirm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-12 flex gap-2">
                <button 
                  onClick={handleConfirm}
                  data-testid="btn-conferma"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Sì, procedi
                </button>
              </motion.div>
            )}

            {isGenerating && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-3 ml-12"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> AI Developer
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> AI Analyst
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground text-xs font-medium">
                    <Bot className="w-3 h-3" /> AI Copywriter (Standby)
                  </div>
                </div>
              </motion.div>
            )}

            {messages.length < 3 && !isGenerating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex justify-end">
                <button 
                  onClick={handleLinkProject}
                  data-testid="btn-collega"
                  className="px-4 py-2 bg-secondary/10 border border-secondary/20 hover:bg-secondary/20 text-secondary rounded-full text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <LinkIcon className="w-4 h-4" /> Collega la Landing dei Lead al mio CRM
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-border">
          <form onSubmit={handleSend} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-25 group-focus-within:opacity-75 transition duration-500"></div>
            <div className="relative flex items-center bg-background rounded-xl border border-border focus-within:border-primary/50 overflow-hidden">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Rispondi all'AI Master..."
                className="flex-1 bg-transparent border-none outline-none text-foreground px-4 py-4 placeholder:text-muted-foreground"
                disabled={isGenerating}
                data-testid="chat-input"
              />
              <button 
                type="submit" 
                disabled={isGenerating || !inputText.trim()}
                className="p-3 mr-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary text-primary-foreground transition-colors"
                data-testid="chat-submit"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Preview */}
      <div className="w-1/2 flex flex-col bg-muted/30 relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-50 z-0"></div>
        
        <header className="px-8 py-4 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur-md z-10 sticky top-0">
          <h2 className="font-mono text-sm tracking-widest text-muted-foreground flex items-center gap-3">
            <Code className="w-4 h-4" />
            PREVIEW IN TEMPO REALE
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold font-mono tracking-wider animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            LIVE
          </div>
        </header>

        {renderPreview()}

        <AnimatePresence>
          {generationComplete && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-emerald-500 text-sm font-mono bg-emerald-500/10 border border-emerald-500/20 py-3 px-4 rounded-xl z-20 shadow-lg backdrop-blur-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              Build completata
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
