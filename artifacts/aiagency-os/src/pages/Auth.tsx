import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Tabs from "@radix-ui/react-tabs";
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2, Zap, Eye, EyeOff } from "lucide-react";
import { useAuthContext } from "../contexts/AuthContext";
import { useLocation } from "wouter";

export default function Auth() {
  const { signIn, signUp, error, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);

    let ok: boolean;
    if (tab === "login") {
      ok = await signIn(email, password);
    } else {
      ok = await signUp(email, password, fullName);
      if (ok) {
        setSuccessMessage("Registrazione completata! Controlla la tua email per confermare l'account.");
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    if (ok && tab === "login") {
      navigate("/", { replace: true });
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[hsl(226,50%,4%)]">
      {/* ── Animated Background ── */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <motion.div
          className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsla(270,100%,60%,0.15) 0%, transparent 70%)",
          }}
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-1/4 -right-1/4 w-[900px] h-[900px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsla(290,100%,50%,0.1) 0%, transparent 70%)",
          }}
          animate={{
            x: [0, -60, 50, 0],
            y: [0, 50, -70, 0],
            scale: [1, 0.95, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsla(190,100%,50%,0.06) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* ── Auth Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Glow behind card */}
        <div
          className="absolute -inset-1 rounded-3xl opacity-40 blur-xl pointer-events-none"
          style={{
            background: "linear-gradient(135deg, hsla(270,100%,60%,0.3), hsla(290,100%,50%,0.15), hsla(190,100%,50%,0.2))",
          }}
        />

        <div
          className="relative rounded-2xl border border-white/[0.08] p-8 sm:p-10"
          style={{
            background: "linear-gradient(145deg, hsla(226,50%,8%,0.9), hsla(226,50%,5%,0.95))",
            backdropFilter: "blur(40px)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* ── Logo & Brand ── */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              className="relative mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center relative">
                <Zap className="w-8 h-8 text-primary" />
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </motion.div>
              </div>
            </motion.div>

            <motion.h1
              className="text-3xl font-bold tracking-tight text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Giass<span className="text-primary font-light">Ai</span>
            </motion.h1>
            <motion.p
              className="text-sm text-white/40 mt-1.5 tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Il tuo Chief of Staff AI
            </motion.p>
          </div>

          {/* ── Tabs ── */}
          <Tabs.Root value={tab} onValueChange={(v) => { setTab(v as "login" | "register"); setSuccessMessage(null); }}>
            <Tabs.List className="relative flex rounded-xl p-1 mb-6 bg-white/[0.04] border border-white/[0.06]">
              {/* Sliding indicator */}
              <motion.div
                className="absolute top-1 bottom-1 rounded-lg bg-primary/15 border border-primary/20"
                layout
                style={{
                  width: "calc(50% - 4px)",
                  left: tab === "login" ? "4px" : "calc(50%)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
              <Tabs.Trigger
                value="login"
                className="relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors data-[state=active]:text-primary text-white/40 hover:text-white/60"
              >
                Accedi
              </Tabs.Trigger>
              <Tabs.Trigger
                value="register"
                className="relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors data-[state=active]:text-primary text-white/40 hover:text-white/60"
              >
                Registrati
              </Tabs.Trigger>
            </Tabs.List>

            {/* ── Error / Success Messages ── */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
              {successMessage && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-emerald-400 text-sm overflow-hidden"
                >
                  {successMessage}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: tab === "login" ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tab === "login" ? 20 : -20 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <div className="space-y-4">
                    {/* Full Name (register only) */}
                    {tab === "register" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <label className="text-xs font-medium text-white/50 mb-1.5 block uppercase tracking-wider">
                          Nome Completo
                        </label>
                        <div className="relative group">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-primary transition-colors" />
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Marco Rossi"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:bg-white/[0.06] transition-all text-sm"
                            data-testid="register-name"
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Email */}
                    <div>
                      <label className="text-xs font-medium text-white/50 mb-1.5 block uppercase tracking-wider">
                        Email
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-primary transition-colors" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="nome@azienda.com"
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:bg-white/[0.06] transition-all text-sm"
                          data-testid="auth-email"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="text-xs font-medium text-white/50 mb-1.5 block uppercase tracking-wider">
                        Password
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-primary transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={6}
                          className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:bg-white/[0.06] transition-all text-sm"
                          data-testid="auth-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* ── Submit Button ── */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="relative w-full mt-6 py-3.5 rounded-xl font-semibold text-sm text-white overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: "linear-gradient(135deg, hsl(270,100%,60%), hsl(290,100%,50%))",
                }}
                data-testid="auth-submit"
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: "linear-gradient(135deg, hsl(270,100%,65%), hsl(290,100%,55%), hsl(270,100%,65%))",
                  }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {tab === "login" ? "Accesso in corso..." : "Registrazione..."}
                    </>
                  ) : (
                    <>
                      {tab === "login" ? "Accedi" : "Crea Account"}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </span>
              </motion.button>
            </form>
          </Tabs.Root>

          {/* ── Bottom Divider ── */}
          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-xs text-white/25">
              Powered by <span className="text-primary/50">Supabase</span> · End-to-end encrypted
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
