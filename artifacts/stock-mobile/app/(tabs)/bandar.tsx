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

const FILTER_TABS: { key: FilterTab; icon: string; label: string; color: string }[] = [
  { key: "ALL",  icon: "📊", label: "Semua",       color: "#60a5fa" },
  { key: "ACC",  icon: "🟢", label: "Akumulasi",   color: "#34d399" },
  { key: "DIST", icon: "🔴", label: "Distribusi",  color: "#f87171" },
  { key: "SMI",  icon: "💎", label: "Smart Money", color: "#a78bfa" },
];

// ─── Signal helpers ───────────────────────────────────────────

function signalColor(sig: string) {
  if (sig === "Accumulation")  return "#34d399";
  if (sig === "Distribution")  return "#f87171";
  return "#475569";
}

// ─── Fix 5: Colored TF indicator boxes ───────────────────────

function TimeframeDots({ signal1d, signal5d, signal10d }: {
  signal1d: string; signal5d: string; signal10d: string;
}) {
  const strength = getBandarStrength(signal1d, signal5d, signal10d);
  const tfs = [
    { label: "1D", signal: signal1d },
    { label: "5D", signal: signal5d },
    { label: "10D", signal: signal10d },
  ];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {tfs.map(tf => (
        <View key={tf.label} style={{ alignItems: "center", gap: 2 }}>
          <View style={{
            width: 14, height: 14, borderRadius: 3,
            backgroundColor: signalColor(tf.signal),
          }} />
          <Text style={{ color: "#475569", fontSize: 8 }}>{tf.label}</Text>
        </View>
      ))}
      <Text style={{ color: strength.color, fontSize: 10, fontWeight: "700", marginLeft: 4 }}>
        {strength.label}
      </Text>
    </View>
  );
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
        const sigColor = signalColor(tf.signal);
        return (
          <View key={tf.label} style={{ flex: 1, backgroundColor: colors.background,
            borderRadius: 8, padding: 7, alignItems: "center",
            borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: "#64748b", fontSize: 9, fontWeight: "600" }}>{tf.label}</Text>
            <Text style={{ color: fmt.color, fontWeight: "800", fontSize: 12, marginTop: 2 }}>
              {fmt.text}
            </Text>
            <Text style={{ color: sigColor, fontSize: 9, marginTop: 2 }}>
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

  const flow     = getFlowLabel(item.flowState);
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

      {/* Fix 3: VWAP interpretation — bold + icon + diff amount */}
      {vwapInfo && (
        <Text style={{ color: vwapInfo.color, fontSize: 11, fontWeight: "600", marginTop: 4 }}>
          {vwapInfo.icon} {vwapInfo.text}
        </Text>
      )}

      {/* NBS 3-timeframe grid */}
      <NBSGrid item={item} colors={colors} />

      {/* Fix 5: Colored TF dots + strength label */}
      <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TimeframeDots signal1d={item.signal1d} signal5d={item.signal5d} signal10d={item.signal10d} />
        {item.rsMom !== 0 && (
          <Text style={{ color: "#64748b", fontSize: 10 }}>
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

// ─── Fix 2: Summary bar with better colors ────────────────────

const SUMMARY_CARDS = [
  { key: "acc",  label: "Akumulasi", bgColor: "#052e16", borderColor: "#16a34a", textColor: "#4ade80" },
  { key: "dist", label: "Distribusi", bgColor: "#2d0a0a", borderColor: "#dc2626", textColor: "#f87171" },
  { key: "neu",  label: "Netral", bgColor: "#0f1629", borderColor: "#475569", textColor: "#94a3b8" },
] as const;

function SummaryBar({ data }: { data: RadarMarket[] }) {
  const acc  = data.filter(r => r.signal1d === "Accumulation").length;
  const dist = data.filter(r => r.signal1d === "Distribution").length;
  const neu  = data.length - acc - dist;
  const counts = { acc, dist, neu };
  return (
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
      {SUMMARY_CARDS.map(card => (
        <View key={card.key} style={{
          flex: 1, padding: 10, borderRadius: 10,
          backgroundColor: card.bgColor,
          borderWidth: 1, borderColor: card.borderColor,
          alignItems: "center",
        }}>
          <Text style={{ color: card.textColor, fontSize: 22, fontWeight: "900" }}>
            {counts[card.key]}
          </Text>
          <Text style={{ color: card.textColor + "cc", fontSize: 9, marginTop: 2 }}>
            {card.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────

export default function BandarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === "web" ? 67 : insets.top + 8;

  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [search, setSearch]       = useState("");

  const { data: radarAll = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["radar-market"],
    queryFn:  fetchRadarMarket,
    staleTime: 60 * 60 * 1000,
    gcTime:    2 * 60 * 60 * 1000,
  });

  const top40   = useMemo(() => bandarDetector(radarAll, 40), [radarAll]);
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Bandar Detector</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Net Buy/Sell · VWAP Bandar · Smart Money Flow
            </Text>
          </View>
          {/* Market Intel button */}
          <TouchableOpacity
            onPress={() => router.push("/market-intel" as any)}
            style={styles.intelBtn}>
            <Text style={styles.intelBtnText}>🔭 Intel</Text>
          </TouchableOpacity>
        </View>

        {/* Fix 2: Summary bar */}
        {radarAll.length > 0 && !isLoading && (
          <SummaryBar data={radarAll} />
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

        {/* Fix 1: Filter tabs with icon + label text + count */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
          {FILTER_TABS.map(t => {
            const active = filterTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setFilterTab(t.key)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: active ? t.color + "25" : colors.card,
                  borderWidth: 1,
                  borderColor: active ? t.color : colors.border,
                  flexDirection: "row", alignItems: "center", gap: 4,
                }}>
                <Text style={{ fontSize: 12 }}>{t.icon}</Text>
                <Text style={{ color: active ? t.color : colors.mutedForeground,
                  fontSize: 11, fontWeight: "600" }}>
                  {t.label} {counts[t.key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section title */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {FILTER_TABS.find(t => t.key === filterTab)?.icon}{" "}
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
  intelBtn: {
    backgroundColor: "#1e293b", borderRadius: 12, borderWidth: 1, borderColor: "#334155",
    paddingHorizontal: 10, paddingVertical: 6, marginTop: 2,
  },
  intelBtnText: { color: "#94a3b8", fontSize: 11, fontWeight: "600" },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
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
