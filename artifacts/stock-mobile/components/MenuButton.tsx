import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";

export function MenuButton({ color = "#94a3b8" }: { color?: string }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push("/menu" as any)}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ justifyContent: "center", alignItems: "center", width: 32, height: 32 }}
    >
      <View style={{ gap: 5 }}>
        <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: color }} />
        <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: color }} />
        <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: color }} />
      </View>
    </TouchableOpacity>
  );
}
