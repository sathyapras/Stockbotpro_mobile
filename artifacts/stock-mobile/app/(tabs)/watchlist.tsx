import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWatchlist } from "@/context/WatchlistContext";
import { useColors } from "@/hooks/useColors";
import {
  MasterStock,
  buildStockMap,
  fetchMasterStock,
  fmtValueBn,
  getIndexBadges,
} from "@/services/masterStockService";

// ─── Watchlist stock card ─────────────────────────────────────

function WatchCard({ ms, onRemove, colors }: {
  ms: MasterStock;
  onRemove: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const isUp = ms.changePercent >= 0;
  const chgColor = isUp ? "#34d399" : "#f87171";
  const badges = getIndexBadges(ms.indexCategory);
  const volRatio = ms.vol50dPct;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      onPress={() => router.push(`/stock/${ms.symbol}` as never)}
      activeOpacity={0.7}
    >
      {/* Left */}
      <View style={styles.cardLeft}>
        <View style={[styles.codeBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.code, { color: colors.primary }]}>{ms.symbol}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
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

      {/* Right: price + change + remove */}
      <View style={styles.cardRight}>
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
          {ms.per > 0 && (
            <Text style={{ color: "#94a3b8", fontSize: 9 }}>
              P/E {ms.per.toFixed(1)}x
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onRemove}
          style={[styles.removeBtn, { backgroundColor: colors.destructive + "18" }]}
        >
          <Feather name="trash-2" size={14} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Placeholder stock card (when not in master data) ─────────

function PlaceholderCard({ code, onRemove, colors }: {
  code: string; onRemove: () => void; colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      onPress={() => router.push(`/stock/${code}` as never)}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.codeBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.code, { color: colors.primary }]}>{code}</Text>
        </View>
        <Text style={{ color: "#64748b", fontSize: 12 }}>Data tidak tersedia</Text>
      </View>
      <TouchableOpacity
        onPress={onRemove}
        style={[styles.removeBtn, { backgroundColor: colors.destructive + "18" }]}
      >
        <Feather name="trash-2" size={14} color={colors.destructive} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function WatchlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { watchlist, removeFromWatchlist } = useWatchlist();

  const { data: masterStocks = [], isLoading } = useQuery({
    queryKey: ["master-stock"],
    queryFn: fetchMasterStock,
    staleTime: 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
    retry: 1,
  });

  const stockMap = useMemo(() => buildStockMap(masterStocks), [masterStocks]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top + 8;

  const handleRemove = (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Remove", `Hapus ${code} dari watchlist?`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => removeFromWatchlist(code) },
    ]);
  };

  // Watchlist summary
  const watchedMs: (MasterStock | null)[] = watchlist.map(c => stockMap.get(c) ?? null);
  const totalValue = watchedMs.reduce((sum, ms) =>
    ms ? sum + ms.close * ms.volume * 0 : sum, 0); // suppress for now

  const totalUp = watchedMs.filter(ms => ms && ms.changePercent > 0).length;
  const totalDown = watchedMs.filter(ms => ms && ms.changePercent < 0).length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Watchlist</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {watchlist.length} saham dipantau
            </Text>
          </View>
          {watchlist.length > 0 && !isLoading && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                backgroundColor: "#34d39922" }}>
                <Text style={{ color: "#34d399", fontSize: 11, fontWeight: "700" }}>
                  ▲ {totalUp}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                backgroundColor: "#f8717122" }}>
                <Text style={{ color: "#f87171", fontSize: 11, fontWeight: "700" }}>
                  ▼ {totalDown}
                </Text>
              </View>
            </View>
          )}
        </View>
        {isLoading && watchlist.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              Memuat harga live…
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={watchlist}
        keyExtractor={code => code}
        renderItem={({ item: code }) => {
          const ms = stockMap.get(code);
          if (!ms) {
            return <PlaceholderCard code={code} onRemove={() => handleRemove(code)} colors={colors} />;
          }
          return <WatchCard ms={ms} onRemove={() => handleRemove(code)} colors={colors} />;
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Feather name="bookmark" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Watchlist kosong
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Tambahkan saham dari tab Market untuk dipantau harganya di sini
            </Text>
            <TouchableOpacity
              style={[styles.marketBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.navigate("/" as never)}
            >
              <Feather name="bar-chart-2" size={14} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                Browse Market
              </Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === "web" ? 100 : 90 }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", fontWeight: "700" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 4,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 52,
    alignItems: "center",
  },
  code: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  name: { fontSize: 12, fontWeight: "500", fontFamily: "Inter_500Medium" },
  removeBtn: { padding: 8, borderRadius: 8 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
    paddingTop: 60,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 20,
    justifyContent: "center", alignItems: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", fontWeight: "700" },
  emptyDesc: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 20,
  },
  marketBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, marginTop: 8,
  },
});
