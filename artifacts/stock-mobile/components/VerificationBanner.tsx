import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useVerification } from "@/context/VerificationContext";

export function VerificationBanner() {
  const { needsVerification, dismiss } = useVerification();
  if (!needsVerification) return null;

  return (
    <View style={{
      marginHorizontal: 16, marginBottom: 12,
      backgroundColor: "#fbbf2418",
      borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: "#fbbf2440",
      flexDirection: "row", alignItems: "center", gap: 10,
    }}>
      <Text style={{ fontSize: 18 }}>📧</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fbbf24", fontWeight: "700", fontSize: 12, marginBottom: 2 }}>
          Verifikasi Email
        </Text>
        <Text style={{ color: "#d97706", fontSize: 11, lineHeight: 16 }}>
          Cek inbox dan klik link verifikasi. Akun aktif tanpa menunggu.
        </Text>
      </View>
      <TouchableOpacity onPress={dismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="x" size={15} color="#92400e" />
      </TouchableOpacity>
    </View>
  );
}
