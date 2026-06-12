import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useThemeColors } from "@/context/ThemeContext";

type FeatherName = keyof typeof Feather.glyphMap;

const TABS: { name: string; title: string; icon: FeatherName }[] = [
  { name: "index", title: "Control", icon: "grid" },
  { name: "studio", title: "Studio", icon: "layers" },
  { name: "create", title: "Crea", icon: "plus-circle" },
  { name: "settings", title: "Impostazioni", icon: "settings" },
];

// iOS 26 uses NativeTabs for native liquid glass tabs. NativeTabs intentionally
// does NOT use custom design tokens — liquid glass is a system appearance.
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>Control</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="studio">
        <Icon sf={{ default: "square.stack.3d.up", selected: "square.stack.3d.up.fill" }} />
        <Label>Studio</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
        <Label>Crea</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Impostazioni</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const c = useThemeColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 11 },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : c.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: c.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={c.mode === "dark" ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: c.background }]} />
          ) : null,
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color }) => <Feather name={t.icon} size={22} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
