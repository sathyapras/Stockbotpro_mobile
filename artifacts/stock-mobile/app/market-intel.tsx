import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { type BrokerFlowAggregate, fetchBrokerFlowAggregate } from "@/services/brokerFlowService";
import { type RadarMarket, fetchRadarMarket } from "@/services/radarMarketService";

// ─── Phase map ────────────────────────────────────────────────

// Maps actual RADAR_MARKET Phase field values → display
const PHASE_MAP: Record<string, { label: string; color: string }> = {
  "MARKUP PHASE":       { label: "Markup",      color: "#60a5fa" },
  "EARLY MARKUP":       { label: "Markup",      color: "#60a5fa" },
  "ACCUMULATION PHASE": { label: "Akumulasi",   color: "#34d399" },
  "LATE STAGE":         { label: "Late Stage",  color: "#fbbf24" },
  "DISTRIBUTION PHASE": { label: "Distribusi",  color: "#f87171" },
  "CONSOLIDATION":      { label: "Konsolidasi", color: "#94a3b8" },
};

function phaseDisplay(phase: string): { label: string; color: string } {
  const key = (phase ?? "").toUpperCase().trim();
  return PHASE_MAP[key] ?? { label: "Konsolidasi", color: "#94a3b8" };
}

// ─── Compute helpers ──────────────────────────────────────────

function computeMarketPulse(stocks: RadarMarket[]) {
  const total = stocks.length || 1;
  const acc1d = stocks.filter(r => r.signal1d === "Accumulation").length;
  const smAccPct = Math.round((acc1d / total) * 100);
  const avgFlowScore = Math.round(stocks.reduce((s, r) => s + r.bandarScore, 0) / total);
  const smBrokPulse = Math.round(smAccPct * 0.6 + avgFlowScore * 0.4);
  const hybridPulse = Math.round(smBrokPulse * 0.7 + smAccPct * 0.3);

  let label: string, color: string, bg: string, desc: string;
  if (hybridPulse >= 70) {
    label = "BULLISH";  color = "#34d399"; bg = "#052e16";
    desc  = "Kondisi pasar kuat — momentum mendukung";
  } else if (hybridPulse >= 50) {
    label = "NETRAL";   color = "#fbbf24"; bg = "#1c1500";
    desc  = "Pasar campuran — selektif dan hati-hati";
  } else if (hybridPulse >= 35) {
    label = "WASPADA";  color = "#f97316"; bg = "#1c0a00";
    desc  = "Momentum lemah — lebih banyak cash";
  } else {
    label = "BEARISH";  color = "#f87171"; bg = "#2d0a0a";
    desc  = "Kondisi buruk — hindari posisi baru";
  }
  return { hybridPulse, label, color, bg, desc, smAccPct, avgFlowScore, smBrokPulse, total };
}

function buildPhaseDistribution(stocks: RadarMarket[]) {
  const counts: Record<string, number> = {};
  const total = stocks.length;
  for (const s of stocks) {
    const disp = phaseDisplay(s.phase).label;
    counts[disp] = (counts[disp] ?? 0) + 1;
  }
  const maxPct = Math.max(...Object.values(counts).map(c => Math.round((c / total) * 100)), 1);
  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100),
      color: Object.values(PHASE_MAP).find(p => p.label === label)?.color ?? "#94a3b8",
    }))
    .sort((a, b) => b.count - a.count)
    .map(p => ({ ...p, maxPct }));
}

function buildFlowState(stocks: RadarMarket[]) {
  const counts = { "STRONG ACC": 0, "ACC": 0, "NEUTRAL": 0, "DIST": 0, "STRONG DIST": 0 };
  for (const item of stocks) {
    const fs = (item.flowState ?? "").toUpperCase();
    if      (fs.includes("STRONG ACCUMULATION"))  counts["STRONG ACC"]++;
    else if (fs.includes("ACCUMULATION"))          counts["ACC"]++;
    else if (fs.includes("STRONG DISTRIBUTION"))   counts["STRONG DIST"]++;
    else if (fs.includes("DISTRIBUTION"))          counts["DIST"]++;
    else                                            counts["NEUTRAL"]++;
  }
  const total = stocks.length || 1;
  const maxCount = Math.max(...Object.values(counts), 1);
  return [
    { key: "STRONG ACC",  label: "★ Akumulasi",  color: "#10b981" },
    { key: "ACC",         label: "Akumulasi",    color: "#34d399" },
    { key: "NEUTRAL",     label: "Netral",       color: "#64748b" },
    { key: "DIST",        label: "Distribusi",   color: "#f87171" },
    { key: "STRONG DIST", label: "★ Distribusi", color: "#dc2626" },
  ].map(f => ({
    ...f,
    count: counts[f.key as keyof typeof counts],
    pct: Math.round((counts[f.key as keyof typeof counts] / total) * 100),
    maxCount,
  }));
}

function buildHakaHakiFlow(stocks: RadarMarket[]) {
  let total5d = 0, total10d = 0;
  for (const r of stocks) {
    total5d  += r.nbs5d  ?? 0;
    total10d += r.nbs10d ?? 0;
  }
  const formatT = (bn: number) => {
    const abs = Math.abs(bn);
    const sign = bn >= 0 ? "+" : "-";
    if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}T`;
    return `${sign}${abs.toFixed(0)}B`;
  };
  return {
    nbs5d: total5d,   nbs5dStr:  formatT(total5d),
    nbs10d: total10d, nbs10dStr: formatT(total10d),
    label5d:  total5d  >= 0 ? "Aggressor Buy (Akumulasi)" : "Aggressor Sell (Distribusi)",
    label10d: total10d >= 0 ? "Aggressor Buy (Akumulasi)" : "Aggressor Sell (Distribusi)",
    color5d:  total5d  >= 0 ? "#34d399" : "#f87171",
    color10d: total10d >= 0 ? "#34d399" : "#f87171",
  };
}

// ─── Sub-components ───────────────────────────────────────────

function MarketPulseCard({ stocks }: { stocks: RadarMarket[] }) {
  const pulse = computeMarketPulse(stocks);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>⚡ Market Pulse</Text>
        <Text style={styles.cardSub}>{stocks.length} saham tercover</Text>
      </View>

      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pulse.hybridPulse}%` as any, backgroundColor: pulse.color }]} />
      </View>

      <View style={styles.row}>
        <Text style={styles.bigScore}>
          {pulse.hybridPulse}<Text style={styles.bigScoreSub}>/100</Text>
        </Text>
        <View style={[styles.labelBadge, { backgroundColor: pulse.bg, borderColor: pulse.color }]}>
          <Text style={[styles.labelBadgeText, { color: pulse.color }]}>{pulse.label}</Text>
        </View>
      </View>
      <Text style={styles.descText}>{pulse.desc}</Text>

      <View style={styles.statsRow}>
        {[
          { label: "B/S",             value: `${pulse.smAccPct}%`,        sub: `${pulse.total} saham` },
          { label: "Avg Flow Score", value: `${pulse.avgFlowScore}/100`, sub: "Rata-rata bandar score" },
          { label: "SM Pulse",       value: `${pulse.smBrokPulse}/100`,  sub: "60% Acc + 40% Score" },
        ].map(s => (
          <View key={s.label} style={{ alignItems: "center", flex: 1 }}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={styles.statSub}>{s.sub}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PhaseDistributionCard({ stocks }: { stocks: RadarMarket[] }) {
  const phases = buildPhaseDistribution(stocks);
  const maxPct = phases[0]?.pct ?? 1;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📊 Phase Distribution</Text>
      {phases.map(p => (
        <View key={p.label} style={{ marginBottom: 10 }}>
          <View style={styles.rowBetween}>
            <Text style={[styles.phaseLabel, { color: p.color }]}>{p.label.toUpperCase()}</Text>
            <Text style={styles.phaseStat}>{p.pct}%  ·  {p.count} saham</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, {
              width: `${(p.pct / maxPct) * 100}%` as any,
              backgroundColor: p.color + "cc",
            }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function FlowStateCard({ stocks }: { stocks: RadarMarket[] }) {
  const flows = buildFlowState(stocks);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>👥 Flow State</Text>
      </View>
      <Text style={styles.cardSubtitle}>Primary Truth — Aggressor Power</Text>
      {flows.map(f => (
        <View key={f.key} style={[styles.row, { gap: 8, marginBottom: 8 }]}>
          <Text style={[styles.flowLabel, { color: f.color }]}>{f.label}</Text>
          <View style={styles.barBg2}>
            <View style={[styles.barFill, {
              width: `${(f.count / f.maxCount) * 100}%` as any,
              backgroundColor: f.color,
            }]} />
          </View>
          <Text style={styles.flowStat}>{f.count} ({f.pct}%)</Text>
        </View>
      ))}
    </View>
  );
}

// ─── NEW: Broker Net Flow Card ─────────────────────────────────

function BrokerNetFlowCard({ data }: { data: BrokerFlowAggregate | undefined }) {
  if (!data) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💰 Broker Net Flow</Text>
        <Text style={[styles.descText, { marginTop: 8 }]}>Data tidak tersedia</Text>
      </View>
    );
  }

  const isInflow = data.netDir === "INFLOW";
  const netColor   = isInflow ? "#34d399" : "#f87171";
  const netBg      = isInflow ? "#052e16" : "#2d0a0a";
  const netVerdict = isInflow
    ? "Uang institusi NET MASUK ke pasar"
    : "Uang institusi NET KELUAR dari pasar";

  const accPct  = data.accPct;
  const distPct = data.distPct;
  const maxBar  = Math.max(accPct, distPct, 1);

  const bbPct = data.brokerBuyDominance;
  const bsPct = 100 - bbPct;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>💰 Broker Net Flow</Text>
        <Text style={styles.cardSub}>{data.total} saham · Real money</Text>
      </View>
      <Text style={styles.cardSubtitle}>Transaksi nyata antar broker — tanpa identitas broker</Text>

      {/* Total net value */}
      <View style={[styles.netFlowBox, { backgroundColor: netBg, borderColor: netColor + "55" }]}>
        <Text style={[styles.netFlowValue, { color: netColor }]}>{data.netStr}</Text>
        <View style={[styles.netDirBadge, { backgroundColor: netColor + "22", borderColor: netColor }]}>
          <Text style={[styles.netDirText, { color: netColor }]}>
            {isInflow ? "▲ INFLOW" : "▼ OUTFLOW"}
          </Text>
        </View>
        <Text style={[styles.netVerdict, { color: netColor + "cc" }]}>{netVerdict}</Text>
      </View>

      {/* Acc vs Dist bar */}
      <Text style={styles.sectionMini}>Distribusi Saham</Text>
      <View style={{ gap: 8, marginBottom: 12 }}>
        {[
          { label: "Akumulasi", count: data.accCount,  pct: accPct,  color: "#34d399" },
          { label: "Distribusi", count: data.distCount, pct: distPct, color: "#f87171" },
        ].map(item => (
          <View key={item.label}>
            <View style={styles.rowBetween}>
              <Text style={[styles.phaseLabel, { color: item.color }]}>{item.label.toUpperCase()}</Text>
              <Text style={styles.phaseStat}>{item.pct}%  ·  {item.count} saham</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, {
                width: `${(item.pct / maxBar) * 100}%` as any,
                backgroundColor: item.color + "cc",
              }]} />
            </View>
          </View>
        ))}
      </View>

      {/* Broker count stats */}
      <Text style={styles.sectionMini}>Jumlah Broker Aktif</Text>
      <View style={styles.statsRow}>
        {[
          { label: "Beli",     value: data.totalBuyBrokers.toLocaleString(),  sub: `${bbPct}% dominan`,  color: "#34d399" },
          { label: "Jual",     value: data.totalSellBrokers.toLocaleString(), sub: `${bsPct}% dominan`,  color: "#f87171" },
          { label: "Inflow ↑", value: `${data.inflowCount}`,                  sub: "saham net beli",     color: "#60a5fa" },
        ].map(s => (
          <View key={s.label} style={{ alignItems: "center", flex: 1 }}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={styles.statSub}>{s.sub}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Haka/Haki Flow Card (renamed from SmartMoneyFlowCard) ────

function HakaHakiFlowCard({ stocks }: { stocks: RadarMarket[] }) {
  const flow = buildHakaHakiFlow(stocks);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>🎯 Aggressor Flow</Text>
        <Text style={styles.cardSub}>Buy/Sell Aggression</Text>
      </View>
      <Text style={styles.cardSubtitle}>
        Aksi beli atau jual yang agresif dengan langsung menyapu antrean
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[
          { label: "Net Aggressor 5D",  value: flow.nbs5dStr,  sub: flow.label5d,  color: flow.color5d  },
          { label: "Net Aggressor 10D", value: flow.nbs10dStr, sub: flow.label10d, color: flow.color10d },
        ].map(item => (
          <View key={item.label} style={[styles.flowBox]}>
            <Text style={styles.flowBoxLabel}>{item.label}</Text>
            <Text style={[styles.flowBoxValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[styles.flowBoxSub, { color: item.color + "99" }]}>{item.sub}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Signal Synthesis Card ────────────────────────────────────

type SynthScenario =
  | "BULLISH_CONFIRM"
  | "BEARISH_CONFIRM"
  | "HIDDEN_DIST"
  | "BUYER_TRAP";

function computeSynthesis(
  brokerFlow: BrokerFlowAggregate | undefined,
  stocks: RadarMarket[],
): {
  scenario: SynthScenario;
  title: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  headline: string;
  explanation: string;
  action: string;
  brokerLabel: string;
  brokerColor: string;
  hakaLabel: string;
  hakaColor: string;
  confidence: "TINGGI" | "SEDANG";
} | null {
  if (!brokerFlow) return null;

  const nbs5d = stocks.reduce((s, r) => s + (r.nbs5d ?? 0), 0);
  const brokerBullish = brokerFlow.netDir === "INFLOW";
  const hakaBullish   = nbs5d >= 0;

  let scenario: SynthScenario;
  if (brokerBullish && hakaBullish)   scenario = "BULLISH_CONFIRM";
  else if (!brokerBullish && !hakaBullish) scenario = "BEARISH_CONFIRM";
  else if (brokerBullish && !hakaBullish) scenario = "HIDDEN_DIST";
  else scenario = "BUYER_TRAP";

  const brokerLabel = brokerBullish ? `↑ ${brokerFlow.netStr} INFLOW` : `↓ ${brokerFlow.netStr} OUTFLOW`;
  const brokerColor = brokerBullish ? "#34d399" : "#f87171";

  const absNbs = Math.abs(nbs5d);
  const nbsStr = absNbs >= 1000 ? `${(absNbs / 1000).toFixed(1)}T` : `${absNbs.toFixed(0)}B`;
  const hakaLabel = hakaBullish ? `↑ +${nbsStr} Haka` : `↓ -${nbsStr} Haki`;
  const hakaColor = hakaBullish ? "#34d399" : "#f87171";

  switch (scenario) {
    case "BULLISH_CONFIRM":
      return {
        scenario, emoji: "✅", color: "#34d399", bg: "#052e16", border: "#16a34a",
        title: "KONFIRMASI BULLISH",
        headline: "Kedua sinyal sepakat: uang masuk & agresif beli",
        explanation:
          "Broker (institusi) net beli & pasar aktif Haka. Tekanan beli genuine — bukan jebakan. Momentum mendukung posisi long.",
        action: "Boleh masuk dengan stop loss ketat. Favorit setup untuk swing.",
        confidence: "TINGGI",
        brokerLabel, brokerColor, hakaLabel, hakaColor,
      };
    case "BEARISH_CONFIRM":
      return {
        scenario, emoji: "🔴", color: "#f87171", bg: "#2d0a0a", border: "#dc2626",
        title: "KONFIRMASI BEARISH",
        headline: "Kedua sinyal sepakat: uang keluar & tekanan jual dominan",
        explanation:
          "Broker net jual & pasar aktif Haki. Distribusi aktif berlangsung. Tidak ada support dari institusi.",
        action: "Hindari posisi baru. Kalau pegang saham, evaluasi cut loss.",
        confidence: "TINGGI",
        brokerLabel, brokerColor, hakaLabel, hakaColor,
      };
    case "HIDDEN_DIST":
      return {
        scenario, emoji: "⚠️", color: "#f97316", bg: "#1c0a00", border: "#ea580c",
        title: "DISTRIBUSI TERSEMBUNYI",
        headline: "Broker net beli tapi pasar aktif Haki — waspadai jebakan",
        explanation:
          "Institusi sudah akumulasi (net beli secara nilai), namun saat ini pasar aktif Haki — artinya ada tekanan jual agresif. Bisa jadi institusi sedang unload ke retail, atau distribusi tahap awal.",
        action: "Jangan FOMO ikut beli. Tunggu konfirmasi arah sebelum masuk.",
        confidence: "SEDANG",
        brokerLabel, brokerColor, hakaLabel, hakaColor,
      };
    case "BUYER_TRAP":
      return {
        scenario, emoji: "⚠️", color: "#fbbf24", bg: "#1c1500", border: "#d97706",
        title: "BUYER TRAP",
        headline: "Retail aktif Haka tapi institusi sudah net jual",
        explanation:
          "Pasar sedang agresif beli (Haka), tapi broker (institusi) sudah net outflow. Institusi sedang keluar sementara retail masuk. Ini sinyal bahaya klasik distribusi.",
        action: "Hati-hati. Momentum naik sementara bisa menjebak. Tight stop loss.",
        confidence: "SEDANG",
        brokerLabel, brokerColor, hakaLabel, hakaColor,
      };
  }
}

function SignalSynthesisCard({
  brokerFlow,
  stocks,
}: {
  brokerFlow: BrokerFlowAggregate | undefined;
  stocks: RadarMarket[];
}) {
  const syn = computeSynthesis(brokerFlow, stocks);
  if (!syn) return null;

  return (
    <View style={[styles.card, { borderWidth: 1.5, borderColor: syn.border }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>🔀 Signal Synthesis</Text>
        <View style={[styles.confBadge, {
          backgroundColor: syn.confidence === "TINGGI" ? "#052e16" : "#1c1500",
          borderColor: syn.confidence === "TINGGI" ? "#16a34a" : "#d97706",
        }]}>
          <Text style={[styles.confText, {
            color: syn.confidence === "TINGGI" ? "#34d399" : "#fbbf24",
          }]}>
            {syn.confidence === "TINGGI" ? "🟢 KONFIRMASI KUAT" : "🟡 DIVERGING SIGNAL"}
          </Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>Broker Net Flow × Aggressor Flow — Combined Intelligence</Text>

      {/* Scenario verdict box */}
      <View style={[styles.verdictBox, { backgroundColor: syn.bg, borderColor: syn.border }]}>
        <Text style={styles.verdictEmoji}>{syn.emoji}</Text>
        <Text style={[styles.verdictTitle, { color: syn.color }]}>{syn.title}</Text>
        <Text style={[styles.verdictHeadline, { color: syn.color + "cc" }]}>{syn.headline}</Text>
      </View>

      {/* Two signal pills */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <View style={[styles.signalPill, { borderColor: syn.brokerColor + "55", backgroundColor: syn.brokerColor + "11" }]}>
          <Text style={styles.signalPillLabel}>💰 Broker Flow</Text>
          <Text style={[styles.signalPillValue, { color: syn.brokerColor }]}>{syn.brokerLabel}</Text>
        </View>
        <View style={[styles.signalPill, { borderColor: syn.hakaColor + "55", backgroundColor: syn.hakaColor + "11" }]}>
          <Text style={styles.signalPillLabel}>🎯 Aggressor 5D</Text>
          <Text style={[styles.signalPillValue, { color: syn.hakaColor }]}>{syn.hakaLabel}</Text>
        </View>
      </View>

      {/* Explanation */}
      <View style={styles.explainBox}>
        <Text style={styles.explainTitle}>📖 Interpretasi</Text>
        <Text style={styles.explainText}>{syn.explanation}</Text>
      </View>

      {/* Action */}
      <View style={[styles.actionBox, { borderLeftColor: syn.color }]}>
        <Text style={styles.actionLabel}>💡 Saran Tindakan</Text>
        <Text style={styles.actionText}>{syn.action}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────

export default function MarketIntelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: radarAll = [], isLoading: radarLoading } = useQuery({
    queryKey: ["radar-market"],
    queryFn: fetchRadarMarket,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const { data: brokerFlow, isLoading: brokerLoading } = useQuery({
    queryKey: ["broker-flow-aggregate"],
    queryFn: fetchBrokerFlowAggregate,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const stocks = useMemo(
    () => radarAll.filter(r => !r.ticker.startsWith("IDX") && r.ticker !== "COMPOSITE"),
    [radarAll]
  );

  const isLoading = radarLoading || brokerLoading;

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#0f1629" }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: "#60a5fa", fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Market Intelligence</Text>
          <Text style={styles.pageDate}>{today}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={{ color: "#64748b", fontSize: 13 }}>Memuat data pasar...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}>
          <MarketPulseCard stocks={stocks} />
          <PhaseDistributionCard stocks={stocks} />
          <FlowStateCard stocks={stocks} />
          <BrokerNetFlowCard data={brokerFlow} />
          <HakaHakiFlowCard stocks={stocks} />
          <SignalSynthesisCard brokerFlow={brokerFlow} stocks={stocks} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: "#0f1629",
    borderBottomWidth: 1, borderBottomColor: "#1e2433",
  },
  backBtn: { padding: 4, marginRight: 4 },
  pageTitle: { color: "#fff", fontWeight: "900", fontSize: 20 },
  pageDate: { color: "#475569", fontSize: 11, marginTop: 1 },

  card: {
    backgroundColor: "#1e2433", borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cardSub: { color: "#475569", fontSize: 11 },
  cardSubtitle: { color: "#475569", fontSize: 10, marginBottom: 14, marginTop: -8 },
  sectionMini: { color: "#475569", fontSize: 10, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },

  progressBg: { height: 10, backgroundColor: "#0f1629", borderRadius: 5, marginBottom: 8 },
  progressFill: { height: 10, borderRadius: 5 },

  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },

  bigScore: { color: "#fff", fontWeight: "900", fontSize: 28, flex: 1 },
  bigScoreSub: { color: "#475569", fontSize: 14, fontWeight: "400" },
  labelBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  labelBadgeText: { fontWeight: "700", fontSize: 13 },
  descText: { color: "#94a3b8", fontSize: 11, marginBottom: 12, marginTop: 4 },

  statsRow: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: "#0f1629", borderRadius: 8, padding: 10,
  },
  statValue: { color: "#fff", fontWeight: "700", fontSize: 14 },
  statLabel: { color: "#475569", fontSize: 9, textAlign: "center", marginTop: 2 },
  statSub:   { color: "#334155", fontSize: 8, textAlign: "center" },

  phaseLabel: { fontSize: 11, fontWeight: "700", width: 110 },
  phaseStat:  { color: "#64748b", fontSize: 11 },
  barBg:  { height: 8, backgroundColor: "#0f1629", borderRadius: 4, overflow: "hidden" },
  barBg2: { flex: 1, height: 8, backgroundColor: "#0f1629", borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },

  flowLabel: { fontSize: 10, width: 88, textAlign: "right" },
  flowStat:  { color: "#64748b", fontSize: 10, width: 56, textAlign: "right" },

  flowBox: { flex: 1, backgroundColor: "#0f1629", borderRadius: 10, padding: 12 },
  flowBoxLabel: { color: "#64748b", fontSize: 10, marginBottom: 4 },
  flowBoxValue: { fontWeight: "900", fontSize: 22 },
  flowBoxSub:   { fontSize: 10, marginTop: 2 },

  // Signal Synthesis
  confBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  confText: { fontSize: 9, fontWeight: "700" },
  verdictBox: {
    borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, alignItems: "center",
  },
  verdictEmoji: { fontSize: 28, marginBottom: 4 },
  verdictTitle: { fontWeight: "900", fontSize: 16, letterSpacing: 0.5, marginBottom: 4 },
  verdictHeadline: { fontSize: 11, textAlign: "center" },
  signalPill: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    padding: 10, alignItems: "center",
  },
  signalPillLabel: { color: "#64748b", fontSize: 9, marginBottom: 4, fontWeight: "600" },
  signalPillValue: { fontSize: 13, fontWeight: "800" },
  explainBox: {
    backgroundColor: "#0f1629", borderRadius: 10, padding: 12, marginBottom: 10,
  },
  explainTitle: { color: "#64748b", fontSize: 10, fontWeight: "700", marginBottom: 6 },
  explainText: { color: "#94a3b8", fontSize: 12, lineHeight: 18 },
  actionBox: {
    backgroundColor: "#0f1629", borderRadius: 10, padding: 12,
    borderLeftWidth: 3,
  },
  actionLabel: { color: "#64748b", fontSize: 10, fontWeight: "700", marginBottom: 4 },
  actionText: { color: "#cbd5e1", fontSize: 12, lineHeight: 17 },

  // Broker Net Flow specific
  netFlowBox: {
    borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1, alignItems: "center",
  },
  netFlowValue: { fontWeight: "900", fontSize: 32, letterSpacing: 1 },
  netDirBadge: {
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, marginTop: 6, marginBottom: 6,
  },
  netDirText: { fontWeight: "700", fontSize: 12 },
  netVerdict: { fontSize: 11, textAlign: "center" },
});
