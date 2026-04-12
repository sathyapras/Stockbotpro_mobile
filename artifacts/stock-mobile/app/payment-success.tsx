import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

export default function PaymentSuccessScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const qc      = useQueryClient();
  const params  = useLocalSearchParams<{
    orderId: string;
    amount: string;
    packagePlan: string;
    months: string;
  }>();

  const { orderId, amount, packagePlan, months } = params;

  // Refresh user subscription state
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["me"] });
  }, []);

  return (
    <View style={{
      flex: 1, backgroundColor: "#0f1629",
      alignItems: "center", justifyContent: "center",
      padding: 32,
      paddingBottom: insets.bottom + 32,
    }}>
      <Text style={{ fontSize: 64, marginBottom: 20 }}>🎉</Text>

      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 24,
        textAlign: "center", marginBottom: 8 }}>
        Pembayaran Berhasil!
      </Text>

      <Text style={{ color: "#64748b", fontSize: 14,
        textAlign: "center", marginBottom: 4 }}>
        Paket {packagePlan?.toUpperCase()} · {months} bulan aktif
      </Text>

      <Text style={{ color: "#34d399", fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
        Rp {parseInt(amount ?? "0", 10).toLocaleString("id-ID")}
      </Text>

      {orderId ? (
        <Text style={{ color: "#334155", fontSize: 11, marginBottom: 32 }}>
          Order ID: {orderId}
        </Text>
      ) : null}

      {/* Benefits reminder */}
      <View style={{ backgroundColor: "#1e2433", borderRadius: 14,
        padding: 16, width: "100%", marginBottom: 32 }}>
        <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700",
          letterSpacing: 1, marginBottom: 10 }}>KAMU SEKARANG PUNYA AKSES</Text>
        {[
          { icon: "🎯", text: "BOW & BOS Signal — entry presisi berbasis aliran institusi" },
          { icon: "💎", text: "Smart Money Flow — Prime, Alpha & Echo Flow broker dominan" },
          { icon: "📡", text: "Radar Market — fase Ignition, Accumulation & Distribution" },
          { icon: "🤖", text: "RoboCommentary — analisis AI 290+ saham IDX setiap hari" },
          { icon: "📊", text: "Chart + MA50 Distance, ADX & Support/Resistance" },
          { icon: "📋", text: "Trading Log — jurnal P&L otomatis per sinyal" },
          { icon: "🌍", text: "Sentiment Global — indikator makro & mood pasar dunia" },
          { icon: "🛠️", text: "Stock Tools — kalkulator posisi & risk/reward instan" },
        ].map((f, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start",
            gap: 10, marginBottom: 8 }}>
            <Text style={{ fontSize: 15 }}>{f.icon}</Text>
            <Text style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 20, flex: 1 }}>{f.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => {
          // Reset navigation to tabs root
          router.dismissAll?.();
          router.replace("/(tabs)" as any);
        }}
        style={{ backgroundColor: "#0ea5e9", borderRadius: 14,
          paddingHorizontal: 32, paddingVertical: 16, width: "100%",
          alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
          Mulai Gunakan Fitur Premium
        </Text>
      </TouchableOpacity>
    </View>
  );
}
