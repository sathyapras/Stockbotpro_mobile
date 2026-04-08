import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  type MasterStock,
  type SortKey,
  type StockFilter,
  calcBreadth,
  fetchMasterStock,
  filterStocks,
  fmtValueBn,
  getIndexBadges,
  getTopGainersList,
  getTopLosersList,
  sortStocks,
} from "@/services/masterStockService";
import {
  type RadarMarket,
  fetchRadarMarket,
} from "@/services/radarMarketService";

// ─── Greeting ─────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Good Morning 👋";
  if (h < 15) return "Good Afternoon 👋";
  return "Good Evening 👋";
}

// ─── Phase derivation ─────────────────────────────────────────

function derivePhaseLabel(item: RadarMarket): string {
  const fs = (item.flowState ?? "").toUpperCase();
  if (fs.includes("STRONG ACCUMULATION") && item.bandarScore >= 65) return "IGNITION";
  if (fs.includes("STRONG ACCUMULATION")) return "EARLY_ACC";
  if (fs.includes("ACCUMULATION") && item.trendScore >= 60) return "STRONG_TREND";
  if (fs.includes("ACCUMULATION")) return "EARLY_ACC";
  if (fs.includes("STRONG DISTRIBUTION")) return "DISTRIBUTION";
  if (fs.includes("DISTRIBUTION")) return "EXHAUSTION";
  return "CHURNING";
}

const PHASE_BADGE: Record<string, { label: string; color: string }> = {
  IGNITION:     { label: "ACC",   color: "#16a34a" },
  EARLY_ACC:    { label: "ACC",   color: "#16a34a" },
  STRONG_TREND: { label: "TREND", color: "#0ea5e9" },
  EXHAUSTION:   { label: "LATE",  color: "#f97316" },
  DISTRIBUTION: { label: "DIST",  color: "#dc2626" },
  CHURNING:     { label: "NEU",   color: "#475569" },
};

const PHASE_DISPLAY: Record<string, string> = {
  IGNITION:     "Akumulasi Kuat",
  EARLY_ACC:    "Akumulasi",
  CHURNING:     "Netral",
  STRONG_TREND: "Akumulasi Kuat",
  EXHAUSTION:   "Distribusi",
  DISTRIBUTION: "Distribusi Kuat",
};

const PHASE_COLORS: Record<string, string> = {
  "Akumulasi Kuat": "#10b981",
  "Akumulasi":      "#34d399",
  "Netral":         "#fbbf24",
  "Distribusi":     "#f87171",
  "Distribusi Kuat":"#dc2626",
};

// ─── [1] Home Header ──────────────────────────────────────────

const INDICES = [
  { key: "COMPOSITE", label: "IDX COMPOSITE", fullWidth: true },
  { key: "IDXLQ45",   label: "IDX LQ45",       fullWidth: false },
  { key: "IDXJII",    label: "JSX ISLAMIC INDEX", fullWidth: false },
  { key: "IDX30",     label: "IDX30",           fullWidth: false },
] as const;

function HomeHeader({ stocks, radar }: { stocks: MasterStock[]; radar: RadarMarket[] }) {
  const breadth = useMemo(() => calcBreadth(stocks), [stocks]);
  const stockMap = useMemo(() => new Map(stocks.map(s => [s.symbol, s])), [stocks]);
  const radarMap = useMemo(() => new Map(radar.map(r => [r.ticker, r])), [radar]);

  const ihsgMs = stockMap.get("COMPOSITE");
  const ihsgRd = radarMap.get("COMPOSITE");
  const ihsgClose = ihsgMs?.close || ihsgRd?.close || 0;
  const ihsgChg   = ihsgMs?.changePercent || ihsgRd?.chgPct || 0;
  const isDown = ihsgChg < 0;
  const chgColor = isDown ? "#f87171" : "#34d399";

  const total   = breadth.total || 1;
  const advPct  = (breadth.advancers / total) * 100;
  const decPct  = (breadth.decliners / total) * 100;
  const neuPct  = Math.max(0, 100 - advPct - decPct);

  // Separate full-width from half-width index cards
  const availableIndices = useMemo(() =>
    INDICES.map(idx => {
      const ms = stockMap.get(idx.key);
      const rd = radarMap.get(idx.key);
      const val = ms?.close || rd?.close || 0;
      const chg = ms?.changePercent || rd?.chgPct || 0;
      if (val === 0) return null;
      return { ...idx, val, chg };
    }).filter(Boolean) as Array<typeof INDICES[number] & { val: number; chg: number }>,
  [stockMap, radarMap]);

  const fullWidthCards = availableIndices.filter(i => i.fullWidth);
  const halfWidthCards = availableIndices.filter(i => !i.fullWidth);

  return (
    <View style={{ backgroundColor: "#0f1629", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
      {/* Row 1: Greeting + LIVE */}
      <View style={{ flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", marginBottom: 10 }}>
        <Text style={{ color: "#94a3b8", fontSize: 14 }}>{getGreeting()}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6,
          backgroundColor: "#052e16", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#34d399" }} />
          <Text style={{ color: "#34d399", fontSize: 11, fontWeight: "700" }}>LIVE</Text>
        </View>
      </View>

      {/* Row 2: IHSG Big */}
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>IHSG</Text>
        {ihsgClose > 0 ? (
          <>
            <Text style={{ color: chgColor, fontWeight: "900", fontSize: 32 }}>
              {ihsgClose.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
            </Text>
            <Text style={{ color: chgColor, fontWeight: "700", fontSize: 16 }}>
              {isDown ? "" : "+"}{ihsgChg.toFixed(2)}%
            </Text>
          </>
        ) : (
          <Text style={{ color: "#475569", fontSize: 18 }}>Memuat…</Text>
        )}
      </View>

      {/* Breadth Bar */}
      {breadth.total > 0 && (
        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: "row", height: 5, borderRadius: 3, overflow: "hidden" }}>
            <View style={{ width: `${advPct}%` as any, backgroundColor: "#34d399" }} />
            <View style={{ width: `${neuPct}%` as any, backgroundColor: "#475569" }} />
            <View style={{ width: `${decPct}%` as any, backgroundColor: "#f87171" }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 3 }}>
            <Text style={{ color: "#34d399", fontSize: 9 }}>{breadth.advancers} naik</Text>
            <Text style={{ color: "#64748b", fontSize: 9 }}>{breadth.total} saham</Text>
            <Text style={{ color: "#f87171", fontSize: 9 }}>{breadth.decliners} turun</Text>
          </View>
        </View>
      )}

      {/* Index Cards */}
      <View style={{ gap: 8 }}>
        {/* Full-width cards (COMPOSITE) */}
        {fullWidthCards.map(idx => {
          const up = idx.chg >= 0;
          const col = up ? "#34d399" : "#f87171";
          return (
            <View key={idx.key} style={{
              backgroundColor: "#1e2433", borderRadius: 12, padding: 12,
            }}>
              <Text style={{ color: "#64748b", fontSize: 9, marginBottom: 2 }}>{idx.label}</Text>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>
                {idx.val.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
              </Text>
              <Text style={{ color: col, fontSize: 12, fontWeight: "600" }}>
                {up ? "+" : ""}{idx.chg.toFixed(2)}%
              </Text>
            </View>
          );
        })}
        {/* Half-width cards (LQ45, JII, IDX30) — 2 per row */}
        {halfWidthCards.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {halfWidthCards.map(idx => {
              const up = idx.chg >= 0;
              const col = up ? "#34d399" : "#f87171";
              return (
                <View key={idx.key} style={{
                  flex: 1, minWidth: "45%",
                  backgroundColor: "#1e2433", borderRadius: 12, padding: 12,
                }}>
                  <Text style={{ color: "#64748b", fontSize: 9, marginBottom: 2 }}>{idx.label}</Text>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                    {idx.val.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                  </Text>
                  <Text style={{ color: col, fontSize: 11, fontWeight: "600" }}>
                    {up ? "+" : ""}{idx.chg.toFixed(2)}%
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── [2] Trending Tools ───────────────────────────────────────

const TRENDING_TOOLS = [
  { icon: "📊", label: "Flow",       sublabel: "Buy/Sell",     color: "#a78bfa", bg: "#1e1433", border: "#7c3aed40", path: "/(tabs)/bandar" },
  { icon: "💎", label: "Smart",      sublabel: "Broker Data",  color: "#10b981", bg: "#052e16", border: "#10b98140", path: "/(tabs)/smartmoney" },
  { icon: "📡", label: "Radar",      sublabel: "Market Intel", color: "#34d399", bg: "#0d2618", border: "#16a34a40", path: "/market-intel" },
  { icon: "🎯", label: "Stockpick",  sublabel: "BOW & BOS",    color: "#fbbf24", bg: "#1c1500", border: "#d9770640", path: "/(tabs)/stockpick" },
  { icon: "🔽", label: "Screener",   sublabel: "Filter Saham", color: "#60a5fa", bg: "#0c1629", border: "#1d4ed840", path: "/(tabs)/screener" },
  { icon: "🔄", label: "Sektor",     sublabel: "Rotasi",       color: "#fb923c", bg: "#1c0e05", border: "#c2410c40", path: "/sector-rotation" },
  { icon: "🔍", label: "Watchlist",  sublabel: "Pantau",       color: "#94a3b8", bg: "#131d2b", border: "#33415540", path: "/(tabs)/watchlist" },
] as const;

function TrendingToolsSection() {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "700",
        letterSpacing: 1, paddingHorizontal: 16, marginBottom: 8 }}>
        FITUR UTAMA
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {TRENDING_TOOLS.map(tool => (
          <TouchableOpacity key={tool.label}
            onPress={() => router.push(tool.path as any)}
            style={{
              backgroundColor: tool.bg, borderRadius: 14,
              borderWidth: 1, borderColor: tool.border,
              paddingVertical: 12, paddingHorizontal: 14,
              alignItems: "center", minWidth: 76,
            }}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>{tool.icon}</Text>
            <Text style={{ color: tool.color, fontWeight: "700", fontSize: 12 }}>{tool.label}</Text>
            <Text style={{ color: "#475569", fontSize: 9, marginTop: 2 }}>{tool.sublabel}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── [3] Signal Snapshot ──────────────────────────────────────

const SNAPSHOT_TABS = [
  { key: "acc",   icon: "⭐", label: "Top Akumulasi", badgeColor: "#16a34a" },
  { key: "entry", icon: "🚀", label: "Entry Peluang",  badgeColor: "#0ea5e9" },
  { key: "warn",  icon: "⚠️", label: "Peringatan",     badgeColor: "#f97316" },
  { key: "trend", icon: "✅", label: "Strong Trend",   badgeColor: "#a78bfa" },
] as const;

type SnapTab = "acc" | "entry" | "warn" | "trend";

function filterByTab(radar: RadarMarket[], tab: SnapTab): RadarMarket[] {
  const stocks = radar.filter(r => !r.ticker.startsWith("IDX") && r.ticker !== "COMPOSITE")
    .map(r => ({ ...r, _phase: derivePhaseLabel(r) }));
  switch (tab) {
    case "acc":
      return stocks.filter(r => ["IGNITION","EARLY_ACC","STRONG_TREND"].includes(r._phase))
        .sort((a, b) => b.bandarScore - a.bandarScore).slice(0, 5);
    case "entry":
      return stocks.filter(r => r._phase === "IGNITION")
        .sort((a, b) => b.nbs1d - a.nbs1d).slice(0, 5);
    case "warn":
      return stocks.filter(r => ["EXHAUSTION","DISTRIBUTION"].includes(r._phase))
        .sort((a, b) => a.bandarScore - b.bandarScore).slice(0, 5);
    case "trend":
      return stocks.filter(r => r._phase === "STRONG_TREND")
        .sort((a, b) => b.nbs1d - a.nbs1d).slice(0, 5);
    default:
      return [];
  }
}

function SignalSnapshotSection({ radar }: { radar: RadarMarket[] }) {
  const [activeTab, setActiveTab] = useState<SnapTab>("acc");

  const stocksOnly = useMemo(
    () => radar.filter(r => !r.ticker.startsWith("IDX") && r.ticker !== "COMPOSITE"),
    [radar]
  );

  const counts = useMemo(() => {
    const wp = stocksOnly.map(r => ({ ...r, _phase: derivePhaseLabel(r) }));
    return {
      acc:   wp.filter(r => ["IGNITION","EARLY_ACC","STRONG_TREND"].includes(r._phase)).length,
      entry: wp.filter(r => r._phase === "IGNITION").length,
      warn:  wp.filter(r => ["EXHAUSTION","DISTRIBUTION"].includes(r._phase)).length,
      trend: wp.filter(r => r._phase === "STRONG_TREND").length,
    };
  }, [stocksOnly]);

  const list = useMemo(() => filterByTab(radar, activeTab), [radar, activeTab]);
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  return (
    <View style={[styles.card, { marginHorizontal: 16, marginBottom: 12 }]}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 16 }}>🎯</Text>
          <Text style={styles.cardTitle}>Signal Snapshot</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#34d399" }} />
            <Text style={{ color: "#64748b", fontSize: 10 }}>{today}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push("/(tabs)/bandar" as any)}>
          <Text style={{ color: "#f59e0b", fontSize: 12 }}>Lihat Semua →</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {SNAPSHOT_TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                backgroundColor: active ? tab.badgeColor + "25" : "transparent",
                borderWidth: active ? 1 : 0, borderColor: tab.badgeColor,
                marginRight: 8,
              }}>
              <Text style={{ fontSize: 12 }}>{tab.icon}</Text>
              <Text style={{ color: active ? tab.badgeColor : "#64748b",
                fontSize: 11, fontWeight: active ? "700" : "400" }}>
                {tab.label} {counts[tab.key]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List — max 5 items */}
      {list.length === 0 ? (
        <Text style={{ color: "#475569", fontSize: 12, textAlign: "center", paddingVertical: 12 }}>
          Tidak ada saham dalam kategori ini
        </Text>
      ) : (
        list.map((stock, idx) => {
          const phase = (stock as any)._phase ?? derivePhaseLabel(stock);
          const badge = PHASE_BADGE[phase] ?? PHASE_BADGE["CHURNING"];
          const nbsColor = stock.nbs1d >= 0 ? "#34d399" : "#f87171";
          return (
            <TouchableOpacity key={stock.ticker}
              onPress={() => router.push(`/stock/${stock.ticker}` as any)}
              style={{
                flexDirection: "row", alignItems: "center", paddingVertical: 9,
                borderBottomWidth: idx < list.length - 1 ? 1 : 0,
                borderBottomColor: "#1e293b",
              }}>
              <Text style={{ color: "#475569", fontSize: 11, width: 18 }}>{idx + 1}</Text>
              <View style={{ width: 7, height: 7, borderRadius: 3.5,
                backgroundColor: badge.color, marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{stock.ticker}</Text>
                  <View style={{ backgroundColor: badge.color + "25",
                    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ color: badge.color, fontSize: 9, fontWeight: "700" }}>{badge.label}</Text>
                  </View>
                </View>
                <Text style={{ color: "#475569", fontSize: 10 }} numberOfLines={1}>
                  {stock.company || phase}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: nbsColor, fontWeight: "700", fontSize: 13 }}>
                  {stock.nbs1d >= 0 ? "+" : ""}{stock.nbs1d.toFixed(1)}B
                </Text>
                <Text style={{ color: "#64748b", fontSize: 9 }}>NBS 1D</Text>
              </View>
              <View style={{ alignItems: "flex-end", marginLeft: 10, minWidth: 32 }}>
                <Text style={{ color: "#a78bfa", fontWeight: "900", fontSize: 15 }}>
                  {stock.bandarScore.toFixed(0)}
                </Text>
                <Text style={{ color: "#475569", fontSize: 9 }}>score</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

// ─── [4] Phase Distribution ────────────────────────────────────

function buildPhaseStats(radar: RadarMarket[]) {
  const stocks = radar.filter(r => !r.ticker.startsWith("IDX") && r.ticker !== "COMPOSITE");
  const ORDER = ["Akumulasi Kuat", "Akumulasi", "Netral", "Distribusi", "Distribusi Kuat"] as const;
  const counts: Record<string, number> = Object.fromEntries(ORDER.map(k => [k, 0]));
  let totalFlow = 0;
  for (const s of stocks) {
    const phase = derivePhaseLabel(s);
    const label = PHASE_DISPLAY[phase] ?? "Netral";
    counts[label] = (counts[label] ?? 0) + 1;
    totalFlow += s.bandarScore ?? 0;
  }
  const total = stocks.length || 1;
  const avgFlow = Math.round(totalFlow / total);
  const accPct  = Math.round(((counts["Akumulasi Kuat"] + counts["Akumulasi"]) / total) * 100);
  const distPct = Math.round(((counts["Distribusi"] + counts["Distribusi Kuat"]) / total) * 100);
  return {
    phases: ORDER.map(label => ({
      label, count: counts[label],
      pct: Math.round((counts[label] / total) * 100),
      color: PHASE_COLORS[label],
    })),
    total, avgFlow, accPct, distPct,
  };
}

function PhaseDistributionSection({ radar }: { radar: RadarMarket[] }) {
  const stats = useMemo(() => buildPhaseStats(radar), [radar]);
  return (
    <View style={[styles.card, { marginHorizontal: 16, marginBottom: 12 }]}>
      <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700",
        letterSpacing: 1, marginBottom: 10 }}>
        PHASE DISTRIBUTION · {stats.total} SAHAM
      </Text>
      <View style={{ flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
        {stats.phases.filter(p => p.count > 0).map(p => (
          <View key={p.label} style={{ flex: p.count, backgroundColor: p.color }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {stats.phases.filter(p => p.count > 0).map(p => (
          <View key={p.label} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: p.color }} />
            <Text style={{ color: p.color, fontSize: 10 }}>{p.label} {p.count}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 1,
        borderTopColor: "#1e293b", paddingTop: 10, marginBottom: 10 }}>
        {[
          { label: "Avg SM", value: `${stats.avgFlow}/100`, color: "#f59e0b" },
          { label: "Akumulasi", value: `${stats.accPct}%`,  color: "#34d399" },
          { label: "Distribusi", value: `${stats.distPct}%`, color: "#f87171" },
        ].map(s => (
          <View key={s.label} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: "#64748b", fontSize: 9, marginBottom: 2 }}>{s.label}</Text>
            <Text style={{ color: s.color, fontWeight: "700", fontSize: 17 }}>{s.value}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity onPress={() => router.push("/market-intel" as any)} style={{ alignSelf: "flex-end" }}>
        <Text style={{ color: "#0ea5e9", fontSize: 12 }}>Lihat Market Radar →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── [5] Analisis Konteks IDX (collapsible) ───────────────────

function AnalisisKonteksSection({ radar, breadth }: {
  radar: RadarMarket[];
  breadth: ReturnType<typeof calcBreadth>;
}) {
  const [expanded, setExpanded] = useState(false);

  const stocks = useMemo(
    () => radar.filter(r => !r.ticker.startsWith("IDX") && r.ticker !== "COMPOSITE"),
    [radar]
  );
  const composite = useMemo(() => radar.find(r => r.ticker === "COMPOSITE"), [radar]);

  const accCount  = useMemo(() => stocks.filter(r => r.signal1d === "Accumulation").length, [stocks]);
  const distCount = useMemo(() => stocks.filter(r => r.signal1d === "Distribution").length, [stocks]);
  const total     = stocks.length || 1;
  const accPct    = Math.round((accCount / total) * 100);
  const distPct   = Math.round((distCount / total) * 100);

  const globalBias = accPct >= 50 && breadth.advancerPct >= 45 ? "RISK ON"
    : distPct >= 60 || breadth.declinerPct >= 60 ? "RISK OFF" : "MIXED";

  const biasBadge = globalBias === "RISK ON"
    ? { text: "RISK ON",  color: "#34d399", bg: "#052e16" }
    : globalBias === "RISK OFF"
    ? { text: "RISK OFF", color: "#f87171", bg: "#2d0a0a" }
    : { text: "MIXED",    color: "#fbbf24", bg: "#1c1500" };

  const indicators = [
    {
      label: "IHSG", color: composite ? (composite.chgPct >= 0 ? "#34d399" : "#f87171") : "#64748b",
      value: composite ? `${composite.chgPct >= 0 ? "▲" : "▼"}${Math.abs(composite.chgPct).toFixed(2)}%` : "–",
      sub: null,
    },
    { label: "Naik",   color: "#34d399", value: `${breadth.advancers}`, sub: `${breadth.advancerPct}%` },
    { label: "Turun",  color: "#f87171", value: `${breadth.decliners}`, sub: `${breadth.declinerPct}%` },
    { label: "SM Acc", color: "#60a5fa", value: `${accPct}%`, sub: `${accCount} saham` },
  ];

  const bullets = [
    breadth.declinerPct > 50
      ? `${breadth.decliners} saham turun (${breadth.declinerPct}%) — tekanan jual mendominasi`
      : `${breadth.advancers} saham naik (${breadth.advancerPct}%) — momentum positif`,
    distPct > 50
      ? `Smart Money: ${distPct}% distribusi — bandar net jual`
      : `Smart Money: ${accPct}% akumulasi — bandar net beli`,
    composite
      ? `IHSG ${composite.close.toLocaleString("id-ID")} · ${composite.chgPct >= 0 ? "+" : ""}${composite.chgPct.toFixed(2)}% hari ini`
      : `Nilai transaksi: Rp ${breadth.totalValueT}T`,
  ];

  return (
    <View style={[styles.card, { marginHorizontal: 16, marginBottom: 12 }]}>
      {/* Header — always visible, tap to expand */}
      <TouchableOpacity
        onPress={() => setExpanded(e => !e)}
        style={{ flexDirection: "row", justifyContent: "space-between",
          alignItems: "center", marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 16 }}>🌐</Text>
          <Text style={styles.cardTitle}>Analisis Konteks IDX</Text>
          <View style={{ backgroundColor: biasBadge.bg, borderRadius: 6,
            paddingHorizontal: 8, paddingVertical: 2,
            borderWidth: 1, borderColor: biasBadge.color + "50" }}>
            <Text style={{ color: biasBadge.color, fontSize: 10, fontWeight: "700" }}>
              {biasBadge.text}
            </Text>
          </View>
        </View>
        <Text style={{ color: "#475569", fontSize: 14 }}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {/* 4 Quick Indicators — always visible */}
      <View style={{ flexDirection: "row", justifyContent: "space-between",
        backgroundColor: "#0f1629", borderRadius: 10, padding: 10,
        marginBottom: expanded ? 12 : 0 }}>
        {indicators.map(ind => (
          <View key={ind.label} style={{ alignItems: "center" }}>
            <Text style={{ color: "#475569", fontSize: 9 }}>{ind.label}</Text>
            <Text style={{ color: ind.color, fontWeight: "700", fontSize: 13 }}>{ind.value}</Text>
            {ind.sub ? <Text style={{ color: ind.color + "99", fontSize: 8 }}>{ind.sub}</Text> : null}
          </View>
        ))}
      </View>

      {/* Bullet insights — only when expanded */}
      {expanded && (
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#475569", fontSize: 10, fontWeight: "700",
            letterSpacing: 1, marginBottom: 2 }}>📝 RINGKASAN PASAR</Text>
          {bullets.map((b, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 6 }}>
              <Text style={{ color: "#475569", fontSize: 11 }}>●</Text>
              <Text style={{ color: "#94a3b8", fontSize: 11, flex: 1 }}>{b}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── [6] Market Risk Score (collapsible) ─────────────────────

function calcRiskScore(radar: RadarMarket[], breadth: ReturnType<typeof calcBreadth>) {
  const stocks = radar.filter(r => !r.ticker.startsWith("IDX") && r.ticker !== "COMPOSITE");
  const total  = stocks.length || 1;
  const distCount = stocks.filter(r => r.signal1d === "Distribution").length;
  const distPct   = (distCount / total) * 100;
  const composite = radar.find(r => r.ticker === "COMPOSITE");

  let score = 0;
  const components: Array<{ icon: string; label: string; poin: string; desc: string; color: string }> = [];

  const decPct = breadth.declinerPct;
  let breadthPoin = decPct >= 65 ? 3 : decPct >= 50 ? 2 : decPct >= 40 ? 1 : 0;
  score += breadthPoin;
  components.push({
    icon: "📊", label: "Market Breadth",
    poin: breadthPoin > 0 ? `+${breadthPoin} poin` : "aman",
    desc: `${breadth.decliners} saham turun (${decPct}%) · ${breadth.advancers} naik`,
    color: breadthPoin >= 2 ? "#f87171" : breadthPoin >= 1 ? "#fbbf24" : "#34d399",
  });

  let distPoin = distPct >= 65 ? 4 : distPct >= 50 ? 3 : distPct >= 40 ? 2 : distPct >= 30 ? 1 : 0;
  score += distPoin;
  components.push({
    icon: "🏦", label: "Smart Money Flow",
    poin: distPoin > 0 ? `+${distPoin} poin` : "aman",
    desc: `${distPct.toFixed(0)}% saham dalam distribusi (${distCount}/${total})`,
    color: distPoin >= 3 ? "#f87171" : distPoin >= 2 ? "#fbbf24" : "#34d399",
  });

  let ihsgPoin = composite && composite.chgPct < -1.5 ? 2 : composite && composite.chgPct < 0 ? 1 : 0;
  score += ihsgPoin;
  components.push({
    icon: "📉", label: "Arah IHSG",
    poin: ihsgPoin > 0 ? `+${ihsgPoin} poin` : "aman",
    desc: composite
      ? `IHSG ${composite.close.toLocaleString("id-ID")} · ${composite.chgPct >= 0 ? "+" : ""}${composite.chgPct.toFixed(2)}% hari ini`
      : "Data IHSG tidak tersedia",
    color: ihsgPoin >= 2 ? "#f87171" : ihsgPoin >= 1 ? "#fbbf24" : "#34d399",
  });

  const avgScore = stocks.reduce((s, r) => s + r.bandarScore, 0) / total;
  const scorePoin = avgScore < 30 ? 1 : 0;
  score += scorePoin;
  components.push({
    icon: "🧠", label: "Avg Bandar Score",
    poin: scorePoin > 0 ? `+${scorePoin} poin` : "aman",
    desc: `Rata-rata bandar score: ${avgScore.toFixed(0)}/100`,
    color: scorePoin >= 1 ? "#fbbf24" : "#34d399",
  });

  const finalScore = Math.min(10, score);
  let label: string, color: string, bg: string;
  let strategy: { title: string; bullets: string[] };

  if (finalScore >= 8) {
    label = "HIGH RISK"; color = "#f87171"; bg = "#2d0a0a";
    strategy = { title: "Kurangi Posisi — Pindah ke Safe Haven",
      bullets: ["Cash 40–50%", "Emas / XAUUSD sebagai hedge", "Tunggu breadth membaik"] };
  } else if (finalScore >= 6) {
    label = "MEDIUM-HIGH"; color = "#f97316"; bg = "#1c0a00";
    strategy = { title: "Selektif — Fokus Defensive & Dividen",
      bullets: ["Kurangi growth stock", "Fokus saham NBS positif", "Cash 20–30%"] };
  } else if (finalScore >= 4) {
    label = "MEDIUM RISK"; color = "#fbbf24"; bg = "#1c1500";
    strategy = { title: "Normal — Selektif per Sektor",
      bullets: ["Ikuti sinyal BOW/BOS", "Diversifikasi sektor", "Max risk 2%/trade"] };
  } else {
    label = "LOW RISK"; color = "#34d399"; bg = "#052e16";
    strategy = { title: "Bullish — Entry dengan Konfirmasi",
      bullets: ["Cari breakout dengan volume", "SM Accumulation stocks", "Tambah posisi profit"] };
  }
  return { score: finalScore, components, label, color, bg, strategy };
}

function MarketRiskCard({ radar, breadth }: {
  radar: RadarMarket[]; breadth: ReturnType<typeof calcBreadth>;
}) {
  const [expanded, setExpanded] = useState(false);
  const risk = useMemo(() => calcRiskScore(radar, breadth), [radar, breadth]);
  const visibleComponents = expanded ? risk.components : risk.components.slice(0, 2);

  return (
    <View style={[styles.card, { marginHorizontal: 16, marginBottom: 12 }]}>
      {/* Score + label header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 10 }}>
        <View>
          <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>
            MARKET RISK SCORE
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <Text style={{ fontSize: 14 }}>🚨</Text>
            <Text style={{ color: risk.color, fontWeight: "700", fontSize: 14 }}>{risk.label}</Text>
          </View>
        </View>
        <Text style={{ color: risk.color, fontWeight: "900", fontSize: 36 }}>{risk.score}
          <Text style={{ color: "#475569", fontSize: 14, fontWeight: "400" }}>/10</Text>
        </Text>
      </View>

      {/* Gradient bar */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ height: 8, backgroundColor: "#0f1629", borderRadius: 4, overflow: "hidden" }}>
          <View style={{ position: "absolute", flexDirection: "row", width: "100%", height: "100%" }}>
            <View style={{ flex: 4, backgroundColor: "#34d399" }} />
            <View style={{ flex: 3, backgroundColor: "#f97316" }} />
            <View style={{ flex: 3, backgroundColor: "#dc2626" }} />
          </View>
          <View style={{ position: "absolute", right: 0, top: 0, bottom: 0,
            width: `${100 - (risk.score / 10 * 100)}%` as any, backgroundColor: "#0f1629" }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 3 }}>
          <Text style={{ color: "#475569", fontSize: 9 }}>0 LOW</Text>
          <Text style={{ color: "#475569", fontSize: 9 }}>4 MED</Text>
          <Text style={{ color: "#475569", fontSize: 9 }}>7 HIGH</Text>
          <Text style={{ color: "#475569", fontSize: 9 }}>10</Text>
        </View>
      </View>

      {/* Components (max 2 when collapsed) */}
      <View style={{ gap: 8, marginBottom: 8 }}>
        {visibleComponents.map(c => (
          <View key={c.label} style={{ flexDirection: "row", gap: 8 }}>
            <Text style={{ fontSize: 13 }}>{c.icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                <Text style={{ color: c.color, fontWeight: "600", fontSize: 12 }}>{c.label}</Text>
                <Text style={{ color: c.poin === "aman" ? "#34d399" : c.color, fontSize: 10 }}>
                  {c.poin}
                </Text>
              </View>
              <Text style={{ color: "#64748b", fontSize: 10 }}>{c.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Expand toggle */}
      <TouchableOpacity onPress={() => setExpanded(e => !e)}
        style={{ alignItems: "center", paddingVertical: 6 }}>
        <Text style={{ color: "#64748b", fontSize: 11 }}>
          {expanded
            ? "▲ Sembunyikan"
            : `▼ +${risk.components.length - 2} komponen lagi · Lihat Strategi`}
        </Text>
      </TouchableOpacity>

      {/* Strategy — only when expanded */}
      {expanded && (
        <View style={{ backgroundColor: risk.bg, borderRadius: 10, padding: 12,
          marginTop: 8, borderWidth: 1, borderColor: risk.color + "40" }}>
          <Text style={{ color: "#64748b", fontSize: 9, fontWeight: "700",
            letterSpacing: 1, marginBottom: 6 }}>STRATEGI YANG DISARANKAN</Text>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13, marginBottom: 8 }}>
            {risk.strategy.title}
          </Text>
          {risk.strategy.bullets.map((b, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
              <Text style={{ color: "#475569", fontSize: 12 }}>→</Text>
              <Text style={{ color: "#94a3b8", fontSize: 12, flex: 1 }}>{b}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Mover card ───────────────────────────────────────────────

function MoverCard({ ms }: { ms: MasterStock }) {
  const isUp = ms.changePercent >= 0;
  const chgColor = isUp ? "#34d399" : "#f87171";
  const badges = getIndexBadges(ms.indexCategory);
  return (
    <TouchableOpacity
      style={{ width: 108, padding: 10, borderRadius: 12, backgroundColor: "#1e2433" }}
      onPress={() => router.push(`/stock/${ms.symbol}` as never)}
      activeOpacity={0.7}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <View style={{ alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 3,
          borderRadius: 5, backgroundColor: chgColor + "22" }}>
          <Text style={{ color: chgColor, fontSize: 11, fontWeight: "700" }}>{ms.symbol}</Text>
        </View>
        {badges.slice(0, 1).map(b => (
          <View key={b.label} style={{ paddingHorizontal: 4, paddingVertical: 1,
            borderRadius: 3, backgroundColor: b.color + "25" }}>
            <Text style={{ color: b.color, fontSize: 7, fontWeight: "700" }}>{b.label}</Text>
          </View>
        ))}
      </View>
      <Text style={{ color: "#64748b", fontSize: 10 }} numberOfLines={1}>
        {(ms.name || ms.symbol).split(" ").slice(0, 2).join(" ")}
      </Text>
      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
        {ms.close.toLocaleString("id-ID")}
      </Text>
      <Text style={{ color: chgColor, fontSize: 11, fontWeight: "600", marginTop: 2 }}>
        {isUp ? "▲" : "▼"} {Math.abs(ms.changePercent).toFixed(2)}%
      </Text>
    </TouchableOpacity>
  );
}

// ─── Stock list card ──────────────────────────────────────────

function StockCard({ ms, colors }: { ms: MasterStock; colors: ReturnType<typeof useColors> }) {
  const isUp = ms.changePercent >= 0;
  const chgColor = isUp ? "#34d399" : "#f87171";
  const badges = getIndexBadges(ms.indexCategory);
  return (
    <TouchableOpacity
      style={[styles.stockRow, { borderBottomColor: colors.border }]}
      onPress={() => router.push(`/stock/${ms.symbol}` as never)}
      activeOpacity={0.7}>
      <View style={styles.stockLeft}>
        <View style={[styles.codeBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.codeText, { color: colors.primary }]}>{ms.symbol}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "500" }} numberOfLines={1}>
            {ms.name || ms.symbol}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Text style={{ color: "#64748b", fontSize: 10 }}>{ms.sector}</Text>
            {badges.map(b => (
              <View key={b.label} style={{ paddingHorizontal: 4, paddingVertical: 1,
                borderRadius: 3, backgroundColor: b.color + "22" }}>
                <Text style={{ color: b.color, fontSize: 8, fontWeight: "700" }}>{b.label}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: "#60a5fa", fontSize: 10, marginTop: 1 }}>
            Vol: {ms.volume >= 1_000_000 ? `${(ms.volume / 1_000_000).toFixed(1)}M`
              : ms.volume >= 1_000 ? `${(ms.volume / 1_000).toFixed(0)}K` : String(ms.volume)}
            {ms.vol50dPct >= 150 && <Text style={{ color: "#fbbf24" }}> ★{Math.round(ms.vol50dPct)}%</Text>}
            {"  "}Nilai: {fmtValueBn(ms.value)}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
          {ms.close.toLocaleString("id-ID")}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3,
          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
          backgroundColor: chgColor + "22" }}>
          <Feather name={isUp ? "trending-up" : "trending-down"} size={10} color={chgColor} />
          <Text style={{ color: chgColor, fontSize: 12, fontWeight: "700" }}>
            {isUp ? "▲" : "▼"} {Math.abs(ms.changePercent).toFixed(2)}%
          </Text>
        </View>
        {ms.return10d !== 0 && (
          <Text style={{ color: ms.return10d > 0 ? "#34d39980" : "#f8717180", fontSize: 9 }}>
            10D: {ms.return10d > 0 ? "+" : ""}{ms.return10d.toFixed(1)}%
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter/sort config ───────────────────────────────────────

const INDEX_OPTS: { label: string; val: StockFilter["index"] }[] = [
  { label: "Semua", val: "" },
  { label: "LQ45", val: "LQ45" },
  { label: "KOMPAS100", val: "KOMPAS100" },
  { label: "JII30", val: "JII30" },
];

const SORT_OPTS: { label: string; val: SortKey }[] = [
  { label: "% Naik ▼", val: "change_desc" },
  { label: "% Turun ▼", val: "change_asc" },
  { label: "Volume",    val: "volume_desc" },
  { label: "Nilai",     val: "value_desc" },
  { label: "Mkt Cap",   val: "cap_desc" },
  { label: "10D Return", val: "ret10d" },
  { label: "A–Z",       val: "alpha" },
];

// ─── Main screen ──────────────────────────────────────────────

export default function MarketScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top + 8;

  const [query, setQuery]           = useState("");
  const [indexFilter, setIndexFilter] = useState<StockFilter["index"]>("");
  const [sortBy, setSortBy]         = useState<SortKey>("change_desc");
  const [showSort, setShowSort]     = useState(false);

  const { data: stocks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["master-stock"],
    queryFn:  fetchMasterStock,
    staleTime: 60 * 60 * 1000,
    gcTime:    4 * 60 * 60 * 1000,
    retry: 2,
  });

  const { data: radar = [], isLoading: loadingRadar } = useQuery({
    queryKey: ["radar-market"],
    queryFn:  fetchRadarMarket,
    staleTime: 60 * 60 * 1000,
    gcTime:    2 * 60 * 60 * 1000,
  });

  const breadth = useMemo(() => calcBreadth(stocks), [stocks]);
  const gainers = useMemo(() => getTopGainersList(stocks, 8), [stocks]);
  const losers  = useMemo(() => getTopLosersList(stocks, 8), [stocks]);
  const filtered = useMemo(() => {
    const f = filterStocks(stocks, { search: query, index: indexFilter });
    return sortStocks(f, sortBy);
  }, [stocks, query, indexFilter, sortBy]);

  const sortLabel   = SORT_OPTS.find(o => o.val === sortBy)?.label ?? "Sort";
  const radarReady  = radar.length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ height: topPadding, backgroundColor: colors.background }} />

      <FlatList
        data={filtered}
        keyExtractor={item => item.symbol}
        renderItem={({ item }) => <StockCard ms={item} colors={colors} />}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 90 }}
        ListHeaderComponent={
          <>
            {/* [1] Header */}
            <HomeHeader stocks={stocks} radar={radar} />

            {/* [2] Trending Tools — always visible, no loading dep */}
            <View style={{ backgroundColor: "#0f1629", paddingTop: 16, paddingBottom: 8 }}>
              <TrendingToolsSection />
            </View>

            {/* [3]-[6] Smart sections — from radar */}
            {radarReady ? (
              <View style={{ backgroundColor: "#0f1629", paddingTop: 8 }}>
                <SignalSnapshotSection radar={radar} />
                <PhaseDistributionSection radar={radar} />
                <AnalisisKonteksSection radar={radar} breadth={breadth} />
                <MarketRiskCard radar={radar} breadth={breadth} />
              </View>
            ) : loadingRadar ? (
              <View style={{ marginHorizontal: 16, marginVertical: 8, padding: 14,
                backgroundColor: "#1e2433", borderRadius: 16, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#60a5fa" />
                <Text style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>
                  Memuat Market Intelligence…
                </Text>
              </View>
            ) : null}

            {/* Top Gainers */}
            {gainers.length > 0 && (
              <View style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 4,
                backgroundColor: colors.background }}>
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700",
                  marginBottom: 10 }}>🚀 Top Gainers</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                  {gainers.map(s => <MoverCard key={s.symbol} ms={s} />)}
                </ScrollView>
              </View>
            )}

            {/* Top Losers */}
            {losers.length > 0 && (
              <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 4,
                backgroundColor: colors.background }}>
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700",
                  marginBottom: 10 }}>📉 Top Losers</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                  {losers.map(s => <MoverCard key={s.symbol} ms={s} />)}
                </ScrollView>
              </View>
            )}

            {/* Stock list header */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
              borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
              backgroundColor: colors.background }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700",
                marginBottom: 10 }}>Semua Saham</Text>

              {isError && (
                <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "#f8717140",
                  padding: 14, backgroundColor: "#f8717110", gap: 8, marginBottom: 8 }}>
                  <Text style={{ color: "#f87171", fontWeight: "700" }}>⚠️ Gagal memuat data</Text>
                  <TouchableOpacity onPress={() => refetch()}
                    style={{ backgroundColor: "#f87171", borderRadius: 8, padding: 8, alignItems: "center" }}>
                    <Text style={{ color: "#fff", fontWeight: "700" }}>Coba Lagi</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isLoading ? (
                <View style={{ padding: 24, alignItems: "center",
                  backgroundColor: colors.card, borderRadius: 12 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ color: colors.mutedForeground, marginTop: 8, fontSize: 12 }}>
                    Memuat {breadth.total > 0 ? breadth.total.toLocaleString("id-ID") : ""} saham IDX…
                  </Text>
                </View>
              ) : (
                <>
                  <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Feather name="search" size={14} color={colors.mutedForeground} />
                    <TextInput
                      style={{ flex: 1, fontSize: 14, color: colors.foreground }}
                      placeholder="Cari kode atau nama saham…"
                      placeholderTextColor={colors.mutedForeground}
                      value={query}
                      onChangeText={setQuery}
                      autoCapitalize="characters"
                    />
                    {query.length > 0 && (
                      <TouchableOpacity onPress={() => setQuery("")}>
                        <Feather name="x" size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
                    {INDEX_OPTS.map(o => {
                      const active = indexFilter === o.val;
                      return (
                        <TouchableOpacity key={o.val ?? "all"}
                          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                            backgroundColor: active ? colors.primary : colors.card,
                            borderWidth: 1, borderColor: active ? colors.primary : colors.border }}
                          onPress={() => setIndexFilter(o.val)}>
                          <Text style={{ color: active ? "#fff" : colors.mutedForeground,
                            fontSize: 11, fontWeight: active ? "700" : "400" }}>
                            {o.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary,
                        flexDirection: "row", alignItems: "center", gap: 4 }}
                      onPress={() => setShowSort(!showSort)}>
                      <Feather name="sliders" size={11} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>
                        {sortLabel}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>

                  {showSort && (
                    <View style={{ marginTop: 8, borderRadius: 10, borderWidth: 1,
                      borderColor: colors.border, backgroundColor: colors.card, overflow: "hidden" }}>
                      {SORT_OPTS.map(o => (
                        <TouchableOpacity key={o.val}
                          style={{ padding: 10, borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: colors.border,
                            backgroundColor: sortBy === o.val ? colors.primary + "15" : "transparent" }}
                          onPress={() => { setSortBy(o.val); setShowSort(false); }}>
                          <Text style={{ color: sortBy === o.val ? colors.primary : colors.foreground,
                            fontWeight: sortBy === o.val ? "700" : "400", fontSize: 13 }}>
                            {o.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={{ color: colors.mutedForeground, fontSize: 10,
                    marginTop: 8, textAlign: "right" }}>
                    {filtered.length.toLocaleString("id-ID")} saham ditampilkan
                  </Text>
                </>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
              <Feather name="search" size={32} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: "center" }}>
                Tidak ditemukan: "{query}"
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: { backgroundColor: "#1e2433", borderRadius: 16, padding: 16 },
  cardTitle: { color: "#fff", fontWeight: "700", fontSize: 14 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  stockRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  stockLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginRight: 4 },
  codeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 52, alignItems: "center" },
  codeText: { fontSize: 13, fontWeight: "700" },
});
