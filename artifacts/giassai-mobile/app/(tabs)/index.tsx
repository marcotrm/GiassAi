import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KpiCard, ProjectCard } from "@/components/cards";
import { Brand, GlassCard, GlowTop, SectionTitle, StatusDot } from "@/components/ui";
import { CreationType, KPIS, PROJECTS } from "@/constants/data";
import { FONT } from "@/constants/theme";
import { useAppState } from "@/context/AppState";
import { useTheme } from "@/context/ThemeContext";

export default function ControlRoom() {
  const { colors: c, mode, toggleMode } = useTheme();
  const { setCreationType } = useAppState();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const today = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long" });

  const openCreate = (type?: CreationType) => {
    if (type) setCreationType(type);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.navigate("/create");
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Brand />
          <TouchableOpacity
            onPress={toggleMode}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <Feather name={mode === "dark" ? "sun" : "moon"} size={18} color={c.foreground} />
          </TouchableOpacity>
        </View>

        <Text style={{ color: c.foreground, fontSize: 30, fontFamily: FONT.bold, letterSpacing: -0.8, marginTop: 22 }}>
          Control Room
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 6 }}>
          <StatusDot />
          <Text style={{ color: c.mutedForeground, fontSize: 13, fontFamily: FONT.regular }}>
            Sistemi operativi normali · {today}
          </Text>
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={() => openCreate()} style={{ marginTop: 18 }}>
          <GlassCard padding={14}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: c.alpha("primary", 0.14),
                }}
              >
                <Feather name="mic" size={18} color={c.primary} />
              </View>
              <Text style={{ flex: 1, color: c.mutedForeground, fontSize: 13.5, fontFamily: FONT.regular }}>
                Di' a GiassAi cosa creare oggi…
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: c.primary,
                  borderRadius: 12,
                  paddingHorizontal: 13,
                  paddingVertical: 9,
                }}
              >
                <Feather name="zap" size={14} color={c.primaryForeground} />
                <Text style={{ color: c.primaryForeground, fontSize: 13, fontFamily: FONT.semibold }}>Crea</Text>
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 18 }}>
          {KPIS.map((k) => (
            <View key={k.label} style={{ width: "48.5%", marginBottom: 12 }}>
              <KpiCard item={k} />
            </View>
          ))}
        </View>

        <SectionTitle title="Progetti Attivi" subtitle="I tuoi agenti stanno lavorando su 5 fronti." />
        {PROJECTS.map((p) => (
          <ProjectCard key={p.title} item={p} onPress={() => openCreate(p.type)} />
        ))}
      </ScrollView>
    </View>
  );
}
