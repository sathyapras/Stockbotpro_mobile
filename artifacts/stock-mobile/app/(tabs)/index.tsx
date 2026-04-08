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
import {
  type SectorData,
  PHASE_CONFIG as SECTOR_PHASE_CFG,
  buildSectorStats,
} from "@/services/sectorService";
import {
  fearLabelDisplay,
  fetchGlobalSentiment,
} from "@/services/globalSentimentService";

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

  // Half-width index cards only (COMPOSITE is already shown above)
  const halfWidthCards = useMemo(() =>
    INDICES.filter(i => !i.fullWidth).map(idx => {
      const ms = stockMap.get(idx.key);
      const rd = radarMap.get(idx.key);
      const val = ms?.close || rd?.close || 0;
      const chg = ms?.changePercent || rd?.chgPct || 0;
      if (val === 0) return null;
      return { ...idx, val, chg };
    }).filter(Boolean) as Array<typeof INDICES[number] & { val: number; chg: number }>,
  [stockMap, radarMap]);

  // ── Market Context: inline risk + bias computation ──────────
  const marketCtx = useMemo(() => {
    const radarStocks = radar.filter(r => !r.ticker.startsWith("IDX") && r.ticker !== "COMPOSITE");
    const n      = radarStocks.length || 1;
    const accCnt = radarStocks.filter(r => r.signal1d === "Accumulation").length;
    const dstCnt = radarStocks.filter(r => r.signal1d === "Distribution").length;
    const accPct = Math.round((accCnt / n) * 100);
    const dstPct = Math.round((dstCnt / n) * 100);
    const avgBandar = Math.round(radarStocks.reduce((s, r) => s + (r.bandarScore ?? 0), 0) / n);

    // simple risk score 0–10
    const decPctV = breadth.declinerPct;
    let score = 0;
    if (decPctV >= 65) score += 3; else if (decPctV >= 50) score += 2; else if (decPctV >= 40) score += 1;
    if (dstPct  >= 65) score += 4; else if (dstPct  >= 50) score += 3; else if (dstPct  >= 40) score += 2; else if (dstPct >= 30) score += 1;
    if (ihsgChg < -1.5) score += 2; else if (ihsgChg < 0) score += 1;
    if (avgBandar < 30) score += 1;
    const finalScore = Math.min(10, score);

    let riskLabel: string, riskColor: string, riskBg: string;
    if      (finalScore >= 8) { riskLabel = "HIGH RISK";    riskColor = "#f87171"; riskBg = "#3b0a0a"; }
    else if (finalScore >= 6) { riskLabel = "MED-HIGH";     riskColor = "#f97316"; riskBg = "#2d1400"; }
    else if (finalScore >= 4) { riskLabel = "MEDIUM RISK";  riskColor = "#fbbf24"; riskBg = "#2d2000"; }
    else                      { riskLabel = "LOW RISK";     riskColor = "#34d399"; riskBg = "#0a2218"; }

    const bias = accPct >= 50 && breadth.advancerPct >= 45 ? "RISK ON"
      : dstPct >= 60 || breadth.declinerPct >= 60 ? "RISK OFF" : "MIXED";
    const biasColor = bias === "RISK ON" ? "#34d399" : bias === "RISK OFF" ? "#f87171" : "#fbbf24";

    return { finalScore, riskLabel, riskColor, riskBg, bias, biasColor, accPct, dstPct, avgBandar };
  }, [radar, breadth, ihsgChg]);

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

      {/* ── Market Context Card (replaces redundant IDX COMPOSITE card) ── */}
      <View style={{
        backgroundColor: "#131d2e", borderRadius: 14,
        borderWidth: 1, borderColor: marketCtx.riskColor + "30",
        padding: 12, marginBottom: 8,
      }}>
        {/* Top row: Risk badge + score gauge + Bias badge */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          {/* Left: Risk level */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{
              backgroundColor: marketCtx.riskBg, borderRadius: 8,
              borderWidth: 1, borderColor: marketCtx.riskColor + "50",
              paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ color: marketCtx.riskColor, fontSize: 11, fontWeight: "800" }}>
                {marketCtx.riskLabel}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
              <Text style={{ color: marketCtx.riskColor, fontWeight: "900", fontSize: 20 }}>
                {marketCtx.finalScore}
              </Text>
              <Text style={{ color: "#475569", fontSize: 11 }}>/10</Text>
            </View>
          </View>

          {/* Right: Bias badge */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: marketCtx.biasColor }} />
            <Text style={{ color: marketCtx.biasColor, fontWeight: "700", fontSize: 12 }}>
              {marketCtx.bias}
            </Text>
          </View>
        </View>

        {/* Score bar */}
        <View style={{ height: 4, backgroundColor: "#0f1629", borderRadius: 2,
          overflow: "hidden", marginBottom: 10 }}>
          <View style={{ position: "absolute", flexDirection: "row", width: "100%", height: "100%" }}>
            <View style={{ flex: 4, backgroundColor: "#34d399" }} />
            <View style={{ flex: 3, backgroundColor: "#f97316" }} />
            <View style={{ flex: 3, backgroundColor: "#dc2626" }} />
          </View>
          <View style={{ position: "absolute", right: 0, top: 0, bottom: 0,
            width: `${100 - (marketCtx.finalScore / 10 * 100)}%` as any,
            backgroundColor: "#131d2e" }} />
        </View>

        {/* Bottom row: 3 stats */}
        <View style={{ flexDirection: "row" }}>
          {[
            { label: "SM Akumulasi", value: `${marketCtx.accPct}%`,     color: "#34d399" },
            { label: "SM Distribusi", value: `${marketCtx.dstPct}%`,     color: "#f87171" },
            { label: "Avg Bandar",    value: `${marketCtx.avgBandar}`,    color: "#a78bfa" },
          ].map((stat, i) => (
            <View key={stat.label} style={{
              flex: 1, alignItems: "center",
              borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: "#1e293b",
            }}>
              <Text style={{ color: "#475569", fontSize: 9, marginBottom: 2 }}>{stat.label}</Text>
              <Text style={{ color: stat.color, fontWeight: "700", fontSize: 14 }}>{stat.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Half-width index cards (LQ45, IDX30, JII) */}
      {halfWidthCards.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {halfWidthCards.map(idx => {
            const up = idx.chg >= 0;
            const col = up ? "#34d399" : "#f87171";
            return (
              <View key={idx.key} style={{
                flex: 1, minWidth: "45%",
                backgroundColor: "#1a2233", borderRadius: 12,
                borderWidth: 1, borderColor: "#1e293b",
                padding: 10,
              }}>
                <Text style={{ color: "#475569", fontSize: 9, marginBottom: 2 }}>{idx.label}</Text>
                <Text style={{ color: "#e2e8f0", fontWeight: "700", fontSize: 14 }}>
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
  );
}

// ─── [2] Command Center ───────────────────────────────────────

interface CCCard {
  icon: string; label: string; sub: string;
  color: string; bg: string; border: string;
  path: string;
  metric: string; detail: string;
}

function CommandMiniCard({ card }: { card: CCCard }) {
  return (
    <TouchableOpacity
      onPress={() => router.push(card.path as any)}
      activeOpacity={0.8}
      style={{
        flex: 1, borderRadius: 14, padding: 13,
        backgroundColor: card.bg, borderWidth: 1, borderColor: card.border,
      }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Text style={{ fontSize: 16 }}>{card.icon}</Text>
        <View>
          <Text style={{ color: card.color, fontSize: 10, fontWeight: "800",
            letterSpacing: 0.5 }}>{card.label}</Text>
          <Text style={{ color: "#475569", fontSize: 8 }}>{card.sub}</Text>
        </View>
      </View>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16,
        lineHeight: 20 }}>{card.metric}</Text>
      <Text style={{ color: card.color, fontSize: 11, marginTop: 3,
        fontWeight: "600" }}>{card.detail}</Text>
    </TouchableOpacity>
  );
}

function CommandCenter({ radar, loading, sectors }: { radar: RadarMarket[]; loading: boolean; sectors: SectorData[] }) {
  const stocksOnly = useMemo(
    () => radar.filter(r => !r.ticker.startsWith("IDX") && r.ticker !== "COMPOSITE"),
    [radar]
  );

  const stats = useMemo(() => {
    if (stocksOnly.length === 0) return null;
    const wp = stocksOnly.map(r => ({ ...r, _phase: derivePhaseLabel(r) }));
    const acc      = wp.filter(r => ["IGNITION","EARLY_ACC","STRONG_TREND"].includes(r._phase));
    const dist     = wp.filter(r => ["EXHAUSTION","DISTRIBUTION"].includes(r._phase));
    const ignition = wp.filter(r => r._phase === "IGNITION");
    const topNbs   = [...stocksOnly].sort((a, b) => b.nbs1d - a.nbs1d)[0];
    const topScore = [...stocksOnly].sort((a, b) => b.bandarScore - a.bandarScore)[0];
    const topEntry = ignition.sort((a, b) => b.nbs1d - a.nbs1d)[0];
    const bowCount = ignition.length;
    return { accCount: acc.length, distCount: dist.length, topNbs, topScore, topEntry, bowCount };
  }, [stocksOnly]);

  const cards: CCCard[] = [
    {
      icon: "🎯", label: "STOCKPICK", sub: "BOW & BOS",
      color: "#fbbf24", bg: "#160f00", border: "#d9770625",
      path: "/(tabs)/stockpick",
      metric: stats ? `${stats.bowCount} Entry` : "—",
      detail: stats?.topEntry ? `Hot: ${stats.topEntry.ticker}  ${stats.topEntry.trendScore}/100` : loading ? "Loading…" : "Belum ada data",
    },
    {
      icon: "📊", label: "FLOW", sub: "Bandar Activity",
      color: "#a78bfa", bg: "#1a1030", border: "#7c3aed25",
      path: "/(tabs)/bandar",
      metric: stats ? `${stats.accCount} ACC  ·  ${stats.distCount} DIST` : "—",
      detail: stats?.topNbs ? `↑ ${stats.topNbs.ticker}  +${stats.topNbs.nbs1d.toFixed(1)}B` : loading ? "Loading…" : "Belum ada data",
    },
    {
      icon: "💎", label: "SMART MONEY", sub: "Broker Intel",
      color: "#10b981", bg: "#041f10", border: "#10b98125",
      path: "/(tabs)/smartmoney",
      metric: stats?.topScore ? `⭐ ${stats.topScore.ticker}` : "—",
      detail: stats?.topScore ? `Bandar Score ${stats.topScore.bandarScore}/100` : loading ? "Loading…" : "Belum ada data",
    },
    {
      icon: "📡", label: "RADAR", sub: "Market Intel",
      color: "#38bdf8", bg: "#071624", border: "#0ea5e925",
      path: "/(tabs)/screener",
      metric: stats ? `${stats.bowCount} Ignition` : "—",
      detail: stats?.topEntry ? `↑ ${stats.topEntry.ticker}  Score ${stats.topEntry.bandarScore}` : loading ? "Loading…" : "Belum ada data",
    },
  ];

  // Sector summary
  const sectorSummary = useMemo(() => {
    if (sectors.length === 0) return null;
    const leading  = sectors.filter(s => s.phase === "Leading");
    const lagging  = sectors.filter(s => s.phase === "Lagging");
    const top = [...sectors].sort((a, b) => b.avgBandarScore - a.avgBandarScore)[0];
    return { leadingCount: leading.length, laggingCount: lagging.length, top };
  }, [sectors]);

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
      <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "700",
        letterSpacing: 1.5, marginBottom: 10 }}>
        COMMAND CENTER
      </Text>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <CommandMiniCard card={cards[0]} />
          <CommandMiniCard card={cards[1]} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <CommandMiniCard card={cards[2]} />
          <CommandMiniCard card={cards[3]} />
        </View>

        {/* Sector card — full width */}
        <TouchableOpacity
          onPress={() => router.push("/sector-rotation" as any)}
          activeOpacity={0.8}
          style={{
            borderRadius: 14, padding: 13,
            backgroundColor: "#0e1520", borderWidth: 1, borderColor: "#fb923c25",
            flexDirection: "row", alignItems: "center", gap: 12,
          }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Text style={{ fontSize: 16 }}>🔄</Text>
              <View>
                <Text style={{ color: "#fb923c", fontSize: 10, fontWeight: "800",
                  letterSpacing: 0.5 }}>SECTOR ROTATION</Text>
                <Text style={{ color: "#475569", fontSize: 8 }}>Market Breadth</Text>
              </View>
            </View>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
              {sectorSummary
                ? `${sectorSummary.leadingCount} Leading  ·  ${sectorSummary.laggingCount} Lagging`
                : loading ? "Loading…" : "—"}
            </Text>
          </View>
          {sectorSummary?.top && (
            <View style={{ alignItems: "flex-end" }}>
              <View style={{
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                backgroundColor: SECTOR_PHASE_CFG[sectorSummary.top.phase].bg,
                borderWidth: 1, borderColor: SECTOR_PHASE_CFG[sectorSummary.top.phase].color + "60",
                marginBottom: 4,
              }}>
                <Text style={{ color: SECTOR_PHASE_CFG[sectorSummary.top.phase].color,
                  fontSize: 10, fontWeight: "700" }}>
                  {SECTOR_PHASE_CFG[sectorSummary.top.phase].emoji} {sectorSummary.top.phase}
                </Text>
              </View>
              <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "600" }}
                numberOfLines={1}>
                {sectorSummary.top.sector}
              </Text>
              <Text style={{ color: "#a78bfa", fontSize: 10 }}>
                Score {Math.round(sectorSummary.top.avgBandarScore)}/100
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
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

// ─── [5] Sentimen Global Card ─────────────────────────────────

function SentimenGlobalCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["global-sentiment"],
    queryFn: fetchGlobalSentiment,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  const s        = data?.sentiment;
  const fearInfo = fearLabelDisplay(s?.fearLabel ?? "NEUTRAL");
  const ihsg     = data?.domestic?.find(d => d.name === "IHSG");
  const sp       = data?.indices?.find(d => d.name === "S&P 500");
  const nasdaq   = data?.indices?.find(d => d.name === "NASDAQ");
  const wti      = data?.commodities?.find(d => d.name === "WTI Crude Oil");

  const cardBg     = s ? fearInfo.bg     : "#1e2433";
  const borderCol  = s ? fearInfo.color + "55" : "#2d3748";

  const biasBadge =
    s?.globalBias === "RISK_OFF" ? { text: "RISK OFF", color: "#f87171", bg: "#2d0a0a" } :
    s?.globalBias === "RISK_ON"  ? { text: "RISK ON",  color: "#34d399", bg: "#052e16" } :
                                   { text: "MIXED",    color: "#fbbf24", bg: "#1c1500" };

  function pctStr(pct: number | null | undefined, decimals = 2) {
    if (pct == null) return "—";
    return `${pct >= 0 ? "▲" : "▼"}${Math.abs(pct).toFixed(decimals)}%`;
  }
  function pctColor(pct: number | null | undefined) {
    return (pct ?? 0) >= 0 ? "#34d399" : "#f87171";
  }

  const indicators = [
    { label: "S&P 500", value: pctStr(sp?.changePct),     color: pctColor(sp?.changePct) },
    { label: "NASDAQ",  value: pctStr(nasdaq?.changePct),  color: pctColor(nasdaq?.changePct) },
    { label: "IHSG",    value: pctStr(ihsg?.changePct),    color: pctColor(ihsg?.changePct) },
    { label: "WTI Oil", value: pctStr(wti?.changePct),     color: pctColor(wti?.changePct) },
  ];

  return (
    <TouchableOpacity
      onPress={() => router.push("/global-sentiment" as any)}
      activeOpacity={0.85}
      style={[styles.card, {
        marginHorizontal: 16, marginBottom: 12,
        backgroundColor: cardBg,
        borderWidth: 1, borderColor: borderCol,
      }]}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 15 }}>🌍</Text>
          <Text style={styles.cardTitle}>Sentimen Global</Text>
          {s && (
            <View style={{ backgroundColor: biasBadge.bg, borderRadius: 6,
              paddingHorizontal: 8, paddingVertical: 2,
              borderWidth: 1, borderColor: biasBadge.color + "50" }}>
              <Text style={{ color: biasBadge.color, fontSize: 10, fontWeight: "700" }}>
                {biasBadge.text}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ color: "#475569", fontSize: 13 }}>→</Text>
      </View>

      {/* VIX + Fear Label */}
      {isLoading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ActivityIndicator size="small" color={fearInfo.color} />
          <Text style={{ color: "#64748b", fontSize: 12 }}>Memuat data global…</Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Text style={{ color: fearInfo.color, fontWeight: "900", fontSize: 32 }}>
            {s?.vix?.toFixed(1) ?? "—"}
          </Text>
          <View>
            <Text style={{ color: "#64748b", fontSize: 10 }}>VIX — Fear & Greed</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Text style={{ fontSize: 13 }}>{fearInfo.icon}</Text>
              <Text style={{ color: fearInfo.color, fontWeight: "700", fontSize: 13 }}>
                {fearInfo.text}
              </Text>
            </View>
          </View>
          {s?.usdIdr && (
            <View style={{ marginLeft: "auto" as any }}>
              <Text style={{ color: "#64748b", fontSize: 9, textAlign: "right" }}>USD/IDR</Text>
              <Text style={{ color: "#94a3b8", fontWeight: "700", fontSize: 13, textAlign: "right" }}>
                {s.usdIdr.toLocaleString("id-ID")}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 4 Market Indicators */}
      {!isLoading && (
        <View style={{ flexDirection: "row", justifyContent: "space-between",
          backgroundColor: "#0f162960", borderRadius: 10, padding: 10 }}>
          {indicators.map(ind => (
            <View key={ind.label} style={{ alignItems: "center" }}>
              <Text style={{ color: "#475569", fontSize: 9 }}>{ind.label}</Text>
              <Text style={{ color: ind.color, fontWeight: "700", fontSize: 12 }}>{ind.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tap hint */}
      <Text style={{ color: fearInfo.color + "80", fontSize: 10,
        textAlign: "center", marginTop: 8 }}>
        Tap untuk analisa narasi lengkap →
      </Text>
    </TouchableOpacity>
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

const PRESETS: { key: string; icon: string; label: string; color: string; bg: string }[] = [
  { key: "entry",  icon: "🚀", label: "Entry Signal",  color: "#0ea5e9", bg: "#071624" },
  { key: "acc",    icon: "⭐", label: "Strong Acc",    color: "#16a34a", bg: "#041f10" },
  { key: "bandar", icon: "💎", label: "Top Bandar",    color: "#a78bfa", bg: "#1a1030" },
  { key: "volume", icon: "📈", label: "Vol Spike",     color: "#f59e0b", bg: "#180e00" },
  { key: "dist",   icon: "🔴", label: "Distribusi",    color: "#dc2626", bg: "#1a0707" },
];

// ─── Main screen ──────────────────────────────────────────────

const PAGE_SIZE = 30;

export default function MarketScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top + 8;

  const [query, setQuery]               = useState("");
  const [indexFilter, setIndexFilter]   = useState<StockFilter["index"]>("");
  const [sortBy, setSortBy]             = useState<SortKey>("ret10d");
  const [showSort, setShowSort]         = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activePreset, setActivePreset] = useState<string | null>(null);

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

  const radarMap = useMemo(
    () => new Map(radar.map(r => [r.ticker, r])),
    [radar]
  );

  const sectorStats = useMemo(
    () => (stocks.length > 0 && radar.length > 0 ? buildSectorStats(stocks, radar) : []),
    [stocks, radar]
  );

  const presetFiltered = useMemo(() => {
    if (!activePreset) return filtered;
    switch (activePreset) {
      case "entry":
        return filtered.filter(s => {
          const r = radarMap.get(s.symbol);
          return r && derivePhaseLabel(r) === "IGNITION";
        });
      case "acc":
        return filtered.filter(s => {
          const r = radarMap.get(s.symbol);
          if (!r) return false;
          return ["IGNITION","EARLY_ACC","STRONG_TREND"].includes(derivePhaseLabel(r));
        });
      case "bandar":
        return filtered.filter(s => {
          const r = radarMap.get(s.symbol);
          return r && r.bandarScore >= 65;
        });
      case "volume":
        return filtered.filter(s => s.vol50dPct >= 200);
      case "dist":
        return filtered.filter(s => {
          const r = radarMap.get(s.symbol);
          if (!r) return false;
          return ["DISTRIBUTION","EXHAUSTION"].includes(derivePhaseLabel(r));
        });
      default:
        return filtered;
    }
  }, [filtered, activePreset, radarMap]);

  // Reset pagination when filter/sort/search/preset changes
  React.useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, indexFilter, sortBy, activePreset]);

  const visibleStocks = useMemo(
    () => presetFiltered.slice(0, visibleCount),
    [presetFiltered, visibleCount],
  );

  const loadMore = React.useCallback(() => {
    setVisibleCount(c => Math.min(c + PAGE_SIZE, presetFiltered.length));
  }, [presetFiltered.length]);

  const sortLabel   = SORT_OPTS.find(o => o.val === sortBy)?.label ?? "Sort";
  const radarReady  = radar.length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ height: topPadding, backgroundColor: colors.background }} />

      <FlatList
        data={visibleStocks}
        keyExtractor={item => item.symbol}
        renderItem={({ item }) => <StockCard ms={item} colors={colors} />}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 90 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          visibleCount < presetFiltered.length ? (
            <TouchableOpacity
              onPress={loadMore}
              style={{
                marginHorizontal: 16, marginVertical: 12,
                paddingVertical: 12, borderRadius: 12,
                backgroundColor: colors.card,
                borderWidth: 1, borderColor: colors.border,
                alignItems: "center",
              }}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
                Muat lebih banyak ({presetFiltered.length - visibleCount} saham lagi)
              </Text>
            </TouchableOpacity>
          ) : presetFiltered.length > 0 ? (
            <Text style={{ color: "#475569", fontSize: 11, textAlign: "center",
              paddingVertical: 16, paddingBottom: 24 }}>
              ✓ {presetFiltered.length} saham ditampilkan
            </Text>
          ) : null
        }
        ListHeaderComponent={
          <>
            {/* [1] Header */}
            <HomeHeader stocks={stocks} radar={radar} />

            {/* [2] Command Center — live market intel */}
            <View style={{ backgroundColor: "#0f1629", paddingTop: 16, paddingBottom: 8 }}>
              <CommandCenter radar={radar} loading={loadingRadar} sectors={sectorStats} />
            </View>

            {/* [3]-[6] Smart sections — from radar */}
            {radarReady ? (
              <View style={{ backgroundColor: "#0f1629", paddingTop: 8 }}>
                <SignalSnapshotSection radar={radar} />
                <PhaseDistributionSection radar={radar} />
                <SentimenGlobalCard />
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
              <View style={{ flexDirection: "row", alignItems: "baseline",
                justifyContent: "space-between", marginBottom: 10 }}>
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>
                  Semua Saham
                </Text>
                <Text style={{ color: "#475569", fontSize: 11 }}>
                  {presetFiltered.length} dari {filtered.length} saham
                </Text>
              </View>

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

                  {/* Smart preset filters */}
                  {radarReady && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingTop: 10, paddingBottom: 2 }}>
                      {PRESETS.map(p => {
                        const active = activePreset === p.key;
                        return (
                          <TouchableOpacity key={p.key}
                            onPress={() => setActivePreset(active ? null : p.key)}
                            style={{
                              flexDirection: "row", alignItems: "center", gap: 4,
                              paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20,
                              backgroundColor: active ? p.bg : colors.card,
                              borderWidth: 1,
                              borderColor: active ? p.color : colors.border,
                            }}>
                            <Text style={{ fontSize: 11 }}>{p.icon}</Text>
                            <Text style={{
                              color: active ? p.color : colors.mutedForeground,
                              fontSize: 11, fontWeight: active ? "700" : "500",
                            }}>{p.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {/* Index + sort filters */}
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
                    {visibleCount < filtered.length
                      ? `${visibleCount} dari ${filtered.length.toLocaleString("id-ID")} saham`
                      : `${filtered.length.toLocaleString("id-ID")} saham`}
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
