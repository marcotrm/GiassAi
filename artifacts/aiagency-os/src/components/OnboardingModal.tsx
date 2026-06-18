import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Network, MessagesSquare, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: Bot,
    title: "Ciao, sono GiassAi 👋",
    text: "Creo per te gestionali, landing page e automazioni — parlando, in linguaggio naturale.",
  },
  {
    icon: Network,
    title: "Tre strumenti, un ecosistema",
    text: "Qui crei i gestionali, le landing e i workflow. E puoi collegarli tra loro.",
  },
  {
    icon: MessagesSquare,
    title: "Ti faccio qualche domanda",
    text: "Uso l'human-in-the-loop: ti chiedo i dettagli giusti per capire bene e ridurre gli errori.",
  },
];

export default function OnboardingModal({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const s = STEPS[step]!;
  const Icon = s.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-card border border-border p-8 text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
              <Icon className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">{s.title}</h2>
            <p className="text-muted-foreground leading-relaxed text-base">{s.text}</p>
          </motion.div>
        </AnimatePresence>

        {/* progress dots */}
        <div className="flex items-center justify-center gap-2 my-7">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-7 bg-primary" : "w-2 bg-muted"}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((p) => p - 1)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border bg-background text-foreground font-medium hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Indietro
            </button>
          )}
          <button
            onClick={() => (isLast ? onDone() : setStep((p) => p + 1))}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            data-testid="onboarding-next"
          >
            {isLast ? (
              <>
                <Sparkles className="w-4 h-4" /> Iniziamo!
              </>
            ) : (
              <>
                Avanti <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
