import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Platform, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard, GlowTop, IconCircle } from "@/components/ui";
import { FeatherName } from "@/constants/data";
import { ACCENTS, AccentKey, FONT, ThemeMode } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

const MODES: { key: ThemeMode; label: string; icon: FeatherName }[] = [
  { key: "light", label: "Chiaro", icon: "sun" },
  { key: "dark", label: "Scuro", icon: "moon" },
];

const ACCENT_KEYS: AccentKey[] = ["purple", "cyan", "emerald", "amber", "blue", "rose"];

export default function SettingsScreen() {
  const { colors: c, mode, setMode, accent, setAccent } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [notify, setNotify] = useState(true);

  const pickMode = (m: ThemeMode) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setMode(m);
  };
  const pickAccent = (a: AccentKey) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setAccent(a);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <GlowTop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPad + 10,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 120,
        }}
      >
        <Text style={{ color: c.foreground, fontSize: 30, fontFamily: FONT.bold, letterSpacing: -0.8 }}>
          Impostazioni
        </Text>
        <Text style={{ color: c.mutedForeground, fontSize: 13, fontFamily: FONT.regular, marginTop: 6 }}>
          Personalizza l'aspetto e gestisci l'account.
        </Text>

        <Text style={sectionLabel(c)}>ASPETTO</Text>
        <GlassCard>
          <Text style={{ color: c.foreground, fontSize: 14, fontFamily: FONT.semibold }}>Tema</Text>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 12,
            }}
          >
            {MODES.map((m) => {
              const active = m.key === mode;
              return (
                <TouchableOpacity
                  key={m.key}
                  activeOpacity={0.85}
                  onPress={() => pickMode(m.key)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 12,
                    borderRadius: 13,
                    borderWidth: 1,
                    borderColor: active ? c.alpha("primary", 0.5) : c.border,
                    backgroundColor: active ? c.alpha("primary", 0.12) : c.muted,
                  }}
                >
                  <Feather name={m.icon} size={16} color={active ? c.primary : c.mutedForeground} />
                  <Text style={{ color: active ? c.foreground : c.mutedForeground, fontSize: 14, fontFamily: FONT.semibold }}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ color: c.foreground, fontSize: 14, fontFamily: FONT.semibold, marginTop: 20 }}>
            Colore Accento
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
            {ACCENT_KEYS.map((a) => {
              const def = ACCENTS[a];
              const swatch = `hsl(${def.h}, ${def.s}%, ${def.l}%)`;
              const active = a === accent;
              return (
                <TouchableOpacity key={a} activeOpacity={0.8} onPress={() => pickAccent(a)} style={{ alignItems: "center", width: 46 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      backgroundColor: swatch,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: active ? c.foreground : "transparent",
                    }}
                  >
                    {active && <Feather name="check" size={18} color="#ffffff" />}
                  </View>
                  <Text style={{ color: c.mutedForeground, fontSize: 10.5, fontFamily: FONT.medium, marginTop: 5 }}>
                    {def.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        <Text style={sectionLabel(c)}>ACCOUNT & SICUREZZA</Text>
        <GlassCard padding={6}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
            <IconCircle icon="bell" tone="amber" size={38} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.foreground, fontSize: 14.5, fontFamily: FONT.semibold }}>Notifiche AI</Text>
              <Text style={{ color: c.mutedForeground, fontSize: 12, fontFamily: FONT.regular, marginTop: 2 }}>
                Avvisi dagli agenti
              </Text>
            </View>
            <Switch
              value={notify}
              onValueChange={setNotify}
              trackColor={{ false: c.muted, true: c.primary }}
              thumbColor="#ffffff"
            />
          </View>
          <Divider c={c} />
          <Row c={c} icon="key" tone="blue" title="Chiavi API" subtitle="Gestisci integrazioni" />
          <Divider c={c} />
          <Row c={c} icon="shield" tone="emerald" title="Sicurezza Account" subtitle="Password e accessi" />
        </GlassCard>

        <View style={{ alignItems: "center", marginTop: 28, gap: 6 }}>
          <MaterialCommunityIcons name="robot-happy-outline" size={22} color={c.mutedForeground} />
          <Text style={{ color: c.mutedForeground, fontSize: 12, fontFamily: FONT.regular }}>GiassAi · versione 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  c,
  icon,
  tone,
  title,
  subtitle,
}: {
  c: ReturnType<typeof useTheme>["colors"];
  icon: FeatherName;
  tone: "blue" | "emerald" | "amber";
  title: string;
  subtitle: string;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
      <IconCircle icon={icon} tone={tone} size={38} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.foreground, fontSize: 14.5, fontFamily: FONT.semibold }}>{title}</Text>
        <Text style={{ color: c.mutedForeground, fontSize: 12, fontFamily: FONT.regular, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={c.mutedForeground} />
    </TouchableOpacity>
  );
}

function Divider({ c }: { c: ReturnType<typeof useTheme>["colors"] }) {
  return <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 12 }} />;
}

function sectionLabel(c: ReturnType<typeof useTheme>["colors"]) {
  return {
    color: c.mutedForeground,
    fontSize: 11,
    fontFamily: FONT.bold,
    letterSpacing: 1,
    marginTop: 26,
    marginBottom: 10,
  } as const;
}
