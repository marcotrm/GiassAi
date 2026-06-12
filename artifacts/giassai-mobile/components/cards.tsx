import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import {
  FunnelItem,
  Gestionale,
  Kpi,
  Project,
  TYPE_LABEL,
  WorkflowItem,
} from "@/constants/data";
import { FONT } from "@/constants/theme";
import { useThemeColors } from "@/context/ThemeContext";

import { GlassCard, IconCircle, ProgressBar, Tag, Trend } from "./ui";

export function AgentStack({ count }: { count: number }) {
  const c = useThemeColors();
  const shown = Math.min(count, 4);
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {Array.from({ length: shown }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.cardElevated,
            borderWidth: 1.5,
            borderColor: c.alpha("primary", 0.4),
            marginLeft: i === 0 ? 0 : -9,
          }}
        >
          <MaterialCommunityIcons name="robot-outline" size={15} color={c.primary} />
        </View>
      ))}
    </View>
  );
}

export function KpiCard({ item }: { item: Kpi }) {
  const c = useThemeColors();
  return (
    <GlassCard>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <IconCircle icon={item.icon} tone={item.tone} />
        <Trend value={item.trend} positive={item.positive} />
      </View>
      <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 14, fontFamily: FONT.medium }}>
        {item.label}
      </Text>
      <Text style={{ color: c.foreground, fontSize: 23, marginTop: 3, fontFamily: FONT.bold }}>
        {item.value}
      </Text>
    </GlassCard>
  );
}

export function ProjectCard({ item, onPress }: { item: Project; onPress?: () => void }) {
  const c = useThemeColors();
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ marginTop: 12 }}>
      <GlassCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <IconCircle icon="folder" tone="primary" />
          <AgentStack count={item.agents} />
        </View>
        <View style={{ marginTop: 14 }}>
          <Tag label={TYPE_LABEL[item.type]} />
        </View>
        <Text style={{ color: c.foreground, fontSize: 16, marginTop: 10, fontFamily: FONT.semibold }}>
          {item.title}
        </Text>
        <Text style={{ color: c.mutedForeground, fontSize: 13, marginTop: 3, fontFamily: FONT.regular }}>
          {item.desc}
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            marginBottom: 7,
          }}
        >
          <Text style={{ color: c.mutedForeground, fontSize: 12, fontFamily: FONT.medium }}>Progresso</Text>
          <Text style={{ color: c.primary, fontSize: 13, fontFamily: FONT.bold }}>{item.progress}%</Text>
        </View>
        <ProgressBar value={item.progress} />
      </GlassCard>
    </TouchableOpacity>
  );
}

function StatChip({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  const c = useThemeColors();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Feather name={icon} size={12} color={c.mutedForeground} />
        <Text style={{ color: c.mutedForeground, fontSize: 11, fontFamily: FONT.medium }}>{label}</Text>
      </View>
      <Text style={{ color: c.foreground, fontSize: 15, marginTop: 3, fontFamily: FONT.semibold }}>{value}</Text>
    </View>
  );
}

export function GestionaleCard({ item, onPress }: { item: Gestionale; onPress?: () => void }) {
  const c = useThemeColors();
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ marginTop: 12 }}>
      <GlassCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconCircle icon="database" tone="primary" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.foreground, fontSize: 15, fontFamily: FONT.semibold }}>{item.title}</Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2, fontFamily: FONT.regular }}>
              Aggiornato {item.updated}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={c.mutedForeground} />
        </View>
        <View
          style={{
            flexDirection: "row",
            marginTop: 14,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: c.border,
          }}
        >
          <StatChip icon="layers" label="Record" value={item.records} />
          <StatChip icon="cpu" label="Agenti AI" value={String(item.agents)} />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

export function FunnelCard({ item, onPress }: { item: FunnelItem; onPress?: () => void }) {
  const c = useThemeColors();
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ marginTop: 12 }}>
      <GlassCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconCircle icon="mouse-pointer" tone="blue" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.foreground, fontSize: 15, fontFamily: FONT.semibold }}>{item.title}</Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2, fontFamily: FONT.regular }}>
              Landing & Funnel
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            marginTop: 14,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: c.border,
          }}
        >
          <StatChip icon="eye" label="Visite" value={item.visite} />
          <StatChip icon="users" label="Lead" value={item.lead} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Feather name="target" size={12} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, fontSize: 11, fontFamily: FONT.medium }}>Conv.</Text>
            </View>
            <Text style={{ color: c.emerald, fontSize: 15, marginTop: 3, fontFamily: FONT.bold }}>{item.conv}</Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

export function WorkflowCard({ item, onPress }: { item: WorkflowItem; onPress?: () => void }) {
  const c = useThemeColors();
  const tone = item.active ? "emerald" : "mutedForeground";
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ marginTop: 12 }}>
      <GlassCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconCircle icon="git-merge" tone="amber" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.foreground, fontSize: 15, fontFamily: FONT.semibold }}>{item.title}</Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2, fontFamily: FONT.regular }}>
              {item.nodes} nodi
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: c.alpha(tone, 0.13),
              borderRadius: 999,
              paddingHorizontal: 9,
              paddingVertical: 4,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                backgroundColor: item.active ? c.emerald : c.mutedForeground,
              }}
            />
            <Text style={{ color: item.active ? c.emerald : c.mutedForeground, fontSize: 11, fontFamily: FONT.semibold }}>
              {item.active ? "Attivo" : "In pausa"}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            marginTop: 14,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: c.border,
          }}
        >
          <StatChip icon="activity" label="Esecuzioni" value={item.runs} />
          <StatChip icon="git-merge" label="Nodi" value={String(item.nodes)} />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}
