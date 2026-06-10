import { motion } from "framer-motion";
import { Moon, Sun, Check, Bell, Shield, Key } from "lucide-react";
import { useTheme } from "../components/ThemeProvider";

export default function Impostazioni() {
  const { mode, setMode, accent, setAccent } = useTheme();

  const accents = [
    { id: 'purple', name: 'Viola', color: 'bg-purple-500' },
    { id: 'cyan', name: 'Ciano', color: 'bg-cyan-500' },
    { id: 'emerald', name: 'Smeraldo', color: 'bg-emerald-500' },
    { id: 'amber', name: 'Ambra', color: 'bg-amber-500' },
    { id: 'blue', name: 'Blu', color: 'bg-blue-500' },
    { id: 'rose', name: 'Rosa', color: 'bg-rose-500' },
  ] as const;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 max-w-4xl mx-auto space-y-8"
    >
      <section className="glass-panel rounded-2xl p-6 bg-card border-border">
        <h2 className="text-xl font-bold mb-6 text-foreground">Aspetto</h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">TEMA</h3>
            <div className="flex p-1 bg-muted rounded-xl border border-border w-max" data-testid="theme-toggle">
              <button
                onClick={() => setMode('light')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'light' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sun className="w-4 h-4" />
                Chiaro
              </button>
              <button
                onClick={() => setMode('dark')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'dark' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Moon className="w-4 h-4" />
                Scuro
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">COLORE ACCENTO</h3>
            <div className="flex flex-wrap gap-4">
              {accents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAccent(a.id)}
                  data-testid={`accent-${a.id}`}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${a.color} ${
                    accent === a.id ? 'ring-4 ring-primary/30 scale-110' : 'hover:scale-105'
                  }`}
                >
                  {accent === a.id && <Check className="w-6 h-6 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-6 bg-card border-border">
        <h2 className="text-xl font-bold mb-6 text-foreground">Account & Sicurezza</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Notifiche AI</h4>
                <p className="text-sm text-muted-foreground">Ricevi alert quando un agente completa un task.</p>
              </div>
            </div>
            <div className="w-11 h-6 bg-primary rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-primary-foreground rounded-full" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Chiavi API</h4>
                <p className="text-sm text-muted-foreground">Gestisci le connessioni con Stripe, OpenAI, ecc.</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Sicurezza Account</h4>
                <p className="text-sm text-muted-foreground">Password, 2FA e sessioni attive.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
