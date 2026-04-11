import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { MenuButton } from "@/components/MenuButton";
import { SkeletonListScreen } from "@/components/SkeletonBox";
import { hapticLight } from "@/hooks/useHaptic";
import {
  type RadarMarket,
  fetchRadarMarket,
} from "@/services/radarMarketService";
import { AppSettings, fetchSettings } from "@/services/settingsService";

// ─── Types ────────────────────────────────────────────────────

type IndexFilter = "LQ45" | "IDX30" | "JII30" | "KOMPAS100" | "COMPOSITE";
type FilterTab   = "all" | "acc" | "dist" | "smart";

// ─── Flow config ──────────────────────────────────────────────

function getFlowConfig(flowState: string): {
  label: string; color: string; bg: string; dot: string;
} {
  const fs = (flowState ?? "").toUpperCase();
  if (fs.includes("STRONG") && fs.includes("ACCUM")) return { label: "★ ACC",  color: "#10b981", bg: "#052e16", dot: "#10b981" };
  if (fs.includes("ACCUM"))                           return { label: "ACC",    color: "#34d399", bg: "#0a1f15", dot: "#34d399" };
  if (fs.includes("STRONG") && fs.includes("DIST"))  return { label: "★ DIST", color: "#dc2626", bg: "#2d0a0a", dot: "#dc2626" };
  if (fs.includes("DIST"))                            return { label: "DIST",   color: "#f87171", bg: "#1a0808", dot: "#f87171" };
  return                                               { label: "NEU",          color: "#64748b", bg: "#0f1629", dot: "#475569" };
}

function nbsSignal(val: number): { label: string; color: string } {
  if (val > 1)  return { label: "ACC",  color: "#34d399" };
  if (val < -1) return { label: "DIST", color: "#f87171" };
  return              { label: "NEU",  color: "#475569" };
}

// ─── Index filter helper ──────────────────────────────────────
// Uses real index lists from backend settings when available.
// Falls back to turnover-based approximation when settings not loaded.

function filterByIndex(
  radar: RadarMarket[],
  idx: IndexFilter,
  settings: AppSettings | undefined
): RadarMarket[] {
  const stockOnly = radar.filter(r =>
    r.ticker !== "COMPOSITE" && !r.ticker.startsWith("IDX")
  );

  if (idx === "COMPOSITE") return stockOnly;

  // Real list from settings
  const listMap: Record<Exclude<IndexFilter, "COMPOSITE">, keyof AppSettings> = {
    LQ45:     "lq45List",
    IDX30:    "idx30List",
    JII30:    "jii30List",
    KOMPAS100:"kompas100List",
  };

  const listKey = listMap[idx as Exclude<IndexFilter, "COMPOSITE">];
  const list = settings?.[listKey] as string[] | undefined;

  if (list && list.length > 0) {
    const set = new Set(list.map(t => t.toUpperCase()));
    const matched = stockOnly.filter(r => set.has(r.ticker.toUpperCase()));
    // If too few matched (data drift), fall back gracefully
    if (matched.length >= 5) return matched;
  }

  // Fallback: approximate by top-N turnover
  const sorted = [...stockOnly].sort((a, b) => b.toRpBn - a.toRpBn);
  const n = idx === "LQ45" ? 45 : idx === "IDX30" ? 30 : idx === "JII30" ? 30 : 100;
  return sorted.slice(0, n);
}

// ─── Summary bar ─────────────────────────────────────────────

function SummaryBar({ data }: { data: RadarMarket[] }) {
  const acc  = data.filter(r => (r.flowState ?? "").toUpperCase().includes("ACCUM")).length;
  const dist = data.filter(r => (r.flowState ?? "").toUpperCase().includes("DIST")).length;
  const neu  = data.length - acc - dist;
  return (
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
      {[
        { label: "Akumulasi", count: acc,  bg: "#052e16", border: "#16a34a", color: "#4ade80" },
        { label: "Distribusi",count: dist, bg: "#2d0a0a", border: "#dc2626", color: "#f87171" },
        { label: "Netral",    count: neu,  bg: "#0f1629", border: "#475569", color: "#94a3b8" },
      ].map(s => (
        <View key={s.label} style={{
          flex: 1, backgroundColor: s.bg, borderRadius: 10, padding: 10,
          borderWidth: 1, borderColor: s.border, alignItems: "center",
        }}>
          <Text style={{ color: s.color, fontWeight: "900", fontSize: 20 }}>{s.count}</Text>
          <Text style={{ color: s.color + "cc", fontSize: 9, marginTop: 2 }}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Flow Stock Card ──────────────────────────────────────────

function FlowStockCard({ item, rank }: { item: RadarMarket; rank: number }) {
  const router = useRouter();
  const colors = useColors();
  const flow   = getFlowConfig(item.flowState);
  const isUp   = item.chgPct >= 0;
  const chgColor = isUp ? "#34d399" : "#f87171";

  // VWAP gap
  const vwapGap   = item.vwapD1 > 0 && item.close > 0
    ? ((item.close - item.vwapD1) / item.vwapD1 * 100)
    : null;
  const aboveVwap = vwapGap !== null && vwapGap >= 0;

  // NBS timeframes
  const TF = [
    { label: "1D",  val: item.nbs1d  },
    { label: "5D",  val: item.nbs5d  },
    { label: "10D", val: item.nbs10d },
  ];

  return (
    <TouchableOpacity
      onPress={() => { hapticLight(); router.push(`/stock/${item.ticker}` as any); }}
      activeOpacity={0.8}
      style={{
        backgroundColor: colors.card, borderRadius: 12, padding: 14,
        borderLeftWidth: 3, borderLeftColor: flow.color,
      }}>

      {/* Row 1: Rank + Dot + Ticker + Badge + Change + NBS1D + Score */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, width: 20 }}>{rank}</Text>
        <View style={{ width: 8, height: 8, borderRadius: 4,
          backgroundColor: flow.dot, marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15 }}>{item.ticker}</Text>
            <View style={{ backgroundColor: flow.bg, borderRadius: 4,
              paddingHorizontal: 6, paddingVertical: 1,
              borderWidth: 1, borderColor: flow.color + "50" }}>
              <Text style={{ color: flow.color, fontSize: 9, fontWeight: "700" }}>{flow.label}</Text>
            </View>
            <Text style={{ color: chgColor, fontSize: 11 }}>
              {isUp ? "▲" : "▼"}{Math.abs(item.chgPct).toFixed(2)}%
            </Text>
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 10 }} numberOfLines={1}>{item.company}</Text>
        </View>
        {/* NBS 1D (right) */}
        <View style={{ alignItems: "flex-end", marginRight: 10 }}>
          <Text style={{ color: item.nbs1d >= 0 ? "#34d399" : "#f87171",
            fontWeight: "700", fontSize: 14 }}>
            {item.nbs1d >= 0 ? "+" : ""}{item.nbs1d.toFixed(1)}B
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>NBS 1D</Text>
        </View>
        {/* Score */}
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#a78bfa", fontWeight: "900", fontSize: 18 }}>
            {Math.round(item.bandarScore)}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>score</Text>
        </View>
      </View>

      {/* Row 2: VWAP interpretation */}
      {vwapGap !== null && (
        <Text style={{
          color: aboveVwap ? "#34d399" : "#f87171",
          fontSize: 11, fontWeight: "600", marginBottom: 8,
        }}>
          {aboveVwap ? "📈" : "📉"} Harga di {aboveVwap ? "atas" : "bawah"} rata-rata Big Money
          {" "}({vwapGap >= 0 ? "+" : ""}{vwapGap.toFixed(1)}%)
        </Text>
      )}

      {/* Row 3: NBS 1D / 5D / 10D boxes */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        {TF.map(tf => {
          const sig = nbsSignal(tf.val);
          const up  = tf.val >= 0;
          return (
            <View key={tf.label} style={{
              flex: 1, alignItems: "center",
              backgroundColor: colors.muted, borderRadius: 8, padding: 8,
            }}>
              <Text style={{ color: up ? "#34d399" : "#f87171",
                fontWeight: "700", fontSize: 13 }}>
                {up ? "+" : ""}{tf.val.toFixed(1)}B
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>{tf.label}</Text>
              <View style={{ width: 14, height: 14, borderRadius: 3,
                backgroundColor: sig.color, marginTop: 4 }} />
              <Text style={{ color: sig.color, fontSize: 8, marginTop: 2 }}>{sig.label}</Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

// ─── Index selector ────────────────────────────────────────────

const INDEX_OPTIONS: { key: IndexFilter; label: string }[] = [
  { key: "LQ45",      label: "LQ45" },
  { key: "IDX30",     label: "IDX30" },
  { key: "JII30",     label: "JII30" },
  { key: "KOMPAS100", label: "KOMPAS100" },
  { key: "COMPOSITE", label: "Semua" },
];

// ─── Main screen ──────────────────────────────────────────────

export default function BandarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === "web" ? 67 : insets.top + 8;

  const [indexFilter, setIndexFilter] = useState<IndexFilter>("LQ45");
  const [filterTab,   setFilterTab]   = useState<FilterTab>("all");
  const [search,      setSearch]      = useState("");

  // ── Data ──
  const { data: radarAll = [], isLoading: loadingRadar, isError,
          refetch, isFetching } = useQuery({
    queryKey: ["radar-market"],
    queryFn:  fetchRadarMarket,
    staleTime: 60 * 60 * 1000,
    gcTime:    2 * 60 * 60 * 1000,
  });

  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["app-settings"],
    queryFn:  fetchSettings,
    staleTime: 60 * 60 * 1000,
  });

  const isLoading = loadingRadar;

  // ── Apply index filter then sort by |nbs1d| ──
  const indexFiltered = useMemo(() => {
    const base = filterByIndex(radarAll, indexFilter, settings);
    return base.sort((a, b) => Math.abs(b.nbs1d) - Math.abs(a.nbs1d));
  }, [radarAll, indexFilter, settings]);

  // ── Smart Money = all 3 TF positive ──
  const smartList = useMemo(
    () => indexFiltered.filter(r => r.nbs1d > 0 && r.nbs5d > 0 && r.nbs10d > 0),
    [indexFiltered]
  );

  // ── Counts for filter tabs ──
  const counts = useMemo(() => ({
    all:   indexFiltered.length,
    acc:   indexFiltered.filter(r => (r.flowState ?? "").toUpperCase().includes("ACCUM")).length,
    dist:  indexFiltered.filter(r => (r.flowState ?? "").toUpperCase().includes("DIST")).length,
    smart: smartList.length,
  }), [indexFiltered, smartList]);

  const FILTER_TABS: { key: FilterTab; icon: string; label: string; color: string }[] = [
    { key: "all",   icon: "📊", label: "Semua",    color: "#94a3b8" },
    { key: "acc",   icon: "🟢", label: "Akumulasi",color: "#34d399" },
    { key: "dist",  icon: "🔴", label: "Distribusi",color: "#f87171"},
    { key: "smart", icon: "💎", label: "Smart",    color: "#a78bfa" },
  ];

  // ── Final filtered list ──
  const filtered = useMemo(() => {
    let base: RadarMarket[];
    switch (filterTab) {
      case "acc":   base = indexFiltered.filter(r => (r.flowState ?? "").toUpperCase().includes("ACCUM")); break;
      case "dist":  base = indexFiltered.filter(r => (r.flowState ?? "").toUpperCase().includes("DIST")); break;
      case "smart": base = smartList; break;
      default:      base = indexFiltered;
    }
    if (!search.trim()) return base;
    const q = search.toUpperCase();
    return base.filter(r =>
      r.ticker.includes(q) || r.company.toUpperCase().includes(q)
    );
  }, [indexFiltered, smartList, filterTab, search]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View style={{ paddingTop: topPadding, paddingHorizontal: 16, paddingBottom: 8 }}>
        {/* Title row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: 10 }}>
          <View>
            <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 20 }}>📊 Buy/Sell Flow</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 1 }}>
              Net Buy/Sell · VWAP · Flow Signal
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push("/market-intel" as any)}
              style={{ backgroundColor: colors.card, borderRadius: 8,
                borderWidth: 1, borderColor: colors.border,
                paddingHorizontal: 10, paddingVertical: 6,
                flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 12 }}>🔭</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Intel</Text>
            </TouchableOpacity>
            <MenuButton />
          </View>
        </View>

        {/* Index selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ flexShrink: 0 }}
          contentContainerStyle={{ gap: 6, paddingVertical: 6, paddingHorizontal: 4, alignItems: "center", flexDirection: "row" }}>
          {INDEX_OPTIONS.map(opt => {
            const active = indexFilter === opt.key;
            return (
              <TouchableOpacity key={opt.key}
                onPress={() => setIndexFilter(opt.key)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
                  backgroundColor: active ? "#60a5fa25" : colors.card,
                  borderWidth: 1, borderColor: active ? "#60a5fa" : colors.border,
                  alignSelf: "flex-start",
                }}>
                <Text style={{ color: active ? "#60a5fa" : colors.mutedForeground,
                  fontSize: 12, fontWeight: active ? "700" : "400" }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Summary bar */}
        {!isLoading && indexFiltered.length > 0 && (
          <SummaryBar data={indexFiltered} />
        )}

        {/* Search */}
        <View style={{ flexDirection: "row", alignItems: "center",
          backgroundColor: colors.card, borderRadius: 10,
          borderWidth: 1, borderColor: colors.border,
          paddingHorizontal: 12, marginBottom: 10 }}>
          <Text style={{ color: colors.mutedForeground, marginRight: 8 }}>🔍</Text>
          <TextInput
            placeholder="Cari ticker atau nama..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, color: colors.foreground, fontSize: 13, paddingVertical: 10 }}
            autoCapitalize="characters"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={{ color: colors.mutedForeground, fontSize: 16, paddingLeft: 6 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ flexShrink: 0 }}
          contentContainerStyle={{ gap: 6, paddingVertical: 6, paddingHorizontal: 4, alignItems: "center", flexDirection: "row" }}>
          {FILTER_TABS.map(tab => {
            const active = filterTab === tab.key;
            return (
              <TouchableOpacity key={tab.key}
                onPress={() => setFilterTab(tab.key)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 4,
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: active ? tab.color + "25" : colors.card,
                  borderWidth: 1, borderColor: active ? tab.color : colors.border,
                  alignSelf: "flex-start",
                }}>
                <Text style={{ fontSize: 12 }}>{tab.icon}</Text>
                <Text style={{ color: active ? tab.color : colors.mutedForeground,
                  fontSize: 11, fontWeight: active ? "700" : "400" }}>
                  {tab.label} {counts[tab.key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <SkeletonListScreen count={6} />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 32 }}>⚠️</Text>
          <Text style={{ color: "#64748b", fontSize: 14, textAlign: "center" }}>
            Gagal memuat data. Periksa koneksi.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: "#60a5fa", borderRadius: 10,
              paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 }}
            onPress={() => refetch()}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => r.ticker}
          renderItem={({ item, index }) => (
            <FlowStockCard item={item} rank={index + 1} />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4,
            paddingBottom: insets.bottom + 80, gap: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => refetch()}
              tintColor="#60a5fa"
            />
          }
          ListHeaderComponent={
            <View style={{ flexDirection: "row", justifyContent: "space-between",
              alignItems: "center", marginBottom: 6 }}>
              <Text style={{ color: "#64748b", fontSize: 12 }}>
                {FILTER_TABS.find(t => t.key === filterTab)?.icon}{" "}
                {FILTER_TABS.find(t => t.key === filterTab)?.label}
                {" · "}{filtered.length} saham
              </Text>
              {filterTab === "all" && (
                <Text style={{ color: "#475569", fontSize: 10 }}>
                  Diurutkan: |NBS| terbesar
                </Text>
              )}
              {filterTab === "smart" && (
                <Text style={{ color: "#a78bfa", fontSize: 10 }}>
                  NBS 1D+5D+10D positif
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
              <Text style={{ color: "#64748b", textAlign: "center" }}>
                {search ? `Tidak ditemukan: "${search}"` : "Tidak ada data"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 24, gap: 8, minHeight: 300,
  },
});
