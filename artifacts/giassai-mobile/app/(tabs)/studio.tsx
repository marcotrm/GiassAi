import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FunnelCard, GestionaleCard, WorkflowCard } from "@/components/cards";
import { GlowTop } from "@/components/ui";
import {
  CreationType,
  FUNNELS,
  GESTIONALI,
  WORKFLOWS,
} from "@/constants/data";
import { FONT } from "@/constants/theme";
import { useAppState } from "@/context/AppState";
import { useThemeColors } from "@/context/ThemeContext";

type SegKey = "gestionali" | "funnel" | "workflow";

const SEGMENTS: { key: SegKey; label: string; type: CreationType }[] = [
  { key: "gestionali", label: "Gestionali", type: "gestionale" },
  { key: "funnel", label: "Funnel", type: "landing" },
  { key: "workflow", label: "Workflow", type: "workflow" },
];

export default function StudioScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [seg, setSeg] = useState<SegKey>("gestionali");
  const { setCreationType } = useAppState();

  const open = (type: CreationType) => {
    setCreationType(type);
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
        <Text style={{ color: c.foreground, fontSize: 30, fontFamily: FONT.bold, letterSpacing: -0.8 }}>
          Studio
        </Text>
        <Text style={{ color: c.mutedForeground, fontSize: 13, fontFamily: FONT.regular, marginTop: 6 }}>
          Gestionali, Landing & Funnel e Workflow.
        </Text>

        <View
          style={{
            flexDirection: "row",
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 14,
            padding: 4,
            marginTop: 20,
            gap: 4,
          }}
        >
          {SEGMENTS.map((s) => {
            const active = s.key === seg;
            return (
              <TouchableOpacity
                key={s.key}
                activeOpacity={0.8}
                onPress={() => setSeg(s.key)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: active ? c.primary : "transparent",
                }}
              >
                <Text
                  style={{
                    color: active ? c.primaryForeground : c.mutedForeground,
                    fontSize: 13,
                    fontFamily: FONT.semibold,
                  }}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginTop: 8 }}>
          {seg === "gestionali" &&
            GESTIONALI.map((g) => <GestionaleCard key={g.title} item={g} onPress={() => open("gestionale")} />)}
          {seg === "funnel" &&
            FUNNELS.map((f) => <FunnelCard key={f.title} item={f} onPress={() => open("landing")} />)}
          {seg === "workflow" &&
            WORKFLOWS.map((w) => <WorkflowCard key={w.title} item={w} onPress={() => open("workflow")} />)}
        </View>
      </ScrollView>
    </View>
  );
}
