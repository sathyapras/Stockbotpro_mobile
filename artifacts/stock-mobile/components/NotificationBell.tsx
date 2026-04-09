import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useNotifications } from "@/context/NotificationContext";

export function NotificationBell({ color = "#94a3b8" }: { color?: string }) {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity
      onPress={() => router.push("/notifications" as any)}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ justifyContent: "center", alignItems: "center", width: 32, height: 32 }}
    >
      <Feather name="bell" size={20} color={color} />
      {unreadCount > 0 && (
        <View style={{
          position: "absolute", top: 0, right: 0,
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
  );
}
