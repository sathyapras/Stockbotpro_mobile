import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { LoginGate } from "@/components/LoginGate";
import { MenuButton } from "@/components/MenuButton";
import { SkeletonListScreen } from "@/components/SkeletonBox";
import {
  ALL_TOOLS,
  CategoryDef,
  ToolDef,
  ToolId,
  computeCounts,
  fetchScreener,
  TOOL_CATEGORIES,
} from "@/services/stockToolsService";

// ─── Tool card (2-column grid) ────────────────────────────────

function ToolCard({
  tool,
  count,
  onPress,
}: {
  tool: ToolDef;
  count: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const isStockpick = !!tool.fromStockpick;

  return (
    <TouchableOpacity
      style={[
        styles.toolCard,
        {
          backgroundColor: colors.card,
          borderColor: tool.color + "40",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Count badge */}
      <View style={[styles.countBadge, { backgroundColor: tool.color + "20" }]}>
        <Text style={[styles.countNum, { color: tool.color }]}>
          {isStockpick ? "→" : count}
        </Text>
        {!isStockpick && (
          <Text style={[styles.countLabel, { color: tool.color }]}>saham</Text>
        )}
      </View>

      {/* Tool name */}
      <Text style={[styles.toolName, { color: colors.foreground }]} numberOfLines={2}>
        {tool.name}
      </Text>
      <Text style={[styles.toolDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
        {tool.desc}
      </Text>

      {/* Arrow */}
      <Text style={[styles.arrowIcon, { color: tool.color }]}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Category section ─────────────────────────────────────────

function CategorySection({
  category,
  counts,
  onToolPress,
}: {
  category: CategoryDef;
  counts: Record<string, number>;
  onToolPress: (tool: ToolDef) => void;
}) {
  const colors = useColors();
  const totalInCat = category.tools.reduce(
    (sum, t) => sum + (t.fromStockpick ? 0 : (counts[t.id] ?? 0)),
    0,
  );

  return (
    <View style={styles.categorySection}>
      {/* Category header */}
      <View style={styles.categoryHeader}>
        <View style={[styles.catDot, { backgroundColor: category.color }]} />
        <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
          {category.id}
        </Text>
        <Text style={[styles.categoryTagline, { color: colors.mutedForeground }]}>
          · {category.tagline}
        </Text>
        {totalInCat > 0 && (
          <View style={[styles.catTotal, { backgroundColor: category.color + "20" }]}>
            <Text style={[styles.catTotalText, { color: category.color }]}>
              {totalInCat}
            </Text>
          </View>
        )}
      </View>

      {/* 2-column grid */}
      <View style={styles.toolGrid}>
        {category.tools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            count={counts[tool.id] ?? 0}
            onPress={() => onToolPress(tool)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────

function ScreenerScreenContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === "web" ? 67 : insets.top + 8;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["stocktools-screener"],
    queryFn: fetchScreener,
    staleTime: 60 * 60 * 1000,
  });

  const counts = useMemo(
    () => (data ? computeCounts(data) : ({} as Record<ToolId, number>)),
    [data],
  );

  const totalSignals = useMemo(
    () => Object.values(counts).reduce((s, v) => s + v, 0),
    [counts],
  );

  function handleToolPress(tool: ToolDef) {
    if (tool.fromStockpick) {
      // Link to Stockpick tab
      router.push("/(tabs)/stockpick");
    } else {
      router.push(`/tool/${tool.id}`);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPadding, paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Stock Tools
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {isLoading
                ? "Memuat 18 strategi..."
                : `${ALL_TOOLS.length} strategi · ${totalSignals} sinyal aktif`}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              style={[styles.refreshBtn, { borderColor: colors.border }]}
              onPress={() => router.push("/stock-tools-guide" as any)}
            >
              <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>ℹ️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.refreshBtn, { borderColor: colors.border }]}
              onPress={() => refetch()}
            >
              <Text style={{ color: colors.mutedForeground, fontSize: 18 }}>↻</Text>
            </TouchableOpacity>
            <MenuButton color={colors.mutedForeground} />
          </View>
        </View>

        {/* ── Loading / Error ── */}
        {isLoading ? (
          <SkeletonListScreen count={6} />
        ) : isError ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>⚠️</Text>
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              Gagal memuat data screener
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => refetch()}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Summary bar ── */}
            <View
              style={[
                styles.summaryBar,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: colors.primary }]}>289</Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  Total IDX
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: "#34d399" }]}>
                  {totalSignals}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  Sinyal Aktif
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: "#fbbf24" }]}>
                  {Object.values(counts).filter((v) => v > 0).length}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  Strategi Aktif
                </Text>
              </View>
            </View>

            {/* ── 5 Category sections ── */}
            {TOOL_CATEGORIES.map((cat) => (
              <CategorySection
                key={cat.id}
                category={cat}
                counts={counts}
                onToolPress={handleToolPress}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, marginTop: 2 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 8 },
  loadingText: { fontSize: 13, marginTop: 8 },
  errorText: { fontSize: 14, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  summaryBar: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryNum: { fontSize: 22, fontWeight: "900" },
  summaryLabel: { fontSize: 10, fontWeight: "600" },
  divider: { width: 1, marginHorizontal: 4 },
  categorySection: { marginBottom: 20 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  categoryTitle: { fontSize: 15, fontWeight: "800" },
  categoryTagline: { fontSize: 11, flex: 1 },
  catTotal: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  catTotalText: { fontSize: 11, fontWeight: "800" },
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  toolCard: {
    width: "47.5%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 2,
  },
  countNum: { fontSize: 26, fontWeight: "900" },
  countLabel: { fontSize: 10, fontWeight: "600" },
  toolName: { fontSize: 13, fontWeight: "800", lineHeight: 17 },
  toolDesc: { fontSize: 10, lineHeight: 14 },
  arrowIcon: { fontSize: 20, fontWeight: "900", marginTop: 4, alignSelf: "flex-end" },
});

export default function ScreenerScreen() {
  return <LoginGate feature="Stock Tools"><ScreenerScreenContent /></LoginGate>;
}
