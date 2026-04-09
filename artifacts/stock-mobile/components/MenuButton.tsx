import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useNotifications } from "@/context/NotificationContext";

export function MenuButton({ color = "#94a3b8" }: { color?: string }) {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {/* Bell / Notifications */}
      <TouchableOpacity
        onPress={() => router.push("/notifications" as any)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ justifyContent: "center", alignItems: "center", width: 36, height: 36 }}
      >
        <Feather name="bell" size={20} color={color} />
        {unreadCount > 0 && (
          <View style={{
            position: "absolute", top: 2, right: 2,
            minWidth: 16, height: 16, borderRadius: 8,
            backgroundColor: "#f87171",
            alignItems: "center", justifyContent: "center",
            paddingHorizontal: 2,
          }}>
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Hamburger / Menu */}
      <TouchableOpacity
        onPress={() => router.push("/menu" as any)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ justifyContent: "center", alignItems: "center", width: 36, height: 36 }}
      >
        <View style={{ gap: 5 }}>
          <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: color }} />
          <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: color }} />
          <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: color }} />
        </View>
      </TouchableOpacity>
    </View>
  );
}
