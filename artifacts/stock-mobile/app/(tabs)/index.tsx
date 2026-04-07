import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StockRow } from "@/components/StockRow";
import { useColors } from "@/hooks/useColors";
import {
  MasterStock,
  SortKey,
  StockFilter,
  calcBreadth,
  fetchMasterStock,
  filterStocks,
  fmtValueBn,
  getIndexBadges,
  getTopGainersList,
  getTopLosersList,
  masterToStock,
  sortStocks,
} from "@/services/masterStockService";

// ─── MoverCard ────────────────────────────────────────────────

function MoverCard({ ms, colors }: {
  ms: MasterStock;
  colors: ReturnType<typeof useColors>;
}) {
  const isUp = ms.changePercent >= 0;
  const chgColor = isUp ? "#34d399" : "#f87171";
  const badges = getIndexBadges(ms.indexCategory);

  return (
    <TouchableOpacity
      style={[styles.moverCard, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/stock/${ms.symbol}` as never)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <View style={[styles.moverCodeBadge, { backgroundColor: chgColor + "22" }]}>
          <Text style={[styles.moverCode, { color: chgColor }]}>{ms.symbol}</Text>
        </View>
        {badges.slice(0, 1).map((b) => (
          <View key={b.label} style={{ paddingHorizontal: 4, paddingVertical: 1,
            borderRadius: 3, backgroundColor: b.color + "25" }}>
            <Text style={{ color: b.color, fontSize: 7, fontWeight: "700" }}>{b.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.moverName, { color: colors.mutedForeground }]} numberOfLines={1}>
        {(ms.name || ms.symbol).split(" ").slice(0, 2).join(" ")}
      </Text>
      <Text style={[styles.moverPrice, { color: colors.foreground }]}>
        {ms.close.toLocaleString("id-ID")}
      </Text>
      <Text style={[styles.moverChange, { color: chgColor }]}>
        {isUp ? "▲" : "▼"} {Math.abs(ms.changePercent).toFixed(2)}%
      </Text>
    </TouchableOpacity>
  );
}

// ─── Market breadth bar ───────────────────────────────────────

function BreadthBar({ adv, unch, dec, totalValueT, colors }: {
  adv: number; unch: number; dec: number;
  totalValueT: string;
  colors: ReturnType<typeof useColors>;
}) {
  const total = adv + unch + dec || 1;
  const advPct = Math.round((adv / total) * 100);
  const decPct = Math.round((dec / total) * 100);

  return (
    <View style={[styles.breadthCard, { backgroundColor: colors.card }]}>
      {/* Counts */}
      <View style={styles.breadthRow}>
        <View style={styles.breadthItem}>
          <Text style={[styles.breadthNum, { color: "#34d399" }]}>{adv}</Text>
          <Text style={[styles.breadthLabel, { color: colors.mutedForeground }]}>Naik</Text>
        </View>
        <View style={[styles.breadthDivider, { backgroundColor: colors.border }]} />
        <View style={styles.breadthItem}>
          <Text style={[styles.breadthNum, { color: "#94a3b8" }]}>{unch}</Text>
          <Text style={[styles.breadthLabel, { color: colors.mutedForeground }]}>Stagnan</Text>
        </View>
        <View style={[styles.breadthDivider, { backgroundColor: colors.border }]} />
        <View style={styles.breadthItem}>
          <Text style={[styles.breadthNum, { color: "#f87171" }]}>{dec}</Text>
          <Text style={[styles.breadthLabel, { color: colors.mutedForeground }]}>Turun</Text>
        </View>
      </View>

      {/* Visual bar */}
      <View style={{ height: 8, borderRadius: 4, overflow: "hidden",
        flexDirection: "row", marginTop: 10 }}>
        <View style={{ flex: adv, backgroundColor: "#34d399" }} />
        <View style={{ flex: unch, backgroundColor: "#94a3b820" }} />
        <View style={{ flex: dec, backgroundColor: "#f87171" }} />
      </View>

      {/* % + value */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ color: "#34d399", fontSize: 10, fontWeight: "700" }}>
          {advPct}% Naik
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
          Nilai: Rp {totalValueT}T
        </Text>
        <Text style={{ color: "#f87171", fontSize: 10, fontWeight: "700" }}>
          {decPct}% Turun
        </Text>
      </View>
    </View>
  );
}

// ─── Sort + Filter toolbar ────────────────────────────────────

const INDEX_OPTS: { label: string; val: StockFilter["index"] }[] = [
  { label: "Semua", val: "" },
  { label: "LQ45", val: "LQ45" },
  { label: "KOMPAS100", val: "KOMPAS100" },
  { label: "JII30", val: "JII30" },
];

const SORT_OPTS: { label: string; val: SortKey }[] = [
  { label: "% Naik ▼", val: "change_desc" },
  { label: "% Turun ▼", val: "change_asc" },
  { label: "Volume", val: "volume_desc" },
  { label: "Nilai", val: "value_desc" },
  { label: "Mkt Cap", val: "cap_desc" },
  { label: "10D Return", val: "ret10d" },
  { label: "A–Z", val: "alpha" },
];

// ─── Stock card for list (with master data) ───────────────────

function MasterStockCard({ ms, colors }: {
  ms: MasterStock;
  colors: ReturnType<typeof useColors>;
}) {
  const isUp = ms.changePercent >= 0;
  const chgColor = isUp ? "#34d399" : "#f87171";
  const badges = getIndexBadges(ms.indexCategory);
  const volRatio = ms.vol50dPct;

  return (
    <TouchableOpacity
      style={[styles.stockCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      onPress={() => router.push(`/stock/${ms.symbol}` as never)}
      activeOpacity={0.7}
    >
      {/* Left */}
      <View style={styles.stockCardLeft}>
        <View style={[styles.codeBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.stockCode, { color: colors.primary }]}>{ms.symbol}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={[styles.stockName, { color: colors.foreground }]} numberOfLines={1}>
              {ms.name || ms.symbol}
            </Text>
          </View>
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
            Vol: {ms.volume >= 1_000_000
              ? `${(ms.volume / 1_000_000).toFixed(1)}M`
              : ms.volume >= 1_000
              ? `${(ms.volume / 1_000).toFixed(0)}K`
              : String(ms.volume)}
            {volRatio >= 150 && (
              <Text style={{ color: "#fbbf24" }}> ★{Math.round(volRatio)}%</Text>
            )}
            {"  "}Nilai: {fmtValueBn(ms.value)}
          </Text>
        </View>
      </View>

      {/* Right */}
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
          <Text style={{ color: ms.return10d > 0 ? "#34d39980" : "#f8717180",
            fontSize: 9 }}>
            10D: {ms.return10d > 0 ? "+" : ""}{ms.return10d.toFixed(1)}%
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────

export default function MarketScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [indexFilter, setIndexFilter] = useState<StockFilter["index"]>("");
  const [sortBy, setSortBy] = useState<SortKey>("change_desc");
  const [showSortPicker, setShowSortPicker] = useState(false);

  const { data: stocks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["master-stock"],
    queryFn: fetchMasterStock,
    staleTime: 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
    retry: 2,
  });

  const breadth = useMemo(() => calcBreadth(stocks), [stocks]);
  const gainers = useMemo(() => getTopGainersList(stocks, 8), [stocks]);
  const losers  = useMemo(() => getTopLosersList(stocks, 8), [stocks]);

  const filtered = useMemo(() => {
    const f = filterStocks(stocks, { search: query, index: indexFilter });
    return sortStocks(f, sortBy);
  }, [stocks, query, indexFilter, sortBy]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top + 8;
  const sortLabel = SORT_OPTS.find(o => o.val === sortBy)?.label ?? "Sort";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <View>
            <Image
              source={require("@/assets/images/logo-stockbot.png")}
              resizeMode="contain"
              style={{ width: 130, height: 28 }}
            />
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long", day: "numeric", month: "long",
              })}
              {stocks.length > 0 && ` · ${stocks.length.toLocaleString("id-ID")} saham`}
            </Text>
          </View>
          <View style={[styles.liveTag, { backgroundColor: isLoading ? "#fbbf2422" : "#34d39922" }]}>
            <View style={[styles.liveDot, { backgroundColor: isLoading ? "#fbbf24" : "#34d399" }]} />
            <Text style={[styles.liveText, { color: isLoading ? "#fbbf24" : "#34d399" }]}>
              {isLoading ? "LOADING" : "LIVE"}
            </Text>
          </View>
        </View>

        {/* Market Breadth */}
        {isError ? (
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "#f8717140",
            padding: 14, backgroundColor: "#f8717110", gap: 8 }}>
            <Text style={{ color: "#f87171", fontWeight: "700" }}>⚠️ Gagal memuat data Master</Text>
            <TouchableOpacity onPress={() => refetch()}
              style={{ backgroundColor: "#f87171", borderRadius: 8, padding: 8, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View style={{ borderRadius: 12, padding: 24,
            backgroundColor: colors.card, alignItems: "center" }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.mutedForeground, marginTop: 8, fontSize: 12 }}>
              Memuat data {breadth.total > 0 ? breadth.total.toLocaleString("id-ID") : ""} saham IDX…
            </Text>
          </View>
        ) : (
          <BreadthBar
            adv={breadth.advancers}
            unch={breadth.unchanged}
            dec={breadth.decliners}
            totalValueT={breadth.totalValueT}
            colors={colors}
          />
        )}
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.symbol}
        renderItem={({ item }) => <MasterStockCard ms={item} colors={colors} />}
        ListHeaderComponent={
          <>
            {/* Gainers / Losers */}
            {gainers.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  🚀 Top Gainers
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.moversRow}>
                  {gainers.map(s => <MoverCard key={s.symbol} ms={s} colors={colors} />)}
                </ScrollView>
              </View>
            )}

            {losers.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  📉 Top Losers
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.moversRow}>
                  {losers.map(s => <MoverCard key={s.symbol} ms={s} colors={colors} />)}
                </ScrollView>
              </View>
            )}

            {/* Search + Filters */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
              borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 10 }]}>
                Semua Saham
              </Text>

              {/* Search bar */}
              <View style={[styles.searchBar, { backgroundColor: colors.card,
                borderColor: colors.border }]}>
                <Feather name="search" size={14} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
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

              {/* Index filter chips */}
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

                {/* Sort button */}
                <TouchableOpacity
                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary,
                    flexDirection: "row", alignItems: "center", gap: 4 }}
                  onPress={() => setShowSortPicker(!showSortPicker)}>
                  <Feather name="sliders" size={11} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>
                    {sortLabel}
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Sort picker */}
              {showSortPicker && (
                <View style={{ marginTop: 8, borderRadius: 10, borderWidth: 1,
                  borderColor: colors.border, backgroundColor: colors.card,
                  overflow: "hidden" }}>
                  {SORT_OPTS.map(o => (
                    <TouchableOpacity key={o.val}
                      style={{ padding: 10, borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                        backgroundColor: sortBy === o.val ? colors.primary + "15" : "transparent" }}
                      onPress={() => { setSortBy(o.val); setShowSortPicker(false); }}>
                      <Text style={{ color: sortBy === o.val ? colors.primary : colors.foreground,
                        fontWeight: sortBy === o.val ? "700" : "400", fontSize: 13 }}>
                        {o.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Result count */}
              <Text style={{ color: colors.mutedForeground, fontSize: 10,
                marginTop: 8, textAlign: "right" }}>
                {filtered.length.toLocaleString("id-ID")} saham ditampilkan
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyState}>
              <Feather name="search" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Tidak ditemukan: "{query}"
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 90 }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1e2433",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  breadthCard: {
    borderRadius: 14,
    padding: 14,
  },
  breadthRow: {
    flexDirection: "row",
  },
  breadthItem: {
    flex: 1,
    alignItems: "center",
  },
  breadthNum: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  breadthLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  breadthDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  section: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    marginBottom: 10,
  },
  moversRow: {
    gap: 8,
    paddingBottom: 4,
  },
  moverCard: {
    width: 110,
    padding: 10,
    borderRadius: 12,
  },
  moverCodeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  moverCode: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  moverName: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  moverPrice: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  moverChange: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  stockCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  stockCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 4,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 52,
    alignItems: "center",
  },
  stockCode: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  stockName: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
});
