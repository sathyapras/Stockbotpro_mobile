import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchSettings } from "@/services/settingsService";

// ─── Design tokens ────────────────────────────────────────────

const CYAN  = "#00d4ff";
const GREEN = "#33cc66";
const AMBER = "#f5a623";

// ─── Types ────────────────────────────────────────────────────

interface MitraItem {
  id: string;
  name: string;
  salesCode: string;
  registerUrl: string;
}

const DEFAULT_MITRA: MitraItem = {
  id: "default",
  name: "Korea Investment Sekuritas Indonesia",
  salesCode: "BQ00397",
  registerUrl: "https://registration.kisi.co.id/",
};

// ─── Pilar data ───────────────────────────────────────────────

const PILLARS = [
  {
    number: "01",
    title: "Support Tools Analisa Modern",
    body: "Akses penuh ke platform analisa teknikal berbasis AI yang dirancang khusus untuk pasar IDX.",
    color: CYAN,
    border: "rgba(0,212,255,0.2)",
    bg: "rgba(0,212,255,0.05)",
    icon: "📊",
    points: [
      "Smart Money Flow Scanner (BOW & BOS)",
      "Market Radar real-time IHSG",
      "AI Screener & Sektor Rotation",
      "Robo Advisor berbasis AI",
    ],
  },
  {
    number: "02",
    title: "Ekosistem Komunitas Stockbot",
    body: "Bergabung dengan komunitas investor aktif yang saling berbagi sinyal, insight, dan strategi.",
    color: GREEN,
    border: "rgba(51,204,102,0.2)",
    bg: "rgba(51,204,102,0.05)",
    icon: "👥",
    points: [
      "Notifikasi sinyal BOW & BOS real-time",
      "Live feed pergerakan smart money",
      "Komunitas investor aktif IDX",
      "Grup eksklusif investor Stockbot",
    ],
  },
  {
    number: "03",
    title: "Sesi Sharing Knowledge & Insight",
    body: "Belajar dari analis berpengalaman melalui sesi edukasi rutin dan diskusi langsung.",
    color: AMBER,
    border: "rgba(245,166,35,0.2)",
    bg: "rgba(245,166,35,0.05)",
    icon: "💡",
    points: [
      "Bedah emiten & analisis teknikal",
      "Psikologi trading & manajemen risiko",
      "Update dinamika pasar terkini",
      "Q&A langsung dengan analis berpengalaman",
    ],
  },
];

const STATS = [
  { value: "500+",        label: "Emiten IDX",    color: CYAN  },
  { value: "AI-Powered",  label: "Analisa Pasar", color: GREEN },
  { value: "24/7",        label: "Akses Platform", color: AMBER },
];

// ─── Screen ───────────────────────────────────────────────────

export default function BukaRekeningScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 24 : insets.top + 16;

  const [mitraList, setMitraList] = useState<MitraItem[]>([DEFAULT_MITRA]);
  const [copiedId,  setCopiedId]  = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetchSettings()
      .then(d => {
        if (Array.isArray(d.mitraResmiList) && d.mitraResmiList.length > 0) {
          setMitraList(d.mitraResmiList);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function copyCode(id: string, code: string) {
    if (Platform.OS === "web") {
      try { (navigator as any).clipboard.writeText(code); } catch {}
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function openRegister(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  const multiMitra = mitraList.length > 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={styles.headerTitle}>📈 Buka Rekening Saham</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
        >
          <Text style={{ color: "#64748b", fontSize: 16, fontWeight: "700" }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Hero Banner ── */}
      <View style={styles.heroBanner}>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Powered by Stockbot Pro</Text>
        </View>

        <Text style={styles.heroTitle}>
          Mulai Langkah Investasi Anda dengan Dukungan{" "}
          <Text style={{ color: CYAN }}>Teknologi</Text>
          {" & "}
          <Text style={{ color: GREEN }}>Komunitas</Text>
          {" "}Terdepan
        </Text>

        <Text style={styles.heroDesc}>
          Ingin terjun ke pasar modal namun bingung menentukan langkah pertama?
          Jangan hanya sekadar membuka akun. Di sini, kami memberikan Anda ekosistem
          trading yang lengkap untuk menavigasi pasar dengan lebih percaya diri.
        </Text>

        <View style={styles.tagRow}>
          {["IDX Teregulasi", "OJK Terdaftar", "Sinyal AI"].map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={{ color: GREEN, fontSize: 10, marginRight: 4 }}>✓</Text>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Tiga Pilar ── */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <Text style={styles.sectionTitle}>Tiga Pilar Ekosistem</Text>
        {PILLARS.map(p => (
          <View key={p.number} style={[styles.pillarCard,
            { borderColor: p.border, backgroundColor: p.bg }]}>
            <View style={styles.pillarHeader}>
              <View style={[styles.pillarIconWrap,
                { backgroundColor: p.color + "20", borderColor: p.color + "40" }]}>
                <Text style={{ fontSize: 20 }}>{p.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pillarNumber, { color: p.color }]}>{p.number}</Text>
                <Text style={styles.pillarTitle}>{p.title}</Text>
              </View>
            </View>
            <Text style={styles.pillarBody}>{p.body}</Text>
            {p.points.map(pt => (
              <View key={pt} style={styles.pointRow}>
                <Text style={{ color: p.color, fontSize: 11, marginRight: 6 }}>›</Text>
                <Text style={styles.pointText}>{pt}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* ── Quote Banner ── */}
      <View style={styles.quoteBanner}>
        <Text style={styles.quoteText}>
          "Jadilah bagian dari komunitas investor modern yang memanfaatkan teknologi
          untuk mengambil keputusan lebih cerdas di pasar IDX."
        </Text>
      </View>

      {/* ── Mitra Cards ── */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        {multiMitra && (
          <Text style={styles.sectionTitle}>Pilih Mitra Sekuritas</Text>
        )}

        {loading ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <ActivityIndicator color={CYAN} />
          </View>
        ) : (
          mitraList.map((mitra, idx) => (
            <View key={mitra.id} style={styles.mitraCard}>
              <View style={styles.mitraHeader}>
                <View style={{ flex: 1 }}>
                  {multiMitra && (
                    <Text style={styles.mitraPilihan}>PILIHAN {idx + 1}</Text>
                  )}
                  <Text style={styles.mitraLabel}>Mitra Resmi</Text>
                  <Text style={styles.mitraName}>{mitra.name}</Text>
                </View>

                {mitra.salesCode ? (
                  <TouchableOpacity
                    onPress={() => copyCode(mitra.id, mitra.salesCode)}
                    style={styles.salesCodeBox}
                  >
                    <Text style={styles.salesCodeLabel}>Kode Sales</Text>
                    <View style={styles.salesCodeRow}>
                      <Text style={styles.salesCodeValue}>{mitra.salesCode}</Text>
                      <Text style={{ fontSize: 12, marginLeft: 4 }}>
                        {copiedId === mitra.id ? "✓" : "📋"}
                      </Text>
                    </View>
                    <Text style={[styles.salesCodeHint,
                      copiedId === mitra.id ? { color: GREEN } : {}]}>
                      {copiedId === mitra.id ? "Tersalin!" : "Ketuk untuk salin"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.mitraBody}>
                <Text style={styles.mitraBodyTitle}>Siap Memulai?</Text>
                <Text style={styles.mitraBodyDesc}>
                  Klik tombol di bawah untuk membuka rekening saham dan dapatkan
                  akses penuh ke ekosistem Stockbot Pro.
                  {mitra.salesCode
                    ? ` Pastikan gunakan kode sales ${mitra.salesCode} saat pendaftaran.`
                    : ""}
                </Text>

                <TouchableOpacity
                  onPress={() => openRegister(mitra.registerUrl)}
                  style={styles.ctaButton}
                >
                  <Text style={{ fontSize: 16 }}>📈</Text>
                  <Text style={styles.ctaText}>Buka Rekening & Akses Fitur Sekarang</Text>
                  <Text style={{ color: "#fff", fontSize: 13 }}>↗</Text>
                </TouchableOpacity>

                <Text style={styles.ctaFootnote}>
                  Proses cepat · 100% online · Diawasi OJK
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Stats Strip ── */}
      <View style={styles.statsRow}>
        {STATS.map(s => (
          <View key={s.label} style={styles.statItem}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
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
    paddingBottom: 12,
  },
  headerTitle: {
    color: "#e2e8f0",
    fontWeight: "900",
    fontSize: 20,
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
  heroBanner: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: "#0a1628",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,212,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
  },
  badgeDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: CYAN,
    marginRight: 6,
  },
  badgeText: {
    color: CYAN,
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    color: "#e2e8f0",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 28,
    marginBottom: 12,
  },
  heroDesc: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 16,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(51,204,102,0.08)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(51,204,102,0.2)",
  },
  tagText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "600",
  },
  sectionTitle: {
    color: CYAN,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  pillarCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  pillarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  pillarIconWrap: {
    width: 44, height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  pillarNumber: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  pillarTitle: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "700",
  },
  pillarBody: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  pointText: {
    color: "#94a3b8",
    fontSize: 12,
    flex: 1,
  },
  quoteBanner: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: "rgba(0,212,255,0.04)",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.12)",
    borderLeftWidth: 3,
    borderLeftColor: CYAN,
  },
  quoteText: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 22,
    fontStyle: "italic",
  },
  mitraCard: {
    backgroundColor: "#0a1628",
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  mitraHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  mitraPilihan: {
    color: CYAN,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  mitraLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  mitraName: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "800",
  },
  salesCodeBox: {
    backgroundColor: "rgba(51,204,102,0.08)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(51,204,102,0.2)",
    alignItems: "center",
    minWidth: 90,
  },
  salesCodeLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  salesCodeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  salesCodeValue: {
    color: GREEN,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  salesCodeHint: {
    color: "#475569",
    fontSize: 9,
    marginTop: 4,
  },
  mitraBody: {
    padding: 16,
    paddingTop: 0,
  },
  mitraBodyTitle: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  mitraBodyDesc: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 14,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: CYAN,
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 8,
  },
  ctaText: {
    color: "#060e1f",
    fontWeight: "800",
    fontSize: 13,
    flex: 1,
    textAlign: "center",
  },
  ctaFootnote: {
    color: "#475569",
    fontSize: 11,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  statItem: {
    flex: 1,
    backgroundColor: "#0a1628",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  statLabel: {
    color: "#475569",
    fontSize: 10,
    textAlign: "center",
  },
});
