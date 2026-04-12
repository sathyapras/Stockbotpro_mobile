import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

// ─── Icon map: IconName → emoji ───────────────────────────────

const ICON_EMOJI: Record<string, string> = {
  TrendingUp: "📈",
  Zap:        "⚡",
  Shield:     "🛡️",
  Globe:      "🌐",
  Users:      "👥",
  BarChart2:  "📊",
  LineChart:  "📉",
  Cpu:        "🖥️",
  Rocket:     "🚀",
  Star:       "⭐",
  Layers:     "🗂️",
  Info:       "ℹ️",
};

// ─── Helpers ──────────────────────────────────────────────────

interface CmsItem {
  id: number;
  title: string;
  content: string;
  isActive: boolean;
  sortOrder: number;
}

interface ParsedFeature {
  iconName: string;
  title: string;
  desc: string;
}

function parseFeature(item: CmsItem): ParsedFeature {
  const parts = item.title.split("|||");
  return {
    iconName: parts.length === 2 ? parts[0] : "TrendingUp",
    title:    parts.length === 2 ? parts[1] : item.title,
    desc:     item.content,
  };
}

function getSection(sections: CmsItem[], keyword: string): CmsItem | undefined {
  return sections.find(
    s => s.isActive && s.title.toLowerCase().includes(keyword.toLowerCase()),
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function AboutUsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const topPad  = Platform.OS === "web" ? 24 : insets.top + 16;

  const [sections, setSections] = useState<CmsItem[]>([]);
  const [features, setFeatures] = useState<ParsedFeature[]>([]);
  const [team,     setTeam]     = useState<CmsItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/cms/content/about`).then(r => r.json()),
      fetch(`${BASE}/api/cms/content/about_features`).then(r => r.json()),
      fetch(`${BASE}/api/cms/content/about_team`).then(r => r.json()),
    ])
      .then(([aboutData, featuresData, teamData]) => {
        setSections(Array.isArray(aboutData) ? aboutData : []);
        setFeatures(
          Array.isArray(featuresData)
            ? featuresData.filter((f: CmsItem) => f.isActive).map(parseFeature)
            : [],
        );
        setTeam(
          Array.isArray(teamData)
            ? teamData.filter((t: CmsItem) => t.isActive)
            : [],
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // ── Back button ─────────────────────────────────────────────
  const BackBtn = () => (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ position: "absolute", top: topPad, right: 16, zIndex: 10,
        backgroundColor: "#0a1628", borderRadius: 20, width: 32, height: 32,
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "#1e293b" }}>
      <Text style={{ color: "#64748b", fontSize: 16, fontWeight: "700" }}>✕</Text>
    </TouchableOpacity>
  );

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <BackBtn />
        <ActivityIndicator size="large" color="#00b4ff" />
        <Text style={{ color: "#475569", fontSize: 13, marginTop: 12 }}>Memuat konten...</Text>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error || sections.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <BackBtn />
        <Text style={{ fontSize: 32, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>
          Gagal memuat konten.{"\n"}Periksa koneksi internet kamu.
        </Text>
      </View>
    );
  }

  const heroDesc   = getSection(sections, "Deskripsi")?.content  ?? "";
  const mission1   = getSection(sections, "Paragraf 1")?.content ?? "";
  const mission2   = getSection(sections, "Paragraf 2")?.content ?? "";
  const disclaimer = getSection(sections, "Disclaimer")?.content ?? "";

  return (
    <ScrollView style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 48, paddingTop: topPad }}>

      <BackBtn />

      {/* ── Hero ── */}
      <View style={styles.hero}>
        <Image
          source={require("../assets/logo-stockbot.png")}
          style={{ width: 72, height: 72, borderRadius: 20, marginBottom: 16 }}
          resizeMode="cover"
        />
        {heroDesc ? (
          <Text style={styles.heroDesc}>{heroDesc}</Text>
        ) : null}
      </View>

      {/* ── Version badge ── */}
      <View style={styles.versionCard}>
        <View>
          <Text style={styles.versionLabel}>VERSI APLIKASI</Text>
          <Text style={styles.versionName}>
            Stockbot Pro{" "}
            <Text style={{ color: "#facc15" }}>v2.0 Beta</Text>
          </Text>
          <Text style={styles.versionSub}>Dirilis: Maret 2026 · IDX/BEI Edition</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.versionLabel}>POWERED BY</Text>
          <Text style={[styles.versionName, { fontSize: 12 }]}>
            Stockbot Data Engine v2.0
          </Text>
          <Text style={styles.versionSub}>Multi-Source Integrated Analysis</Text>
        </View>
      </View>

      {/* ── Misi ── */}
      {(mission1 || mission2) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <View style={styles.card}>
            {mission1 ? <Text style={styles.bodyText}>{mission1}</Text> : null}
            {mission2 ? <Text style={[styles.bodyText, { marginTop: 12 }]}>{mission2}</Text> : null}
          </View>
        </View>
      ) : null}

      {/* ── Key Features ── */}
      {features.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Text style={{ fontSize: 22 }}>
                  {ICON_EMOJI[f.iconName] ?? "📌"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Our Team ── */}
      {team.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Team</Text>
          <View style={styles.teamGrid}>
            {team.map((t, i) => (
              <View key={i} style={styles.teamCard}>
                <View style={styles.teamAvatarWrap}>
                  <Text style={{ fontSize: 18 }}>👤</Text>
                </View>
                <Text style={styles.teamName}>{t.title}</Text>
                <Text style={styles.teamRole}>{t.content}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Disclaimer ── */}
      {disclaimer ? (
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>⚠️ {disclaimer}</Text>
        </View>
      ) : null}

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060e1f",
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#060e1f",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  hero: {
    alignItems: "center",
    padding: 28,
    paddingBottom: 20,
  },
  heroIconWrap: {
    width: 72, height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(0,180,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,180,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#e2e8f0",
    marginBottom: 10,
    textAlign: "center",
  },
  heroDesc: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
  },
  versionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#0a1628",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  versionLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  versionName: {
    color: "#00b4ff",
    fontSize: 15,
    fontWeight: "800",
  },
  versionSub: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#00b4ff",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#0a1628",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  bodyText: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#0a1628",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  featureIconWrap: {
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,180,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureTitle: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  featureDesc: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
  },
  teamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  teamCard: {
    flex: 1,
    minWidth: "28%",
    backgroundColor: "#0a1628",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  teamAvatarWrap: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,180,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,180,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  teamName: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  teamRole: {
    color: "#64748b",
    fontSize: 11,
    textAlign: "center",
    marginTop: 3,
  },
  disclaimerBox: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  disclaimerText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 19,
  },
});
