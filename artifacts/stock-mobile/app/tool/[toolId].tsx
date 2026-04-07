import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  ScreenerStock,
  ToolId,
  fetchScreener,
  formatVol,
  getStrength,
  getToolDef,
  getToolResults,
} from "@/services/stockToolsService";

// ─── Sort options ─────────────────────────────────────────────

type SortId = "strength" | "change" | "volume" | "price" | "rs";

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "strength", label: "Kekuatan" },
  { id: "change",   label: "Perubahan" },
  { id: "volume",   label: "Volume" },
  { id: "price",    label: "Harga" },
  { id: "rs",       label: "RS" },
];

// ─── Strength bar ─────────────────────────────────────────────

function StrengthBar({
  strength,
  color,
}: {
  strength: number;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.strengthWrap}>
      <View style={styles.strengthRow}>
        <Text style={[styles.strengthLabel, { color: colors.mutedForeground }]}>
          Strength
        </Text>
        <Text
          style={[
            styles.strengthNum,
            {
              color:
                strength >= 80
                  ? "#a78bfa"
                  : strength >= 60
                  ? "#60a5fa"
                  : colors.mutedForeground,
            },
          ]}
        >
          {Math.round(strength)}
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(100, strength)}%` as any,
              backgroundColor:
                strength >= 80 ? "#a78bfa" : strength >= 60 ? "#60a5fa" : color,
            },
          ]}
        />
      </View>
    </View>
  );
}

// ─── Stock result card ────────────────────────────────────────

function StockResultCard({
  stock,
  toolColor,
  strength,
  onPress,
}: {
  stock: ScreenerStock;
  toolColor: string;
  strength: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const isUp = stock.chgPct >= 0;
  const volRatioPct = Math.round((stock.volRatio - 1) * 100);

  const signals: string[] = [];
  if (stock.commentary) {
    stock.commentary
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => signals.push(s));
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Row 1: ticker + price */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.cardTicker, { color: colors.foreground }]}>
            {stock.ticker}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
            RSI {stock.rsi.toFixed(0)} · BB {stock.bbPct.toFixed(0)}%
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.cardPrice, { color: colors.foreground }]}>
            {stock.close.toLocaleString("id-ID")}
          </Text>
          <Text style={[styles.cardChg, { color: isUp ? "#34d399" : "#f87171" }]}>
            {isUp ? "▲" : "▼"} {Math.abs(stock.chgPct).toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Row 2: volume + RS */}
      <View style={styles.metaRow}>
        <View style={[styles.metaChip, { backgroundColor: "#60a5fa18", borderColor: "#60a5fa30" }]}>
          <Text style={{ color: "#60a5fa", fontSize: 11, fontWeight: "600" }}>
            Vol: {formatVol(stock.volK)}
          </Text>
        </View>
        {stock.volRatio > 0 && (
          <View
            style={[
              styles.metaChip,
              {
                backgroundColor:
                  stock.volRatio >= 2 ? "#34d39918" : "#60a5fa10",
                borderColor:
                  stock.volRatio >= 2 ? "#34d39940" : "#60a5fa20",
              },
            ]}
          >
            <Text
              style={{
                color: stock.volRatio >= 2 ? "#34d399" : "#60a5fa",
                fontSize: 11,
                fontWeight: "600",
              }}
            >
              {stock.volRatio >= 2
                ? `${stock.volRatio.toFixed(1)}x avg`
                : `${volRatioPct > 0 ? "+" : ""}${volRatioPct}% avg`}
            </Text>
          </View>
        )}
        {stock.rs > 1 && (
          <View style={[styles.metaChip, { backgroundColor: "#fbbf2418", borderColor: "#fbbf2440" }]}>
            <Text style={{ color: "#fbbf24", fontSize: 11, fontWeight: "600" }}>
              RS {stock.rs.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Strength bar */}
      <StrengthBar strength={strength} color={toolColor} />

      {/* Signal chips from Commentary */}
      {signals.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {signals.map((s, i) => (
              <View
                key={i}
                style={[
                  styles.chip,
                  { backgroundColor: toolColor + "18", borderColor: toolColor + "40" },
                ]}
              >
                <Text style={[styles.chipText, { color: toolColor }]}>{s}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* MA proximity info */}
      {(stock.ma20 > 0 || stock.high52w > 0) && (
        <Text style={[styles.maInfo, { color: colors.mutedForeground }]}>
          {stock.ma20 > 0
            ? `MA20: ${stock.ma20.toLocaleString("id-ID")}`
            : ""}
          {stock.high52w > 0
            ? `  ·  52W High: ${stock.high52w.toLocaleString("id-ID")}`
            : ""}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────

export default function ToolResultScreen() {
  const { toolId } = useLocalSearchParams<{ toolId: ToolId }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [sort, setSort] = useState<SortId>("strength");

  const tool = getToolDef(toolId ?? "");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["stocktools-screener"],
    queryFn: fetchScreener,
    staleTime: 60 * 60 * 1000,
  });

  const results = useMemo(() => {
    if (!data || !toolId) return [];
    const base = getToolResults(data, toolId as ToolId);
    return [...base].sort((a, b) => {
      switch (sort) {
        case "change":   return Math.abs(b.chgPct) - Math.abs(a.chgPct);
        case "volume":   return b.volK - a.volK;
        case "price":    return b.close - a.close;
        case "rs":       return b.rs - a.rs;
        default:         return (
          getStrength(b, tool!) - getStrength(a, tool!)
        );
      }
    });
  }, [data, toolId, sort, tool]);

  const toolColor = tool?.color ?? "#60a5fa";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? 16 : insets.top + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backArrow, { color: colors.mutedForeground }]}>‹</Text>
          <Text style={[styles.backLabel, { color: colors.mutedForeground }]}>
            Stock Tools
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTitle}>
          <Text style={[styles.toolTitle, { color: toolColor }]}>
            {tool?.name ?? toolId}
          </Text>
          <Text style={[styles.toolDesc, { color: colors.mutedForeground }]}>
            {tool?.desc}
          </Text>
        </View>

        {/* Count summary */}
        {!isLoading && (
          <View style={[styles.countBanner, { backgroundColor: toolColor + "15", borderColor: toolColor + "40" }]}>
            <Text style={[styles.countBig, { color: toolColor }]}>{results.length}</Text>
            <Text style={[styles.countSub, { color: toolColor }]}>saham</Text>
          </View>
        )}

        {/* Sort bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortScroll}
        >
          <View style={styles.sortRow}>
            {SORT_OPTIONS.map((opt) => {
              const active = sort === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.sortChip,
                    {
                      backgroundColor: active ? toolColor + "20" : colors.card,
                      borderColor: active ? toolColor : colors.border,
                    },
                  ]}
                  onPress={() => setSort(opt.id)}
                >
                  <Text
                    style={[
                      styles.sortChipText,
                      { color: active ? toolColor : colors.mutedForeground },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={toolColor} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Mengambil data screener...
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 32 }}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Gagal memuat data. Cek koneksi.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: toolColor }]}
            onPress={() => refetch()}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(s) => s.ticker}
          renderItem={({ item }) => (
            <StockResultCard
              stock={item}
              toolColor={toolColor}
              strength={tool ? getStrength(item, tool) : 50}
              onPress={() => router.push(`/stock/${item.ticker}`)}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 80 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => refetch()}
              tintColor={toolColor}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🔍</Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: colors.mutedForeground },
                ]}
              >
                Belum ada saham yang memenuhi kriteria {tool?.name} hari ini
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
  header: { paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  backArrow: { fontSize: 24, fontWeight: "300", lineHeight: 28 },
  backLabel: { fontSize: 13 },
  headerTitle: { marginBottom: 8 },
  toolTitle: { fontSize: 20, fontWeight: "900" },
  toolDesc: { fontSize: 12, marginTop: 1 },
  countBanner: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  countBig: { fontSize: 22, fontWeight: "900" },
  countSub: { fontSize: 12, fontWeight: "600" },
  sortScroll: { marginBottom: 4 },
  sortRow: { flexDirection: "row", gap: 8, paddingRight: 8 },
  sortChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sortChipText: { fontSize: 12, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingTop: 10 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTicker: { fontSize: 18, fontWeight: "900" },
  cardMeta: { fontSize: 10, marginTop: 2 },
  cardPrice: { fontSize: 16, fontWeight: "700" },
  cardChg: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  metaChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  strengthWrap: { gap: 4 },
  strengthRow: { flexDirection: "row", justifyContent: "space-between" },
  strengthLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase" },
  strengthNum: { fontSize: 9, fontWeight: "800" },
  barTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3 },
  chipRow: { flexDirection: "row", gap: 6 },
  chip: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 10, fontWeight: "600" },
  maInfo: { fontSize: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8, minHeight: 250 },
  loadingText: { fontSize: 13, marginTop: 8, textAlign: "center" },
  errorText: { fontSize: 14, textAlign: "center" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
});
