import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, CheckCircle2, Copy, Play, Loader2, Code, FileText, Database } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface CreationRoomProps {
  onNavigate: () => void;
}

export default function CreationRoom({ onNavigate }: CreationRoomProps) {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Ho analizzato la tua richiesta. Vuoi che aggiunga una colonna Fatture al tuo CRM clienti VIP, corretto?" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [showRows, setShowRows] = useState(0);

  const fakeData = [
    { name: "Marco Rossi", email: "marco@azienda.it", fattura: "F-2023-001", importo: "€ 4.500", stato: "Pagato", data: "12/10/2023" },
    { name: "Giulia Bianchi", email: "giulia@studio.it", fattura: "F-2023-002", importo: "€ 2.100", stato: "In attesa", data: "15/10/2023" },
    { name: "Alessandro Verdi", email: "alessandro@tech.it", fattura: "F-2023-003", importo: "€ 8.900", stato: "Pagato", data: "01/11/2023" },
    { name: "Laura Neri", email: "laura@design.it", fattura: "F-2023-004", importo: "€ 1.200", stato: "Scaduto", data: "05/11/2023" },
    { name: "Roberto Gialli", email: "roberto@consulting.it", fattura: "F-2023-005", importo: "€ 5.600", stato: "Pagato", data: "10/11/2023" },
    { name: "Elena Viola", email: "elena@media.it", fattura: "F-2023-006", importo: "€ 3.400", stato: "In attesa", data: "18/11/2023" },
    { name: "Stefano Marroni", email: "stefano@build.it", fattura: "F-2023-007", importo: "€ 12.000", stato: "Pagato", data: "22/11/2023" },
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setMessages(prev => [...prev, { role: "user", text: inputText }]);
    setInputText("");
    setIsGenerating(true);

    setTimeout(() => {
      setMessages(prev => [...prev, { role: "ai", text: "Perfetto. Sto attivando gli agenti necessari..." }]);
      
      // Start generating rows
      let count = 0;
      const interval = setInterval(() => {
        if (count < fakeData.length) {
          setShowRows(count + 1);
          count++;
        } else {
          clearInterval(interval);
          setGenerationComplete(true);
          setIsGenerating(false);
          setMessages(prev => [...prev, { role: "ai", text: "Tabella CRM aggiornata con successo. Ho aggiunto le colonne Fatture, Importo, Stato Pagamento e Data Scadenza." }]);
        }
      }, 400); // 400ms per row
    }, 1000);
  };

  const getStatusColor = (stato: string) => {
    switch(stato) {
      case 'Pagato': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'In attesa': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'Scaduto': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02, transition: { duration: 0.2 } }}
      className="flex h-screen w-full overflow-hidden"
    >
      {/* Left Column: AI Chat */}
      <div className="w-1/2 flex flex-col border-r border-border glass-panel relative z-10">
        <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onNavigate}
              data-testid="btn-back"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg leading-tight">AI Master</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
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
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex-shrink-0 flex items-center justify-center border border-primary/30 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex-shrink-0 flex items-center justify-center border border-white/20 mt-1">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="User" className="w-full h-full rounded-lg" />
                  </div>
                )}
                
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-primary text-white shadow-[0_4px_20px_rgba(168,85,247,0.3)] rounded-tr-none" 
                    : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}

            {isGenerating && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-3 ml-12"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    AI Developer al lavoro
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    AI Analyst al lavoro
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-medium">
                    <Bot className="w-3 h-3" />
                    AI Copywriter in standby
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-white/5">
          <form onSubmit={handleSend} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-2xl blur opacity-25 group-focus-within:opacity-75 transition duration-500"></div>
            <div className="relative flex items-center bg-[#0a0f1e] rounded-xl border border-white/10 focus-within:border-primary/50 overflow-hidden">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Rispondi all'AI Master..."
                className="flex-1 bg-transparent border-none outline-none text-white px-4 py-4"
                disabled={isGenerating}
                data-testid="chat-input"
              />
              <button 
                type="submit" 
                disabled={isGenerating || !inputText.trim()}
                className="p-3 mr-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary text-white transition-colors"
                data-testid="chat-submit"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Preview */}
      <div className="w-1/2 flex flex-col bg-[#050814] relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-20"></div>
        
        <header className="px-8 py-4 border-b border-white/5 flex items-center justify-between bg-[#0a0f1e]/80 backdrop-blur-md z-10 sticky top-0">
          <h2 className="font-mono text-sm tracking-widest text-muted-foreground flex items-center gap-3">
            <Code className="w-4 h-4" />
            PREVIEW IN TEMPO REALE
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold font-mono tracking-wider animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            LIVE
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto z-10">
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white font-medium">
                <Database className="w-4 h-4 text-cyan-400" />
                CRM Clienti VIP
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-md hover:bg-white/10 text-muted-foreground transition-colors"><FileText className="w-4 h-4" /></button>
                <button className="p-2 rounded-md hover:bg-white/10 text-muted-foreground transition-colors"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-mono">Nome Cliente</th>
                    <th className="px-6 py-4 font-mono">Email</th>
                    <th className="px-6 py-4 font-mono text-primary bg-primary/5">Fattura</th>
                    <th className="px-6 py-4 font-mono text-primary bg-primary/5">Importo</th>
                    <th className="px-6 py-4 font-mono text-primary bg-primary/5">Stato Pagamento</th>
                    <th className="px-6 py-4 font-mono">Data Scad.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence>
                    {fakeData.slice(0, showRows).map((row, i) => (
                      <motion.tr 
                        key={i}
                        initial={{ opacity: 0, x: -20, backgroundColor: "rgba(168,85,247,0.2)" }}
                        animate={{ opacity: 1, x: 0, backgroundColor: "transparent" }}
                        transition={{ duration: 0.5 }}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-white">{row.name}</td>
                        <td className="px-6 py-4 text-gray-400">{row.email}</td>
                        <td className="px-6 py-4 font-mono text-primary/80">{row.fattura}</td>
                        <td className="px-6 py-4 font-mono font-medium text-white">{row.importo}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(row.stato)}`}>
                            {row.stato}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 font-mono text-xs">{row.data}</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {showRows === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground border-dashed border-2 border-white/5 rounded-xl m-4">
                        In attesa di istruzioni per generare i dati...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <AnimatePresence>
            {generationComplete && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-center justify-center gap-2 text-emerald-400 text-sm font-mono bg-emerald-500/10 border border-emerald-500/20 py-3 px-4 rounded-xl w-max mx-auto"
              >
                <CheckCircle2 className="w-4 h-4" />
                Generazione completata in 3.2s
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
