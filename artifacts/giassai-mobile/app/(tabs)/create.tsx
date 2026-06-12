import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard, GlowTop, IconCircle, Tag } from "@/components/ui";
import {
  CREATION_ROWS,
  CREATION_TYPES,
  CreationType,
  RECAP_TEXT,
  TYPE_LABEL,
} from "@/constants/data";
import { FONT } from "@/constants/theme";
import { useAppState } from "@/context/AppState";
import { useThemeColors } from "@/context/ThemeContext";

type Msg = { role: "ai" | "user"; text: string };

const MAX_COUNT: Record<CreationType, number> = { gestionale: 4, landing: 2, workflow: 3 };
const STEP_MS: Record<CreationType, number> = { gestionale: 480, landing: 800, workflow: 650 };

const AGENTS = ["AI Developer", "AI Analyst", "AI Copywriter"];

export default function CreateScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { creationType, setCreationType } = useAppState();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [phase, setPhase] = useState<"idle" | "generating" | "done">("idle");
  const [showConfirm, setShowConfirm] = useState(true);
  const [count, setCount] = useState(0);
  const [input, setInput] = useState("");

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervals = useRef<ReturnType<typeof setInterval>[]>([]);

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    intervals.current.forEach(clearInterval);
    timers.current = [];
    intervals.current = [];
  };

  useEffect(() => {
    clearAll();
    setMessages([
      { role: "ai", text: `Ciao! Sono il tuo AI Master. Ho analizzato la tua richiesta per il modulo ${TYPE_LABEL[creationType]}.` },
      { role: "ai", text: RECAP_TEXT[creationType] },
    ]);
    setPhase("idle");
    setShowConfirm(true);
    setCount(0);
    return clearAll;
  }, [creationType]);

  const handleConfirm = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowConfirm(false);
    setMessages((p) => [...p, { role: "user", text: "Sì, procedi" }]);
    setPhase("generating");
    const max = MAX_COUNT[creationType];
    const t1 = setTimeout(() => {
      setMessages((p) => [...p, { role: "ai", text: "Perfetto. Sto attivando gli agenti necessari…" }]);
      let ct = 0;
      const iv = setInterval(() => {
        ct += 1;
        setCount(ct);
        if (ct >= max) {
          clearInterval(iv);
          setPhase("done");
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setMessages((p) => [...p, { role: "ai", text: "Operazione completata con successo! Guarda l'anteprima qui sotto." }]);
        }
      }, STEP_MS[creationType]);
      intervals.current.push(iv);
    }, 850);
    timers.current.push(t1);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((p) => [...p, { role: "user", text }]);
    setPhase("generating");
    setShowConfirm(false);
    const t = setTimeout(() => {
      setMessages((p) => [...p, { role: "ai", text: RECAP_TEXT[creationType] }]);
      setPhase("idle");
      setShowConfirm(true);
    }, 1100);
    timers.current.push(t);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <GlowTop />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingTop: topPad + 10,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 130,
          }}
        >
          <Text style={{ color: c.foreground, fontSize: 30, fontFamily: FONT.bold, letterSpacing: -0.8 }}>
            Creation Room
          </Text>
          <Text style={{ color: c.mutedForeground, fontSize: 13, fontFamily: FONT.regular, marginTop: 6 }}>
            Dialoga con l'AI Master e guarda la build in tempo reale.
          </Text>

          {/* Type selector */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            {CREATION_TYPES.map((t) => {
              const active = t.key === creationType;
              return (
                <TouchableOpacity
                  key={t.key}
                  activeOpacity={0.85}
                  onPress={() => setCreationType(t.key)}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: active ? c.alpha("primary", 0.5) : c.border,
                    backgroundColor: active ? c.alpha("primary", 0.12) : c.card,
                  }}
                >
                  <Feather name={t.icon} size={18} color={active ? c.primary : c.mutedForeground} />
                  <Text
                    style={{
                      color: active ? c.foreground : c.mutedForeground,
                      fontSize: 12.5,
                      fontFamily: FONT.semibold,
                      marginTop: 8,
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Chat */}
          <GlassCard style={{ marginTop: 14 }} padding={14}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: c.alpha("primary", 0.14),
                }}
              >
                <MaterialCommunityIcons name="robot-outline" size={17} color={c.primary} />
              </View>
              <Text style={{ color: c.foreground, fontSize: 14, fontFamily: FONT.semibold }}>AI Master</Text>
            </View>

            {messages.map((m, i) => (
              <View
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  marginBottom: 9,
                  borderRadius: 14,
                  paddingHorizontal: 13,
                  paddingVertical: 10,
                  backgroundColor: m.role === "user" ? c.primary : c.muted,
                }}
              >
                <Text
                  style={{
                    color: m.role === "user" ? c.primaryForeground : c.foreground,
                    fontSize: 13.5,
                    lineHeight: 19,
                    fontFamily: FONT.regular,
                  }}
                >
                  {m.text}
                </Text>
              </View>
            ))}

            {phase === "generating" && (
              <View style={{ marginTop: 4, gap: 7 }}>
                {AGENTS.map((a, i) => {
                  const working = i < 2;
                  return (
                    <View key={a} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {working ? (
                        <ActivityIndicator size="small" color={c.primary} />
                      ) : (
                        <View style={{ width: 16, alignItems: "center" }}>
                          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: c.mutedForeground }} />
                        </View>
                      )}
                      <Text style={{ color: working ? c.foreground : c.mutedForeground, fontSize: 12.5, fontFamily: FONT.medium }}>
                        {a} {working ? "· in lavoro" : "· standby"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {showConfirm && phase === "idle" && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirm}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 6,
                  backgroundColor: c.primary,
                  borderRadius: 13,
                  paddingVertical: 12,
                }}
              >
                <Feather name="check" size={16} color={c.primaryForeground} />
                <Text style={{ color: c.primaryForeground, fontSize: 14, fontFamily: FONT.semibold }}>Sì, procedi</Text>
              </TouchableOpacity>
            )}

            {/* Composer */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Rispondi all'AI Master…"
                placeholderTextColor={c.mutedForeground}
                style={{
                  flex: 1,
                  color: c.foreground,
                  fontSize: 13.5,
                  fontFamily: FONT.regular,
                  backgroundColor: c.muted,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: Platform.OS === "ios" ? 11 : 8,
                }}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSend}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: c.primary,
                }}
              >
                <Feather name="send" size={17} color={c.primaryForeground} />
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Live preview */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 10 }}>
            <Text style={{ color: c.mutedForeground, fontSize: 11, fontFamily: FONT.bold, letterSpacing: 1, textTransform: "uppercase" }}>
              Anteprima in tempo reale
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: phase === "done" ? c.emerald : c.primary }} />
              <Text style={{ color: phase === "done" ? c.emerald : c.primary, fontSize: 11, fontFamily: FONT.bold, letterSpacing: 0.5 }}>
                {phase === "done" ? "COMPLETATO" : "LIVE"}
              </Text>
            </View>
          </View>

          <GlassCard padding={16}>
            <Preview type={creationType} count={count} />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Preview({ type, count }: { type: CreationType; count: number }) {
  const c = useThemeColors();

  if (count === 0) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 30, gap: 10 }}>
        <IconCircle icon="layout" tone="mutedForeground" size={48} />
        <Text style={{ color: c.mutedForeground, fontSize: 13, fontFamily: FONT.regular, textAlign: "center" }}>
          Conferma per avviare la generazione.{"\n"}Gli elementi appariranno qui.
        </Text>
      </View>
    );
  }

  if (type === "gestionale") {
    const statusTone = (s: string) =>
      s === "Pagato" ? c.emerald : s === "Scaduto" ? c.rose : c.amber;
    return (
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Text style={{ flex: 1, color: c.mutedForeground, fontSize: 11, fontFamily: FONT.semibold }}>NOME</Text>
          <Text style={{ color: c.mutedForeground, fontSize: 11, fontFamily: FONT.semibold }}>STATO</Text>
        </View>
        {CREATION_ROWS.slice(0, count).map((r) => (
          <View key={r.name} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5 }}>
            <Text style={{ flex: 1, color: c.foreground, fontSize: 13.5, fontFamily: FONT.medium }}>{r.name}</Text>
            <View style={{ backgroundColor: c.alpha(r.stato === "Pagato" ? "emerald" : r.stato === "Scaduto" ? "rose" : "amber", 0.14), borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ color: statusTone(r.stato), fontSize: 11, fontFamily: FONT.semibold }}>{r.stato}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (type === "landing") {
    return (
      <View style={{ gap: 12 }}>
        {count >= 1 && (
          <View style={{ borderRadius: 14, padding: 18, backgroundColor: c.alpha("primary", 0.12), borderWidth: 1, borderColor: c.alpha("primary", 0.25) }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontFamily: FONT.bold }}>Il tuo Brand, Automatizzato</Text>
            <Text style={{ color: c.mutedForeground, fontSize: 13, fontFamily: FONT.regular, marginTop: 6 }}>
              Acquisisci lead mentre dormi con la potenza dell'AI.
            </Text>
            <View style={{ alignSelf: "flex-start", marginTop: 12, backgroundColor: c.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ color: c.primaryForeground, fontSize: 13, fontFamily: FONT.semibold }}>Inizia Ora</Text>
            </View>
          </View>
        )}
        {count >= 2 && (
          <View style={{ borderRadius: 14, padding: 16, backgroundColor: c.muted }}>
            <Text style={{ color: c.foreground, fontSize: 14, fontFamily: FONT.semibold, marginBottom: 10 }}>Form di Contatto</Text>
            {["Nome", "Email"].map((f) => (
              <View key={f} style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8 }}>
                <Text style={{ color: c.mutedForeground, fontSize: 13, fontFamily: FONT.regular }}>{f}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // workflow
  const NODES = [
    { icon: "zap" as const, tone: "amber" as const, title: "Trigger: Pagamento Stripe" },
    { icon: "git-merge" as const, tone: "blue" as const, title: "Condizione: Importo > 500€" },
    { icon: "send" as const, tone: "emerald" as const, title: "Azione: Invia Email" },
  ];
  return (
    <View>
      {NODES.slice(0, count).map((n, i) => (
        <View key={n.title}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 12, backgroundColor: c.muted, borderWidth: 1, borderColor: c.border }}>
            <IconCircle icon={n.icon} tone={n.tone} size={36} />
            <Text style={{ flex: 1, color: c.foreground, fontSize: 13.5, fontFamily: FONT.medium }}>{n.title}</Text>
          </View>
          {i < Math.min(count, NODES.length) - 1 && (
            <View style={{ alignItems: "center", paddingVertical: 4 }}>
              <View style={{ width: 2, height: 16, backgroundColor: c.border }} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
