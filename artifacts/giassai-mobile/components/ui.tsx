import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { FeatherName } from "@/constants/data";
import { AlphaKey, FONT } from "@/constants/theme";
import { useThemeColors } from "@/context/ThemeContext";

export function GlassCard({
  children,
  style,
  intensity = 36,
  padding = 16,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  padding?: number;
}) {
  const c = useThemeColors();
  return (
    <View
      style={[
        {
          borderRadius: c.radius,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.mode === "dark" ? "rgba(7,10,22,0.5)" : "rgba(255,255,255,0.5)",
        },
        style,
      ]}
    >
      {Platform.OS !== "web" && (
        <BlurView intensity={intensity} tint={c.glassTint} style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glassBg }]} />
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

export function Brand({ size = 22 }: { size?: number }) {
  const c = useThemeColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: size * 1.7,
          height: size * 1.7,
          borderRadius: size * 0.5,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.alpha("primary", 0.14),
          borderWidth: 1,
          borderColor: c.alpha("primary", 0.3),
        }}
      >
        <Feather name="zap" size={size} color={c.primary} />
      </View>
      <Text
        style={{
          fontSize: size,
          color: c.foreground,
          fontFamily: FONT.bold,
          letterSpacing: -0.5,
        }}
      >
        Giass
        <Text style={{ color: c.primary, fontFamily: FONT.regular }}>Ai</Text>
      </Text>
    </View>
  );
}

export function GlowTop() {
  const c = useThemeColors();
  return (
    <LinearGradient
      colors={[c.alpha("primary", 0.16), c.alpha("primary", 0)]}
      style={{ position: "absolute", top: 0, left: 0, right: 0, height: 300 }}
      pointerEvents="none"
    />
  );
}

export function IconCircle({
  icon,
  tone = "primary",
  size = 40,
}: {
  icon: FeatherName;
  tone?: AlphaKey;
  size?: number;
}) {
  const c = useThemeColors();
  const color = c[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.alpha(tone, 0.13),
        borderWidth: 1,
        borderColor: c.alpha(tone, 0.26),
      }}
    >
      <Feather name={icon} size={size * 0.46} color={color} />
    </View>
  );
}

export function Tag({ label }: { label: string }) {
  const c = useThemeColors();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: c.alpha("primary", 0.12),
        borderColor: c.alpha("primary", 0.26),
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          color: c.primary,
          fontSize: 10,
          fontFamily: FONT.bold,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function Trend({ value, positive }: { value: string; positive: boolean }) {
  const c = useThemeColors();
  const tone: AlphaKey = positive ? "emerald" : "rose";
  const color = positive ? c.emerald : c.rose;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: c.alpha(tone, 0.13),
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 3,
      }}
    >
      <Feather name={positive ? "trending-up" : "trending-down"} size={11} color={color} />
      <Text style={{ color, fontSize: 11, fontFamily: FONT.semibold }}>{value}</Text>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const c = useThemeColors();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);
  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });
  return (
    <View
      style={{
        height: 6,
        borderRadius: 999,
        backgroundColor: c.muted,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={{
          height: "100%",
          width,
          borderRadius: 999,
          backgroundColor: c.primary,
        }}
      />
    </View>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const c = useThemeColors();
  return (
    <View style={{ marginTop: 26, marginBottom: 4 }}>
      <Text style={{ color: c.foreground, fontSize: 19, fontFamily: FONT.bold, letterSpacing: -0.3 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: c.mutedForeground, fontSize: 13, fontFamily: FONT.regular, marginTop: 3 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function StatusDot({ color }: { color?: string }) {
  const c = useThemeColors();
  return (
    <View
      style={{
        width: 7,
        height: 7,
        borderRadius: 999,
        backgroundColor: color ?? c.emerald,
      }}
    />
  );
}
