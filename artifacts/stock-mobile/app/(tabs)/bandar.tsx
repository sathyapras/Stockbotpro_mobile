import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  type RadarMarket,
  bandarDetector,
  fetchRadarMarket,
  formatNBS,
  getBandarStrength,
  getFlowLabel,
  smartMoneyIn,
  vwapInterpretation,
} from "@/services/radarMarketService";

// ─── Filter tabs ──────────────────────────────────────────────

type FilterTab = "ALL" | "ACC" | "DIST" | "SMI";

const FILTER_TABS: { key: FilterTab; label: string; emoji: string }[] = [
  { key: "ALL",  label: "Semua",          emoji: "📊" },
  { key: "ACC",  label: "Akumulasi",      emoji: "🟢" },
  { key: "DIST", label: "Distribusi",     emoji: "🔴" },
  { key: "SMI",  label: "Smart Money In", emoji: "💎" },
];

// ─── Signal color / icon ──────────────────────────────────────

function signalColor(sig: string) {
  if (sig === "Accumulation")  return "#34d399";
  if (sig === "Distribution")  return "#f87171";
  return "#94a3b8";
}

function signalIcon(sig: string) {
  if (sig === "Accumulation")  return "🟢";
  if (sig === "Distribution")  return "🔴";
  return "⚪";
}

// ─── Score bar ────────────────────────────────────────────────

function ScoreBar({ label, value, color, colors }: {
  label: string; value: number; color: string;
  colors: ReturnType<typeof useColors>;
}) {
  const w = Math.min(100, Math.max(0, value));
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{label}</Text>
        <Text style={{ color, fontWeight: "700", fontSize: 11 }}>{value.toFixed(0)}/100</Text>
      </View>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
        <View style={{ height: 5, width: `${w}%` as any, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ─── NBS mini grid ────────────────────────────────────────────

function NBSGrid({ item, colors }: { item: RadarMarket; colors: ReturnType<typeof useColors> }) {
  const periods = [
    { label: "1D",  value: item.nbs1d,  signal: item.signal1d },
    { label: "5D",  value: item.nbs5d,  signal: item.signal5d },
    { label: "10D", value: item.nbs10d, signal: item.signal10d },
  ];
  return (
    <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
      {periods.map(tf => {
        const fmt = formatNBS(tf.value);
        return (
          <View key={tf.label} style={{ flex: 1, backgroundColor: colors.background,
            borderRadius: 8, padding: 7, alignItems: "center",
            borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: "#64748b", fontSize: 9, fontWeight: "600" }}>{tf.label}</Text>
            <Text style={{ color: fmt.color, fontWeight: "800", fontSize: 12, marginTop: 2 }}>
              {fmt.text}
            </Text>
            <Text style={{ color: signalColor(tf.signal), fontSize: 9, marginTop: 2 }}>
              {signalIcon(tf.signal)}{" "}
              {tf.signal === "Accumulation" ? "ACC" : tf.signal === "Distribution" ? "DIST" : "NEU"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Bandar Card ──────────────────────────────────────────────

function BandarCard({ item }: { item: RadarMarket }) {
  const colors = useColors();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const flow  = getFlowLabel(item.flowState);
  const strength = getBandarStrength(item.signal1d, item.signal5d, item.signal10d);
  const vwapInfo = vwapInterpretation(item.close, item.vwapD1);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/stock/${item.ticker}` as any)}
      onLongPress={() => setExpanded(e => !e)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

      {/* Header row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 16 }}>
              {item.ticker}
            </Text>
            {/* Multi-TF strength badge */}
            <View style={{ backgroundColor: strength.color + "22", borderRadius: 6,
              paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: strength.color, fontSize: 9, fontWeight: "700" }}>
                {strength.label}
              </Text>
            </View>
            {/* Change % */}
            {item.chgPct !== 0 && (
              <Text style={{ color: item.chgPct > 0 ? "#34d399" : "#f87171",
                fontSize: 11, fontWeight: "700" }}>
                {item.chgPct > 0 ? "▲" : "▼"}{Math.abs(item.chgPct).toFixed(2)}%
              </Text>
            )}
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 1 }}
            numberOfLines={1}>{item.company}</Text>
        </View>

        {/* Flow State badge */}
        <View style={{ backgroundColor: flow.color + "22", borderRadius: 8,
          paddingHorizontal: 10, paddingVertical: 5, alignItems: "center",
          borderWidth: 1, borderColor: flow.color + "40", minWidth: 64 }}>
          <Text style={{ color: flow.color, fontWeight: "800", fontSize: 11 }}>{flow.short}</Text>
          <Text style={{ color: flow.color + "cc", fontSize: 8, marginTop: 1 }}>{item.flowState}</Text>
        </View>
      </View>

      {/* Price + VWAP row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ color: "#60a5fa", fontSize: 12, fontWeight: "600" }}>
          Harga: {item.close.toLocaleString("id-ID")}
        </Text>
        {item.vwapD1 > 0 && (
          <Text style={{ color: "#94a3b8", fontSize: 11 }}>
            VWAP 1D: <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {item.vwapD1.toLocaleString("id-ID")}
            </Text>
          </Text>
        )}
      </View>

      {/* VWAP interpretation */}
      {vwapInfo && (
        <Text style={{ color: vwapInfo.color, fontSize: 10, marginTop: 2 }}>{vwapInfo.text}</Text>
      )}

      {/* NBS 3-timeframe grid */}
      <NBSGrid item={item} colors={colors} />

      {/* Multi-TF strength icons */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
        <Text style={{ fontSize: 12 }}>{strength.icon}</Text>
        <Text style={{ color: strength.color, fontSize: 10, fontWeight: "700" }}>
          {strength.label}
        </Text>
        {item.rsMom !== 0 && (
          <Text style={{ color: "#64748b", fontSize: 10, marginLeft: "auto" }}>
            RS Mom: <Text style={{ color: item.rsMom > 0 ? "#34d399" : "#f87171",
              fontWeight: "600" }}>
              {item.rsMom > 0 ? "+" : ""}{item.rsMom.toFixed(1)}
            </Text>
          </Text>
        )}
      </View>

      {/* Expanded section (long-press) */}
      {expanded && (
        <View style={{ marginTop: 8, gap: 6, borderTopWidth: 1,
          borderTopColor: colors.border, paddingTop: 8 }}>
          <ScoreBar label="Bandar Score" value={item.bandarScore} color="#60a5fa" colors={colors} />
          <ScoreBar label="Trend Score"  value={item.trendScore}  color="#a78bfa" colors={colors} />
          {item.harmonyStr > 0 && (
            <ScoreBar label="Harmony Str" value={item.harmonyStr} color="#fbbf24" colors={colors} />
          )}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            {item.vwap5dAvg > 0 && (
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#64748b", fontSize: 9 }}>VWAP 5D Avg</Text>
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
                  {item.vwap5dAvg.toLocaleString("id-ID")}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#64748b", fontSize: 9 }}>Volume (Miliar)</Text>
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
                {item.toRpBn.toFixed(1)}B
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#64748b", fontSize: 9 }}>Perf 10D</Text>
              <Text style={{ color: item.perf10d >= 0 ? "#34d399" : "#f87171",
                fontWeight: "700", fontSize: 12 }}>
                {item.perf10d >= 0 ? "+" : ""}{item.perf10d.toFixed(1)}%
              </Text>
            </View>
          </View>
          {item.narrative ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontStyle: "italic" }}>
              {item.narrative}
            </Text>
          ) : null}
        </View>
      )}

      {/* Tap hint */}
      <Text style={{ color: "#334155", fontSize: 9, marginTop: 4, textAlign: "right" }}>
        Tap → detail · Long press → detail bandar
      </Text>
    </TouchableOpacity>
  );
}

// ─── Summary stats bar ────────────────────────────────────────

function SummaryBar({ data, colors }: { data: RadarMarket[]; colors: ReturnType<typeof useColors> }) {
  const acc  = data.filter(r => r.signal1d === "Accumulation").length;
  const dist = data.filter(r => r.signal1d === "Distribution").length;
  const neu  = data.length - acc - dist;
  return (
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
      <View style={{ flex: 1, backgroundColor: "#34d39918", borderRadius: 8,
        borderWidth: 1, borderColor: "#34d39930", padding: 8, alignItems: "center" }}>
        <Text style={{ color: "#34d399", fontWeight: "800", fontSize: 16 }}>{acc}</Text>
        <Text style={{ color: "#64748b", fontSize: 9 }}>Akumulasi</Text>
      </View>
      <View style={{ flex: 1, backgroundColor: "#f8717118", borderRadius: 8,
        borderWidth: 1, borderColor: "#f8717130", padding: 8, alignItems: "center" }}>
        <Text style={{ color: "#f87171", fontWeight: "800", fontSize: 16 }}>{dist}</Text>
        <Text style={{ color: "#64748b", fontSize: 9 }}>Distribusi</Text>
      </View>
      <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 8,
        borderWidth: 1, borderColor: colors.border, padding: 8, alignItems: "center" }}>
        <Text style={{ color: colors.mutedForeground, fontWeight: "800", fontSize: 16 }}>{neu}</Text>
        <Text style={{ color: "#64748b", fontSize: 9 }}>Netral</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────

export default function BandarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top + 8;

  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [search, setSearch]       = useState("");

  const { data: radarAll = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["radar-market"],
    queryFn:  fetchRadarMarket,
    staleTime: 60 * 60 * 1000,
    gcTime:    2 * 60 * 60 * 1000,
  });

  // Top 40 by |nbs1d|
  const top40 = useMemo(() => bandarDetector(radarAll, 40), [radarAll]);

  // Smart Money In list (all 3 TF positive, unlimited)
  const smiList = useMemo(() => smartMoneyIn(radarAll), [radarAll]);

  const filtered = useMemo(() => {
    let base: RadarMarket[];
    if (filterTab === "ACC")  base = top40.filter(r => r.signal1d === "Accumulation");
    else if (filterTab === "DIST") base = top40.filter(r => r.signal1d === "Distribution");
    else if (filterTab === "SMI")  base = smiList;
    else                           base = top40;

    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(r =>
      r.ticker.toLowerCase().includes(q) || r.company.toLowerCase().includes(q)
    );
  }, [top40, smiList, filterTab, search]);

  const counts = useMemo(() => ({
    ALL:  top40.length,
    ACC:  top40.filter(r => r.signal1d === "Accumulation").length,
    DIST: top40.filter(r => r.signal1d === "Distribution").length,
    SMI:  smiList.length,
  }), [top40, smiList]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Bandar Detector</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Net Buy/Sell · VWAP Bandar · Smart Money Flow
        </Text>

        {/* Summary bar (only when data loaded) */}
        {radarAll.length > 0 && !isLoading && (
          <SummaryBar data={radarAll} colors={colors} />
        )}

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, marginRight: 6 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cari ticker atau nama..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="characters"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={{ color: colors.mutedForeground, fontSize: 16, paddingLeft: 6 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <View style={styles.tabRow}>
          {FILTER_TABS.map(t => {
            const active = filterTab === t.key;
            const tabColor = t.key === "ACC" ? "#34d399" : t.key === "DIST" ? "#f87171"
              : t.key === "SMI" ? "#a78bfa" : colors.primary;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabChip, {
                  backgroundColor: active ? tabColor + "22" : colors.card,
                  borderColor: active ? tabColor : colors.border,
                }]}
                onPress={() => setFilterTab(t.key)}>
                <Text style={[styles.tabChipText, { color: active ? tabColor : colors.mutedForeground }]}>
                  {t.emoji}
                </Text>
                <Text style={[styles.tabChipCount, { color: active ? tabColor : colors.mutedForeground }]}>
                  {counts[t.key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section title */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {FILTER_TABS.find(t => t.key === filterTab)?.emoji}{" "}
            {FILTER_TABS.find(t => t.key === filterTab)?.label}
            {"  "}<Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: "400" }}>
              {filtered.length} saham
            </Text>
          </Text>
          {filterTab === "SMI" && (
            <Text style={{ color: "#a78bfa", fontSize: 10 }}>NBS 1D+5D+10D positif</Text>
          )}
          {filterTab === "ALL" && (
            <Text style={{ color: "#64748b", fontSize: 10 }}>Top 40 by aktivitas</Text>
          )}
        </View>
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Memuat data Bandar Detector...
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 32 }}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Gagal memuat data. Periksa koneksi.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => r.ticker}
          renderItem={({ item }) => <BandarCard item={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
              <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
                Tidak ada saham ditemukan
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5, marginBottom: 2 },
  subtitle: { fontSize: 12, marginBottom: 10 },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  tabRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  tabChip: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    paddingVertical: 6, alignItems: "center", gap: 1,
  },
  tabChipText:  { fontSize: 13 },
  tabChipCount: { fontSize: 10, fontWeight: "700" },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 24, gap: 8, minHeight: 300,
  },
  loadingText: { fontSize: 13, marginTop: 8, textAlign: "center" },
  errorText:   { fontSize: 14, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
});
