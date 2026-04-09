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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  GRADE_COLOR,
  STATUS_CONFIG,
  SignalStatus,
  StockPickItem,
  countByStatus,
  fetchAllPicks,
  formatRp,
} from "@/services/stockpickService";

type TabKey = "BOW" | "BOS";
type FilterStatus = "ALL" | SignalStatus;

// ─── Small reusable chips ─────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "25", borderColor: color + "60" }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function SignalChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function InfoBlock({
  label, value, color,
}: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: 1 }}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── Signal card ─────────────────────────────────────────────

function PickCard({ item }: { item: StockPickItem }) {
  const colors = useColors();
  const router = useRouter();
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.HOLD;
  const gradeColor = GRADE_COLOR[item.grade] ?? "#94a3b8";
  const isProfit = item.glPct > 0;
  const hasGL = item.glPct !== 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/stock/${item.ticker}`)}
      activeOpacity={0.75}
    >
      {/* ── 2-column: left=content | right=score panel ── */}
      <View style={{ flexDirection: "row", gap: 12 }}>

        {/* ── Left column ── */}
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>

          {/* Row 1: Ticker + Price inline */}
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
            <Text style={{ fontSize: 26, fontWeight: "900", color: colors.foreground }}>
              {item.ticker}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
              Rp {formatRp(item.close)}
            </Text>
          </View>

          {/* Row 2: Badges + change% + holdDays */}
          <View style={{ flexDirection: "row", alignItems: "center",
            gap: 6, flexWrap: "wrap" }}>
            <Badge label={item.type} color={item.type === "BOW" ? "#34d399" : "#a78bfa"} />
            <Badge label={statusCfg.label} color={statusCfg.color} />
            {item.grade !== "–" && (
              <Badge label={`Grade ${item.grade}`} color={gradeColor} />
            )}
            {hasGL && (
              <Text style={{ fontSize: 13, fontWeight: "700",
                color: isProfit ? "#34d399" : "#f87171" }}>
                {isProfit ? "+" : ""}{item.glPct.toFixed(2)}%
              </Text>
            )}
            <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
              {item.holdDays}
            </Text>
          </View>

          {/* Grid box: ENTRY | STOP LOSS | TP 1 | TP 2 */}
          <View style={{ flexDirection: "row", backgroundColor: colors.background,
            borderRadius: 10, borderWidth: 1, borderColor: colors.border,
            paddingHorizontal: 10, paddingVertical: 10, gap: 0 }}>
            {[
              {
                label: "ENTRY",
                value: item.entryHigh
                  ? `${formatRp(item.entry)}–${formatRp(item.entryHigh)}`
                  : formatRp(item.entry),
                sub: null,
                color: "#fbbf24",
              },
              {
                label: "STOP LOSS",
                value: `Rp ${formatRp(item.stopLoss)}`,
                sub: `${item.slPct.toFixed(1)}%`,
                color: "#f87171",
              },
              {
                label: "TP 1",
                value: `Rp ${formatRp(item.tp1)}`,
                sub: `+${item.tp1Pct.toFixed(1)}%`,
                color: "#34d399",
              },
              (() => {
                const pct = item.entry > 0
                  ? ((item.tp2 - item.entry) / item.entry) * 100 : 0;
                return {
                  label: "TP 2",
                  value: `Rp ${formatRp(item.tp2)}`,
                  sub: pct > 0 ? `+${pct.toFixed(1)}%` : null,
                  color: "#a78bfa",
                };
              })(),
            ].map((col, i) => (
              <View key={col.label} style={{ flex: 1, alignItems: "flex-start",
                paddingLeft: i === 0 ? 0 : 8,
                borderLeftWidth: i > 0 ? 1 : 0,
                borderLeftColor: colors.border }}>
                <Text style={{ fontSize: 8, fontWeight: "700",
                  color: colors.mutedForeground, letterSpacing: 0.4,
                  textTransform: "uppercase", marginBottom: 4 }}>
                  {col.label}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "800", color: col.color }}>
                  {col.value}
                </Text>
                {col.sub && (
                  <Text style={{ fontSize: 11, fontWeight: "700", color: col.color,
                    opacity: 0.85 }}>
                    {col.sub}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Meta + signal chips — single merged scrollable row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {item.conf > 0 && (
                <Text style={{ fontSize: 11, color: colors.mutedForeground, fontWeight: "600" }}>
                  Conf: {item.conf}%
                </Text>
              )}
              {item.rr > 0 && (
                <View style={[styles.rrChip,
                  { backgroundColor: "#60a5fa22", borderColor: "#60a5fa44" }]}>
                  <Text style={{ color: "#60a5fa", fontSize: 11, fontWeight: "700" }}>
                    RR 1:{item.rr.toFixed(1)}
                  </Text>
                </View>
              )}
              {item.vwap !== null && (
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                  VWAP {formatRp(item.vwap)}
                  {item.vwapPct !== null
                    ? ` (${item.vwapPct > 0 ? "+" : ""}${item.vwapPct.toFixed(1)}%)` : ""}
                </Text>
              )}
              {item.signals.map((s, i) => <SignalChip key={i} label={s} />)}
            </View>
          </ScrollView>

          {/* Commentary */}
          {item.commentary ? (
            <Text style={[styles.commentary, { color: "#94a3b8" }]} numberOfLines={2}>
              {item.commentary}
            </Text>
          ) : null}
        </View>

        {/* ── Right column: Score + RSI + StochK ── */}
        <View style={{ alignItems: "center", width: 62 }}>
          <Text style={{ fontSize: 38, fontWeight: "900", color: colors.primary,
            lineHeight: 42 }}>
            {Math.round(item.score)}
          </Text>
          <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1,
            color: colors.mutedForeground, textTransform: "uppercase", marginBottom: 10 }}>
            SCORE
          </Text>

          {item.rsi !== null && (
            <View style={{ alignItems: "center", width: 62,
              backgroundColor: colors.background, borderRadius: 8,
              borderWidth: 1, borderColor: colors.border,
              paddingVertical: 6, marginBottom: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: "900", lineHeight: 22,
                color: item.rsi < 30 ? "#34d399"
                  : item.rsi > 70 ? "#f87171" : "#e2e8f0" }}>
                {item.rsi.toFixed(0)}
              </Text>
              <Text style={{ fontSize: 8, fontWeight: "700", letterSpacing: 0.8,
                color: "#64748b" }}>RSI</Text>
            </View>
          )}

          {item.stochK !== null && item.stochK !== undefined && (
            <View style={{ alignItems: "center", width: 62,
              backgroundColor: colors.background, borderRadius: 8,
              borderWidth: 1, borderColor: colors.border,
              paddingVertical: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: "900", lineHeight: 22,
                color: item.stochK < 20 ? "#34d399"
                  : item.stochK < 40 ? "#fbbf24" : "#e2e8f0" }}>
                {item.stochK.toFixed(0)}
              </Text>
              <Text style={{ fontSize: 8, fontWeight: "700", letterSpacing: 0.8,
                color: "#64748b" }}>STOCHK</Text>
            </View>
          )}
        </View>

      </View>
    </TouchableOpacity>
  );
}

// ─── Status filter bar ────────────────────────────────────────

function StatusFilter({
  counts,
  active,
  onSelect,
}: {
  counts: Record<string, number>;
  active: FilterStatus;
  onSelect: (s: FilterStatus) => void;
}) {
  const colors = useColors();
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  const options: FilterStatus[] = ["ALL", "BUY", "HOLD", "SELL", "SOLD"];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
      <View style={styles.filterRow}>
        {options.map((opt) => {
          const count = opt === "ALL" ? total : (counts[opt] ?? 0);
          const cfg = opt === "ALL"
            ? { color: colors.primary }
            : STATUS_CONFIG[opt as SignalStatus] ?? { color: "#94a3b8" };
          const isActive = active === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? cfg.color + "20" : colors.card,
                  borderColor: isActive ? cfg.color : colors.border,
                },
              ]}
              onPress={() => onSelect(opt)}
            >
              <Text style={[styles.filterChipText, { color: isActive ? cfg.color : colors.mutedForeground }]}>
                {opt === "ALL" ? "Semua" : opt}
                {" "}
                <Text style={[styles.filterCount, { color: isActive ? cfg.color : colors.mutedForeground }]}>
                  {count}
                </Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Main screen ─────────────────────────────────────────────

export default function StockpickScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top + 8;

  const [activeTab, setActiveTab] = useState<TabKey>("BOW");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("BUY");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["stockpick-all"],
    queryFn: fetchAllPicks,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const currentList = useMemo(() => {
    const items = activeTab === "BOW" ? (data?.bow ?? []) : (data?.bos ?? []);
    if (filterStatus === "ALL") return items;
    return items.filter(i => i.status === filterStatus);
  }, [data, activeTab, filterStatus]);

  const bowCounts = useMemo(() => countByStatus(data?.bow ?? []), [data]);
  const bosCounts = useMemo(() => countByStatus(data?.bos ?? []), [data]);
  const currentCounts = activeTab === "BOW" ? bowCounts : bosCounts;

  const date = data?.bow?.[0]?.date ?? data?.bos?.[0]?.date ?? "";

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    setFilterStatus("BUY");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Stockpick Signal</Text>
            {date ? (
              <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                Signal · {date}
              </Text>
            ) : null}
          </View>
        </View>

        {/* BOW / BOS tab selector */}
        <View style={[styles.tabRow, { borderColor: colors.border }]}>
          {(["BOW", "BOS"] as TabKey[]).map((tab) => {
            const isActive = activeTab === tab;
            const color = tab === "BOW" ? "#34d399" : "#a78bfa";
            const counts = tab === "BOW" ? bowCounts : bosCounts;
            const total = Object.values(counts).reduce((s, v) => s + v, 0);
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabBtn,
                  {
                    backgroundColor: isActive ? color + "18" : "transparent",
                    borderBottomWidth: isActive ? 2 : 0,
                    borderBottomColor: color,
                  },
                ]}
                onPress={() => handleTabChange(tab)}
              >
                <Text style={[styles.tabBtnTitle, { color: isActive ? color : colors.mutedForeground }]}>
                  {tab === "BOW" ? "Buy on Weakness" : "Buy on Strength"}
                </Text>
                <Text style={[styles.tabBtnSub, { color: isActive ? color : colors.mutedForeground }]}>
                  {total} saham
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Strategy description */}
        <Text style={[styles.stratDesc, { color: colors.mutedForeground }]}>
          {activeTab === "BOW"
            ? "🔻 Saham dip oversold — potensi rebound ke atas (REVERSAL)"
            : "🔺 Saham breakout momentum — konfirmasi tren naik (MOMENTUM)"}
        </Text>

        {/* Status filter */}
        {!isLoading && (
          <StatusFilter
            counts={currentCounts}
            active={filterStatus}
            onSelect={setFilterStatus}
          />
        )}
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Mengambil data sinyal...
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 32 }}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Gagal memuat sinyal. Cek koneksi internet.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(i) => `${i.type}-${i.ticker}`}
          renderItem={({ item }) => <PickCard item={item} />}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 80 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>
                {filterStatus === "BUY" ? "🎯" : "📋"}
              </Text>
              <Text style={[{ color: colors.mutedForeground, textAlign: "center" }]}>
                Tidak ada sinyal {filterStatus} saat ini
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
  header: { paddingHorizontal: 16, paddingBottom: 4 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  dateText: { fontSize: 11, marginTop: 1 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 6 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 10, paddingHorizontal: 4 },
  tabBtnTitle: { fontSize: 13, fontWeight: "700" },
  tabBtnSub: { fontSize: 10, marginTop: 1 },
  stratDesc: { fontSize: 11, marginBottom: 8 },
  filterScroll: { marginBottom: 4 },
  filterRow: { flexDirection: "row", gap: 8, paddingRight: 8 },
  filterChip: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterChipText: { fontSize: 12, fontWeight: "600" },
  filterCount: { fontWeight: "800" },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap", flex: 1 },
  ticker: { fontSize: 20, fontWeight: "900" },
  badge: { borderRadius: 5, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  scoreBox: { alignItems: "center", minWidth: 56 },
  scoreNum: { fontSize: 22, fontWeight: "900" },
  scoreUnit: { fontSize: 9, fontWeight: "600", marginTop: -3 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  closePrice: { fontSize: 16, fontWeight: "700" },
  glPct: { fontSize: 13, fontWeight: "700" },
  holdDays: { fontSize: 11 },
  priceBlocks: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  infoLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase" },
  infoValue: { fontSize: 12, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  rrChip: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  metaText: { fontSize: 11 },
  chipRow: { flexDirection: "row", gap: 6 },
  chip: {
    borderRadius: 6,
    backgroundColor: "#60a5fa18",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#60a5fa40",
  },
  chipText: { color: "#60a5fa", fontSize: 10, fontWeight: "600" },
  commentary: { fontSize: 11, fontStyle: "italic", lineHeight: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8, minHeight: 200 },
  loadingText: { fontSize: 13, marginTop: 8, textAlign: "center" },
  errorText: { fontSize: 14, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
});
