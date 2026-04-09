import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const STEPS = [
  { step: "1", title: "Pantau Market di Tab Market", color: "#0ea5e9",
    desc: "Lihat kondisi IHSG, breadth pasar (naik/turun/flat), sinyal RISK ON/OFF, dan Command Center di halaman utama." },
  { step: "2", title: "Cek Buy/Sell Flow (Tab Flow)", color: "#34d399",
    desc: "Lihat Net Buy/Sell untuk melihat tekanan beli atau jual. Gunakan filter indeks (LQ45, IDX30, dll.) dan filter BOW/BOS." },
  { step: "3", title: "Gunakan Smart Money (Tab Smart)", color: "#a78bfa",
    desc: "Tersedia setelah jam 17:30 WIB. Lihat fase broker per saham — Accumulation, Markup, Distribution, atau Churning." },
  { step: "4", title: "Tambah ke Watchlist", color: "#fbbf24",
    desc: "Simpan saham pilihan di tab Watchlist. Pantau harga, perubahan harian, dan kondisi terkini (maks. 30 saham)." },
  { step: "5", title: "Gunakan Stock Tools (Tab Stock Tools)", color: "#f97316",
    desc: "Pilih dari 18 strategi teknikal untuk menemukan saham dengan setup terbaik. Tap kartu strategi untuk melihat daftar saham yang memenuhi kriteria." },
  { step: "6", title: "Detail Saham", color: "#ec4899",
    desc: "Tap ticker manapun untuk membuka detail: Trading Plan (TP/SL/RR), Chart (MA10/MA20), Fundamental, Smart Money, dan Level Kunci." },
  { step: "7", title: "Global Sentiment", color: "#14b8a6",
    desc: "Akses dari kartu 'Sentimen Global' di tab Market. Berisi analisis VIX, DXY, kurs Rupiah, dan narasi kondisi makro." },
];

export default function TutorialScreen() {
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
        justifyContent: "space-between", marginBottom: 28 }}>
        <View>
          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 22 }}>📖 Tutorial</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>
            Panduan penggunaan StockBot Pro
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: colors.card, borderRadius: 20,
            width: 32, height: 32, alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: colors.border }}
        >
          <Text style={{ color: colors.mutedForeground, fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>

      {STEPS.map((t, i) => (
        <View key={t.step} style={{ flexDirection: "row", marginBottom: 24 }}>
          <View style={{ alignItems: "center", marginRight: 14 }}>
            <View style={{
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: t.color + "22",
              borderWidth: 2, borderColor: t.color,
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ color: t.color, fontWeight: "900", fontSize: 13 }}>{t.step}</Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={{ width: 2, flex: 1, marginTop: 6,
                backgroundColor: t.color + "30", minHeight: 16 }} />
            )}
          </View>
          <View style={{ flex: 1, paddingTop: 4 }}>
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14, marginBottom: 6 }}>
              {t.title}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 21 }}>
              {t.desc}
            </Text>
          </View>
        </View>
      ))}

      <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16,
        borderLeftWidth: 3, borderLeftColor: "#0ea5e9", marginTop: 8 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 20 }}>
          💡 <Text style={{ fontWeight: "700", color: "#0ea5e9" }}>Tips:</Text>{" "}
          Data BOW/BOS dan Smart Money diperbarui setiap hari setelah penutupan pasar jam 17:30 WIB.
          Gunakan tab Market untuk memantau kondisi intraday.
        </Text>
      </View>
    </ScrollView>
  );
}
