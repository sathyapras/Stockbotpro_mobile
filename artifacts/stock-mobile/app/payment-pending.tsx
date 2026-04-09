import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PaymentPendingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  return (
    <View style={{
      flex: 1, backgroundColor: "#0f1629",
      alignItems: "center", justifyContent: "center",
      padding: 32, paddingBottom: insets.bottom + 32,
    }}>
      <Text style={{ fontSize: 64, marginBottom: 20 }}>⏳</Text>

      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22,
        textAlign: "center", marginBottom: 8 }}>
        Menunggu Konfirmasi
      </Text>

      <Text style={{ color: "#64748b", fontSize: 14, textAlign: "center",
        lineHeight: 22, marginBottom: 8 }}>
        Pembayaran kamu sedang diproses. Akses akan aktif otomatis setelah pembayaran dikonfirmasi.
      </Text>

      {orderId ? (
        <Text style={{ color: "#334155", fontSize: 11, marginBottom: 32 }}>
          Order ID: {orderId}
        </Text>
      ) : <View style={{ marginBottom: 32 }} />}

      <View style={{ backgroundColor: "#1c1a08", borderRadius: 12,
        padding: 16, width: "100%", borderLeftWidth: 3,
        borderLeftColor: "#eab308", marginBottom: 32 }}>
        <Text style={{ color: "#eab308", fontWeight: "700", fontSize: 13,
          marginBottom: 6 }}>Apa yang harus dilakukan?</Text>
        <Text style={{ color: "#ca8a04", fontSize: 12, lineHeight: 20 }}>
          • Selesaikan pembayaran sesuai instruksi yang dikirim ke email kamu{"\n"}
          • Pembayaran transfer bank biasanya dikonfirmasi dalam 1-2 jam{"\n"}
          • Restart app setelah pembayaran dikonfirmasi
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => {
          router.dismissAll?.();
          router.replace("/(tabs)" as any);
        }}
        style={{ backgroundColor: "#0ea5e9", borderRadius: 14,
          paddingHorizontal: 32, paddingVertical: 16,
          width: "100%", alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
          Kembali ke Beranda
        </Text>
      </TouchableOpacity>
    </View>
  );
}
