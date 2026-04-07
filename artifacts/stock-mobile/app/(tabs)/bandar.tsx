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

import { Sparkline } from "@/components/Sparkline";
import { useColors } from "@/hooks/useColors";
import {
  PHASE_CONFIG,
  SmartMoneyResult,
  TREND_CONFIG,
  fetchSmartMoney,
  filterByTab,
  getFlowScoreColor,
} from "@/services/smartMoneyEngine";

type TabKey = "top_acc" | "entry" | "warning" | "strong";

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: "top_acc", label: "Top Akumulasi", emoji: "⭐" },
  { key: "entry",   label: "Entry Peluang", emoji: "🚀" },
  { key: "warning", label: "Peringatan",    emoji: "⚠️" },
  { key: "strong",  label: "Strong Trend",  emoji: "📈" },
];

function FlowScoreBadge({ score }: { score: number }) {
  const color = getFlowScoreColor(score);
  return (
    <View style={[styles.scoreBadge, { backgroundColor: color + "22" }]}>
      <Text style={[styles.scoreNum, { color }]}>{score}</Text>
      <Text style={[styles.scoreLabel, { color: color + "99" }]}>score</Text>
    </View>
  );
}

function BrokerBar({ buy, sell }: { buy: number; sell: number }) {
  const total = buy + sell;
  const buyPct = total > 0 ? (buy / total) * 100 : 50;
  return (
    <View style={{ gap: 2 }}>
      <View style={styles.brokerBarTrack}>
        <View style={[styles.brokerBarBuy, { flex: buyPct }]} />
        <View style={[styles.brokerBarSell, { flex: 100 - buyPct }]} />
      </View>
      <View style={styles.brokerBarLabels}>
        <Text style={styles.brokerBuyLabel}>B:{buy}</Text>
        <Text style={styles.brokerSellLabel}>S:{sell}</Text>
      </View>
    </View>
  );
}

function SmartMoneyCard({ item }: { item: SmartMoneyResult }) {
  const colors = useColors();
  const router = useRouter();
  const phase = PHASE_CONFIG[item.phase];
  const trend = TREND_CONFIG[item.flowTrend];
  const accBg = item.latestAccDist === "Acc" ? "#34d39922" : "#f8717122";
  const accColor = item.latestAccDist === "Acc" ? "#34d399" : "#f87171";

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/stock/${item.ticker}`)}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={styles.tickerRow}>
            <Text style={[styles.ticker, { color: colors.foreground }]}>{item.ticker}</Text>
            <View style={[styles.accBadge, { backgroundColor: accBg }]}>
              <Text style={[styles.accBadgeText, { color: accColor }]}>
                {item.latestAccDist ?? "–"}
              </Text>
            </View>
            <View style={[styles.phaseDot, { backgroundColor: phase.color }]} />
            <Text style={[styles.phaseLabel, { color: phase.color }]}>{phase.label}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              avg 3D: {item.avg3d >= 0 ? "+" : ""}{item.avg3d.toFixed(1)}B
            </Text>
            <Text style={[styles.trendIcon, { color: trend.color }]}>
              {trend.icon} {trend.label}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              acc: {item.accDays}/{item.accDays + item.distDays} hari
            </Text>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              fuel: {item.fuel >= 0 ? "+" : ""}{item.fuel.toFixed(1)}B
            </Text>
          </View>
        </View>
        <FlowScoreBadge score={item.flowScore} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.sparklineWrap}>
          <Sparkline data={item.sparkline} width={160} height={28} />
        </View>
        <BrokerBar buy={item.brokerBuy} sell={item.brokerSell} />
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.topLabel, { color: colors.mutedForeground }]}>
          Top1: <Text style={{ color: colors.foreground }}>{item.top1Label}</Text>
        </Text>
        <Text style={[styles.topLabel, { color: colors.mutedForeground }]}>
          Top3: <Text style={{ color: colors.foreground }}>{item.top3Label}</Text>
        </Text>
        {item.latestVwap ? (
          <Text style={[styles.topLabel, { color: colors.mutedForeground }]}>
            VWAP: <Text style={{ color: colors.foreground }}>
              {item.latestVwap.toLocaleString("id-ID")}
            </Text>
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function BandarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top + 8;

  const [activeTab, setActiveTab] = useState<TabKey>("top_acc");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["smart-money"],
    queryFn: fetchSmartMoney,
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const tabData = filterByTab(data ?? [], activeTab);
    if (!search.trim()) return tabData;
    return tabData.filter(d =>
      d.ticker.toLowerCase().includes(search.toLowerCase()),
    );
  }, [data, activeTab, search]);

  const tabCounts = useMemo(() => {
    if (!data) return {};
    return {
      top_acc: filterByTab(data, "top_acc").length,
      entry:   filterByTab(data, "entry").length,
      warning: filterByTab(data, "warning").length,
      strong:  filterByTab(data, "strong").length,
    };
  }, [data]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Bandar Detector</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Smart Money Flow · Broker Summary 15D
        </Text>

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, marginRight: 6 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cari ticker..."
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

        <View style={styles.tabRow}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tabChip,
                {
                  backgroundColor: activeTab === t.key
                    ? colors.primary + "22"
                    : colors.card,
                  borderColor: activeTab === t.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text
                style={[
                  styles.tabChipText,
                  { color: activeTab === t.key ? colors.primary : colors.mutedForeground },
                ]}
                numberOfLines={1}
              >
                {t.emoji} {tabCounts[t.key] !== undefined ? tabCounts[t.key] : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.tabTitle, { color: colors.foreground }]}>
          {TABS.find(t => t.key === activeTab)?.emoji}{" "}
          {TABS.find(t => t.key === activeTab)?.label}
          {" "}<Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            ({filtered.length} saham)
          </Text>
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Menganalisis Smart Money Flow...
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 32 }}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Gagal memuat data. Periksa koneksi internet.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.ticker}
          renderItem={({ item }) => <SmartMoneyCard item={item} />}
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
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
              <Text style={[{ color: colors.mutedForeground, textAlign: "center" }]}>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, marginBottom: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "nowrap" },
  tabChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flex: 1,
    alignItems: "center",
  },
  tabChipText: { fontSize: 11, fontWeight: "700" },
  tabTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardLeft: { flex: 1, gap: 4 },
  tickerRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  ticker: { fontSize: 18, fontWeight: "800" },
  accBadge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  accBadgeText: { fontSize: 10, fontWeight: "700" },
  phaseDot: { width: 7, height: 7, borderRadius: 4 },
  phaseLabel: { fontSize: 11, fontWeight: "600" },
  metaRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  metaText: { fontSize: 12 },
  trendIcon: { fontSize: 12, fontWeight: "600" },
  scoreBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 52,
  },
  scoreNum: { fontSize: 22, fontWeight: "900" },
  scoreLabel: { fontSize: 9, fontWeight: "600", marginTop: -2 },
  cardBody: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sparklineWrap: { flex: 1 },
  brokerBarTrack: {
    flexDirection: "row",
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    width: 80,
  },
  brokerBarBuy:  { backgroundColor: "#34d399" },
  brokerBarSell: { backgroundColor: "#f87171" },
  brokerBarLabels: { flexDirection: "row", justifyContent: "space-between", width: 80 },
  brokerBuyLabel:  { color: "#34d399", fontSize: 9, fontWeight: "600" },
  brokerSellLabel: { color: "#f87171", fontSize: 9, fontWeight: "600" },
  cardFooter: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  topLabel: { fontSize: 11 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8, minHeight: 300 },
  loadingText: { fontSize: 13, marginTop: 8, textAlign: "center" },
  errorText: { fontSize: 14, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
});
