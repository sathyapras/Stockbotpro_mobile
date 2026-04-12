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

const AMBER = "hsl(45, 100%, 55%)";

const STEP_ACCENTS = [
  "hsl(189, 100%, 50%)", // Cyan
  "hsl(45, 100%, 55%)",  // Amber
  "hsl(189, 100%, 50%)", // Cyan
  "hsl(280, 100%, 70%)", // Purple
  "hsl(142, 55%, 48%)",  // Green
  "hsl(120, 60%, 50%)",  // Lime
  "hsl(350, 70%, 60%)",  // Rose
];

function getAccent(idx: number) {
  return STEP_ACCENTS[idx % STEP_ACCENTS.length];
}

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
          <Text style={styles.headerSub}>Panduan langkah demi langkah</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={{ color: "#64748b", fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
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
                    borderColor: isOpen ? accent + "80" : "rgba(255,255,255,0.08)",
                    backgroundColor: isOpen ? accent + "12" : "rgba(255,255,255,0.03)",
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
                        backgroundColor: isOpen ? accent + "40" : accent + "18",
                        borderColor:     isOpen ? accent + "90" : accent + "45",
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
                        style={[styles.stepLinkBtn, { borderColor: accent + "60" }]}
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
