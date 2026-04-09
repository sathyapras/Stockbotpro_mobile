import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function AboutUsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const topPad = Platform.OS === "web" ? 24 : insets.top + 16;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingTop: topPad, paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginBottom: 24 }}>
        <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 22 }}>ℹ️ About Us</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: colors.card, borderRadius: 20,
            width: 32, height: 32, alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: colors.border }}
        >
          <Text style={{ color: colors.mutedForeground, fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <View style={{ width: 72, height: 72, borderRadius: 20,
          backgroundColor: "#0ea5e922", borderWidth: 2, borderColor: "#0ea5e9",
          alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 36 }}>📊</Text>
        </View>
        <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 20 }}>StockBot Pro</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4 }}>IDX Market Analysis Platform</Text>
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 24 }}>
          StockBot Pro adalah platform analisa saham IDX yang menggabungkan data AFL AmiBroker,
          analisis aliran broker (bandar), dan Smart Money Flow untuk membantu investor membuat
          keputusan yang lebih tepat.{"\n\n"}
          Dibuat untuk investor Indonesia yang serius dalam menganalisis pasar modal.
        </Text>
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
        {[
          { icon: "📊", title: "Market Intelligence", desc: "IHSG, breadth pasar, dan kondisi makro real-time" },
          { icon: "💎", title: "Smart Money Flow", desc: "Analisis fase broker — akumulasi, markup, distribusi" },
          { icon: "🔍", title: "Stock Screener", desc: "18 strategi teknikal siap pakai" },
          { icon: "📡", title: "Buy/Sell Flow", desc: "Net buy/sell signal BOW & BOS dari AFL" },
          { icon: "🌐", title: "Global Sentiment", desc: "VIX, DXY, dan analisis makro global" },
        ].map((f, i, arr) => (
          <View key={i} style={{
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 16, paddingVertical: 14,
            borderBottomWidth: i < arr.length - 1 ? 1 : 0,
            borderBottomColor: colors.border,
          }}>
            <Text style={{ fontSize: 22, marginRight: 14 }}>{f.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>{f.title}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700",
          letterSpacing: 1, marginBottom: 10 }}>DATA SOURCES</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 20 }}>
          • AFL AmiBroker Signal Engine{"\n"}
          • IDX (Indonesia Stock Exchange){"\n"}
          • Yahoo Finance (VIX / DXY){"\n"}
          • Broker Flow Analysis
        </Text>
      </View>
    </ScrollView>
  );
}
