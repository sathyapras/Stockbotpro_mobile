import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── CMS Base ─────────────────────────────────────────────────

const BASE = "https://stockbotpro.replit.app";

// ─── Design tokens ────────────────────────────────────────────

const AMBER = "#f5c518";

// Hex colors — proper rgba() opacity support
const STEP_ACCENTS = [
  "#00d4ff", // Cyan
  "#f5c518", // Amber
  "#00d4ff", // Cyan
  "#b87eff", // Purple
  "#33cc66", // Green
  "#44dd44", // Lime
  "#e05252", // Rose
];

function getAccent(idx: number) {
  return STEP_ACCENTS[idx % STEP_ACCENTS.length];
}

// Parse hex → rgba string
function hexRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Home Screen Guide (hardcoded) ───────────────────────────

interface HomeGuideItem {
  icon: string;
  title: string;
  desc: string;
  color: string;
  link?: string;
  linkLabel?: string;
}

const HOME_GUIDE: HomeGuideItem[] = [
  {
    icon: "🏠",
    title: "Header & Status Pasar",
    color: "#00d4ff",
    desc:
      "Bagian teratas menampilkan sapaan harian dan kondisi pasar saat ini: jumlah saham yang naik (Adv) dan turun (Dec), serta arah IHSG hari ini.\n\nAda juga tiga indikator mini:\n• Akumulasi % — persentase saham yang sedang diakumulasi (sinyal beli bandar)\n• Distribusi % — persentase saham yang sedang didistribusi (sinyal jual bandar)\n• Avg Flow SM — rata-rata Bandar Score dari seluruh saham (skala 0–100). Makin tinggi = semakin banyak aliran masuk dari smart money.",
    link: "/home",
    linkLabel: "Buka Home",
  },
  {
    icon: "🎛️",
    title: "Command Center",
    color: "#f5c518",
    desc:
      "Empat kartu pintas yang merangkum kondisi market secara real-time:\n\n• 🎯 STOCKPICK — jumlah saham dengan sinyal entry kuat (fase IGNITION). Menampilkan saham terpanas hari ini.\n• ⚡ FLOW — perbandingan saham akumulasi vs distribusi, plus saham dengan Net Buy terbesar.\n• 💎 SMART MONEY — saham dengan Bandar Score tertinggi hari ini.\n• 📡 RADAR — total saham fase ignition dan saham dengan score broker terkuat.\n\nBaris bawah:\n• 🔄 Sector Rotation — berapa sektor leading vs lagging\n• 🌐 Market Intel — kondisi global dan breadth pasar",
    link: "/(tabs)/stockpick",
    linkLabel: "Buka Stockpick",
  },
  {
    icon: "⚡",
    title: "Signal Snapshot",
    color: "#b87eff",
    desc:
      "Panel ini menampilkan 5 saham terpilih per kategori dalam format tab:\n\n• ⭐ Top Akumulasi — saham dengan Bandar Score tertinggi yang sedang diakumulasi\n• 🚀 Entry Peluang — saham fase IGNITION (akumulasi kuat + score ≥65) diurutkan dari net buy terbesar\n• ⚠️ Peringatan — saham yang mulai masuk distribusi, perlu waspada\n• ✅ Strong Trend — saham dengan tren naik stabil dan flow masuk konsisten\n\nTap kartu saham untuk melihat detail teknikal lengkap.",
    link: "/(tabs)/screener",
    linkLabel: "Lihat Screener",
  },
  {
    icon: "📊",
    title: "Phase Distribution",
    color: "#33cc66",
    desc:
      "Bar horizontal yang menampilkan komposisi fase dari seluruh saham di RADAR:\n\n• Hijau tua — IGNITION (akumulasi kuat, potensi entry)\n• Hijau — EARLY_ACC (awal akumulasi)\n• Biru — STRONG_TREND (tren kuat)\n• Oranye — EXHAUSTION (mulai lemah)\n• Merah — DISTRIBUTION (distribusi/jual bandar)\n• Abu — CHURNING (netral)\n\nDi bawah bar terdapat 3 angka kunci:\n• Avg Flow Score — rata-rata flow score 0–100\n• Akumulasi % — persen saham fase positif\n• Distribusi % — persen saham fase negatif\n\nSemakin dominan warna hijau = kondisi pasar lebih bullish.",
    link: "/market-intel",
    linkLabel: "Lihat Market Intel",
  },
  {
    icon: "🌍",
    title: "Sentimen Global",
    color: "#00d4ff",
    desc:
      "Kartu ringkasan kondisi global yang mempengaruhi IDX:\n\n• VIX (Fear & Greed Index) — indikator volatilitas pasar global\n  < 20 → NEUTRAL/GREED (kondisi aman)\n  20–25 → zona waspada\n  > 25 → FEAR (waspadai tekanan jual)\n\n• RISK ON / RISK OFF / MIXED — bias aliran dana global saat ini\n\n• USD/IDR — nilai tukar dollar. Rupiah melemah (USD/IDR naik) = tekanan pada saham-saham berbiaya dolar.\n\nTap kartu untuk melihat detail lengkap: indeks dunia, DXY, dan komoditas.",
    link: "/global-sentiment",
    linkLabel: "Buka Sentimen Global",
  },
  {
    icon: "🛡️",
    title: "Market Risk Score",
    color: "#e05252",
    desc:
      "Skor risiko pasar 0–10 yang dihitung dari 4 komponen:\n\n1. Market Breadth — seberapa banyak saham yang turun vs naik (market width)\n2. Smart Money Flow — seberapa besar persentase saham dalam distribusi\n3. Arah IHSG — apakah IHSG turun signifikan hari ini (< −1.5%)\n4. Avg Flow Score — jika rata-rata bandar score < 30, ada sinyal kelemahan\n\nInterpretasi:\n• 0–3 → LOW RISK (kondisi aman, bisa entry bertahap)\n• 4–5 → MEDIUM RISK (selektif, pilih saham terkuat)\n• 6–7 → MED-HIGH (kurangi exposure)\n• 8–10 → HIGH RISK (hindari entry baru)\n\nTap untuk melihat breakdown tiap komponen.",
  },
  {
    icon: "🚀",
    title: "Top Gainers & Top Losers",
    color: "#f97316",
    desc:
      "Scroll horizontal berisi saham dengan perubahan harga terbesar hari ini dari database Master Stock IDX.\n\n• Top Gainers — saham naik paling tinggi (urutkan dari % tertinggi)\n• Top Losers — saham turun paling dalam\n\nGunakan ini untuk:\n• Identifikasi saham yang sedang mendapat perhatian pasar\n• Cek apakah kenaikan didukung oleh akumulasi bandar (lihat di Radar/Bandar)\n• Hindari FOMO — kenaikan besar tanpa dukungan flow bandar berisiko reversal",
    link: "/(tabs)/stockpick",
    linkLabel: "Buka Stockpick",
  },
];

// ─── Tips (hardcoded) ─────────────────────────────────────────

const TIPS = [
  "Gunakan Market Radar setiap pagi sebelum masuk posisi",
  "Konfirmasi sinyal Smart Money Flow dengan volume yang tinggi",
  "Jangan masuk semua posisi sekaligus — averaging bertahap lebih aman",
  "Patuhi stop loss 3–5% per posisi tanpa pengecualian",
  "Cek Sector Rotation untuk tahu sektor mana yang sedang leading",
  "Watchlist berguna untuk pantau saham kandidat sebelum beli",
];

// ─── Types ────────────────────────────────────────────────────

interface StepRow {
  id: number;
  title: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
}

interface StepData {
  desc: string;
  link: string;
  linkLabel: string;
}

function parseStep(raw: string): StepData {
  try {
    return JSON.parse(raw);
  } catch {
    return { desc: raw, link: "", linkLabel: "" };
  }
}

// ─── Link → Expo route mapping ────────────────────────────────

const LINK_TO_ROUTE: Record<string, string> = {
  "/home":            "/(tabs)/",
  "/market-analysis": "/(tabs)/smartmoney",
  "/bandar-detector": "/(tabs)/bandar",
  "/stockpick":       "/(tabs)/stockpick",
  "/screener":        "/(tabs)/screener",
  "/watchlist":       "/(tabs)/watchlist",
  "/trading-log":     "/(tabs)/trading-log",
  "/sector-rotation": "/sector-rotation",
  "/market-intel":    "/market-intel",
  "/global-sentiment":"/global-sentiment",
};

function routeFromLink(link: string): string {
  return LINK_TO_ROUTE[link] ?? "/(tabs)/";
}

// ─── Home Screen Guide Component ─────────────────────────────

function HomeScreenGuide() {
  const router = useRouter();
  const [openIdx, setOpenIdx] = useState<number>(-1);

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      {/* Section header */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 8,
        marginBottom: 12, paddingBottom: 10,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
      }}>
        <Text style={{ fontSize: 18 }}>🏠</Text>
        <View>
          <Text style={{ color: "#e2e8f0", fontWeight: "800", fontSize: 15 }}>
            Panduan Home Screen
          </Text>
          <Text style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
            Penjelasan setiap bagian halaman utama
          </Text>
        </View>
      </View>

      {HOME_GUIDE.map((item, idx) => {
        const isOpen = openIdx === idx;
        const accent = item.color;

        return (
          <View
            key={idx}
            style={[
              styles.stepCard,
              {
                borderColor:     isOpen ? hexRgba(accent, 0.5) : "rgba(255,255,255,0.08)",
                backgroundColor: isOpen ? hexRgba(accent, 0.07) : "rgba(255,255,255,0.03)",
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setOpenIdx(prev => prev === idx ? -1 : idx)}
              style={styles.stepHeader}
              activeOpacity={0.7}
            >
              <View style={[
                styles.stepNumBox,
                {
                  backgroundColor: isOpen ? hexRgba(accent, 0.25) : hexRgba(accent, 0.12),
                  borderColor:     isOpen ? hexRgba(accent, 0.6)  : hexRgba(accent, 0.3),
                },
              ]}>
                <Text style={{ fontSize: 14 }}>{item.icon}</Text>
              </View>

              <Text
                style={[styles.stepTitle, { color: isOpen ? accent : "#e2e8f0" }]}
                numberOfLines={isOpen ? undefined : 1}
              >
                {item.title}
              </Text>

              <Text style={{ color: isOpen ? accent : "#475569", fontSize: 16, marginLeft: 8 }}>
                {isOpen ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={styles.stepBody}>
                <Text style={styles.stepDesc}>{item.desc}</Text>
                {item.link && (
                  <TouchableOpacity
                    onPress={() => router.push(item.link as any)}
                    style={[styles.stepLinkBtn, { borderColor: hexRgba(accent, 0.4) }]}
                  >
                    <Text style={[styles.stepLinkText, { color: accent }]}>
                      {item.linkLabel ?? "Buka"} →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function TutorialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 24 : insets.top + 16;

  const [steps,   setSteps]   = useState<StepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIdx, setOpenIdx] = useState<number>(0);

  useEffect(() => {
    fetch(`${BASE}/api/cms/content/tutorial_steps`)
      .then(r => r.ok ? r.json() : [])
      .then((rows: StepRow[]) => {
        setSteps(rows.filter(r => r.isActive));
      })
      .catch(() => setSteps([]))
      .finally(() => setLoading(false));
  }, []);

  function toggleStep(idx: number) {
    setOpenIdx(prev => prev === idx ? -1 : idx);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 48, paddingTop: topPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📖 Tutorial Penggunaan</Text>
          <Text style={styles.headerSub}>Home screen & langkah penggunaan</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={{ color: "#64748b", fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Home Screen Guide ── */}
      <HomeScreenGuide />

      {/* ── Divider: Tutorial Langkah-Langkah ── */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12, marginTop: 4 }}>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 8,
          paddingBottom: 10,
          borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
        }}>
          <Text style={{ fontSize: 18 }}>📋</Text>
          <View>
            <Text style={{ color: "#e2e8f0", fontWeight: "800", fontSize: 15 }}>
              Langkah Penggunaan
            </Text>
            <Text style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
              Panduan step-by-step dari admin
            </Text>
          </View>
        </View>
      </View>

      {/* ── Loading ── */}
      {loading && (
        <View style={{ padding: 40, alignItems: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#00d4ff" />
          <Text style={{ color: "#475569", fontSize: 13 }}>Memuat tutorial...</Text>
        </View>
      )}

      {/* ── Empty state ── */}
      {!loading && steps.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>📚</Text>
          <Text style={styles.emptyText}>Tutorial belum tersedia</Text>
          <Text style={styles.emptySub}>Cek kembali nanti</Text>
        </View>
      )}

      {/* ── Accordion Steps ── */}
      {!loading && steps.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          {steps.map((step, idx) => {
            const isOpen  = openIdx === idx;
            const accent  = getAccent(idx);
            const parsed  = parseStep(step.content);
            const stepNum = String(idx + 1).padStart(2, "0");

            return (
              <View
                key={step.id}
                style={[
                  styles.stepCard,
                  {
                    borderColor:     isOpen ? hexRgba(accent, 0.5) : "rgba(255,255,255,0.08)",
                    backgroundColor: isOpen ? hexRgba(accent, 0.07) : "rgba(255,255,255,0.03)",
                  },
                ]}
              >
                {/* Header row */}
                <TouchableOpacity
                  onPress={() => toggleStep(idx)}
                  style={styles.stepHeader}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.stepNumBox,
                      {
                        backgroundColor: isOpen ? hexRgba(accent, 0.25) : hexRgba(accent, 0.12),
                        borderColor:     isOpen ? hexRgba(accent, 0.6)  : hexRgba(accent, 0.3),
                      },
                    ]}
                  >
                    <Text style={[styles.stepNum, { color: accent }]}>{stepNum}</Text>
                  </View>

                  <Text
                    style={[styles.stepTitle, { color: isOpen ? accent : "#e2e8f0" }]}
                    numberOfLines={isOpen ? undefined : 1}
                  >
                    {step.title}
                  </Text>

                  <Text style={{ color: isOpen ? accent : "#475569", fontSize: 16, marginLeft: 8 }}>
                    {isOpen ? "▲" : "▼"}
                  </Text>
                </TouchableOpacity>

                {/* Expandable body */}
                {isOpen && (
                  <View style={styles.stepBody}>
                    <Text style={styles.stepDesc}>{parsed.desc}</Text>

                    {parsed.link ? (
                      <TouchableOpacity
                        onPress={() => router.push(routeFromLink(parsed.link) as any)}
                        style={[styles.stepLinkBtn, { borderColor: hexRgba(accent, 0.4) }]}
                      >
                        <Text style={[styles.stepLinkText, { color: accent }]}>
                          {parsed.linkLabel || "Buka"} →
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ── Tips Pro Trader ── */}
      <View style={[styles.tipsCard, { marginHorizontal: 16 }]}>
        <View style={styles.tipsHeader}>
          <Text style={{ fontSize: 18 }}>▶</Text>
          <Text style={styles.tipsTitle}>Tips Pro Trader</Text>
        </View>
        {TIPS.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={styles.tipNumBox}>
              <Text style={styles.tipNum}>{i + 1}</Text>
            </View>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060e1f",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    color: "#e2e8f0",
    fontWeight: "900",
    fontSize: 22,
  },
  headerSub: {
    color: "#475569",
    fontSize: 12,
    marginTop: 4,
  },
  closeBtn: {
    backgroundColor: "#0a1628",
    borderRadius: 20,
    width: 32, height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  emptyState: {
    padding: 48,
    alignItems: "center",
  },
  emptyText: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySub: {
    color: "#334155",
    fontSize: 12,
  },
  stepCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  stepNumBox: {
    width: 36, height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNum: {
    fontWeight: "900",
    fontSize: 13,
  },
  stepTitle: {
    flex: 1,
    fontWeight: "700",
    fontSize: 14,
  },
  stepBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  stepDesc: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 12,
  },
  stepLinkBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  stepLinkText: {
    fontWeight: "700",
    fontSize: 13,
  },
  tipsCard: {
    backgroundColor: "#0a1628",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  tipsTitle: {
    color: AMBER,
    fontWeight: "800",
    fontSize: 15,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  tipNumBox: {
    width: 22, height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(255,199,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,199,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  tipNum: {
    color: AMBER,
    fontSize: 11,
    fontWeight: "800",
  },
  tipText: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
});
