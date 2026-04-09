import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MAX_WATCHLIST, useWatchlist } from "@/context/WatchlistContext";
import { MenuButton } from "@/components/MenuButton";
import { SkeletonListScreen } from "@/components/SkeletonBox";
import { useColors } from "@/hooks/useColors";
import {
  MasterStock,
  buildStockMap,
  fetchMasterStock,
} from "@/services/masterStockService";
import {
  RadarMarket,
  fetchRadarMarket,
} from "@/services/radarMarketService";

// ─── Phase derivation (mirrors index.tsx logic) ────────────────

function derivePhase(r: RadarMarket): string | null {
  const fs = r.flowState.toUpperCase();
  if (fs.includes("STRONG ACCUMULATION") && r.bandarScore >= 65) return "IGNITION";
  if (fs.includes("STRONG ACCUMULATION")) return "EARLY_ACC";
  if (fs.includes("ACCUMULATION") && r.trendScore >= 60) return "STRONG_TREND";
  if (fs.includes("ACCUMULATION")) return "EARLY_ACC";
  if (fs.includes("DISTRIBUTION")) return "DISTRIBUTION";
  if (fs.includes("EXHAUSTION")) return "EXHAUSTION";
  return null;
}

const SM_LABELS: Record<string, string> = {
  IGNITION:     "Akumulasi Diam 🔥",
  EARLY_ACC:    "Akumulasi Awal",
  STRONG_TREND: "Trend Kuat 📈",
  EXHAUSTION:   "Mulai Jenuh",
  DISTRIBUTION: "Distribusi ⚠",
  CHURNING:     "Sideways",
};

const MA_TREND_COLORS: Record<string, string> = {
  Uptrend:     "#34d399",
  Downtrend:   "#f87171",
  "Above MA20": "#60a5fa",
  Sideways:    "#94a3b8",
};

function maTrendColor(trend: string): string {
  return MA_TREND_COLORS[trend] ?? "#64748b";
}

// ─── Enriched item type ────────────────────────────────────────

interface WItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  maTrend: string;
  smfPhase: string | null;
  smfScore: number;
  nbs1d: number;
}

// ─── Swipeable card ───────────────────────────────────────────

function WatchlistCard({
  item,
  onDelete,
}: {
  item: WItem;
  onDelete: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const colors = useColors();
  const isUp = item.changePercent >= 0;
  const chgColor = isUp ? "#34d399" : "#f87171";
  const smLabel = item.smfPhase ? SM_LABELS[item.smfPhase] : null;
  const maColor = maTrendColor(item.maTrend);

  const renderRight = () => (
    <TouchableOpacity
      onPress={() => {
        swipeRef.current?.close();
        onDelete();
      }}
      style={styles.deleteAction}
    >
      <Feather name="trash-2" size={18} color="#fff" />
      <Text style={styles.deleteActionText}>Hapus</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRight}
      friction={2}
      rightThreshold={40}
    >
      <TouchableOpacity
        onPress={() => router.push(`/stock/${item.symbol}` as never)}
        activeOpacity={0.8}
        style={[styles.card, { backgroundColor: colors.card }]}
      >
        {/* Row 1: ticker · price · change% */}
        <View style={styles.cardRow1}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.symbol, { color: colors.foreground }]}>
              {item.symbol}
            </Text>
            <Text style={[styles.companyName, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.price, { color: colors.foreground }]}>
              {item.price > 0 ? item.price.toLocaleString("id-ID") : "—"}
            </Text>
            <View style={[styles.changeBadge, { backgroundColor: chgColor + "22" }]}>
              <Text style={[styles.changeText, { color: chgColor }]}>
                {isUp ? "▲" : "▼"} {Math.abs(item.changePercent).toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Row 2: maTrend · SM phase · NBS */}
        <View style={styles.cardRow2}>
          {!!item.maTrend && (
            <View style={[styles.trendBadge, { borderColor: maColor, backgroundColor: maColor + "11" }]}>
              <Text style={[styles.trendBadgeText, { color: maColor }]}>
                {item.maTrend}
              </Text>
            </View>
          )}

          {!!smLabel && (
            <View style={[styles.smBadge, { backgroundColor: colors.muted }]}>
              <Text style={styles.smBadgeText}>
                SM: {smLabel} · {item.smfScore}
              </Text>
            </View>
          )}

          {item.nbs1d !== 0 && (
            <View style={[styles.nbsBadge, {
              backgroundColor: item.nbs1d > 0 ? "#052e16" : "#2d0a0a",
            }]}>
              <Text style={[styles.nbsText, {
                color: item.nbs1d > 0 ? "#34d399" : "#f87171",
              }]}>
                NBS {item.nbs1d > 0 ? "+" : ""}{item.nbs1d.toFixed(1)}B
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

// ─── Add Watchlist Modal ──────────────────────────────────────

function AddModal({
  visible,
  onClose,
  onAdd,
  masterStocks,
  watchlist,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (symbol: string) => void;
  masterStocks: MasterStock[];
  watchlist: string[];
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const colors = useColors();

  const suggestions = useMemo(() => {
    if (query.length < 1) return [];
    const q = query.toUpperCase();
    return masterStocks
      .filter(s => s.symbol.startsWith(q) || (s.name ?? "").toUpperCase().includes(q))
      .slice(0, 7);
  }, [query, masterStocks]);

  function handleAdd(symbol: string) {
    setError("");
    if (watchlist.includes(symbol)) {
      setError(`${symbol} sudah ada di watchlist`);
      return;
    }
    if (watchlist.length >= MAX_WATCHLIST) {
      setError(`Maksimum ${MAX_WATCHLIST} saham di watchlist`);
      return;
    }
    onAdd(symbol);
    setQuery("");
    onClose();
  }

  function handleClose() {
    setQuery("");
    setError("");
    Keyboard.dismiss();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "#00000080" }}
        activeOpacity={1}
        onPress={handleClose}
      />
      <View style={[styles.modal, { backgroundColor: colors.card }]}>
        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.modalTitle, { color: colors.foreground }]}>Tambah ke Watchlist</Text>
        <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
          {watchlist.length}/{MAX_WATCHLIST} saham terpantau
        </Text>

        {/* Search input */}
        <View style={[styles.searchBox, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Kode saham (contoh: BBCA)"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={t => { setQuery(t.toUpperCase()); setError(""); }}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setError(""); }}>
              <Feather name="x" size={16} color="#475569" />
            </TouchableOpacity>
          )}
        </View>

        {!!error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Suggestions */}
        {suggestions.map(s => {
          const already = watchlist.includes(s.symbol);
          return (
            <TouchableOpacity
              key={s.symbol}
              onPress={() => already ? null : handleAdd(s.symbol)}
              activeOpacity={already ? 1 : 0.7}
              style={styles.suggestion}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.suggestionSymbol, { color: colors.foreground }]}>{s.symbol}</Text>
                <Text style={[styles.suggestionName, { color: colors.mutedForeground }]} numberOfLines={1}>{s.name}</Text>
              </View>
              {already ? (
                <View style={styles.alreadyBadge}>
                  <Text style={styles.alreadyText}>✓ Dipantau</Text>
                </View>
              ) : (
                <Feather name="plus-circle" size={22} color="#0ea5e9" />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Manual add when no suggestion matches */}
        {query.length >= 2 && suggestions.length === 0 && (
          <TouchableOpacity
            onPress={() => handleAdd(query)}
            style={styles.addDirectBtn}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addDirectText}>Tambah {query}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

// ─── Empty State ──────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
        <Text style={{ fontSize: 40 }}>★</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Watchlist Kosong</Text>
      <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
        Tambahkan saham yang ingin dipantau.{"\n"}Maksimum {MAX_WATCHLIST} saham.
      </Text>
      <TouchableOpacity style={styles.emptyAddBtn} onPress={onAdd}>
        <Feather name="plus" size={16} color="#fff" />
        <Text style={styles.emptyAddText}>Tambah Saham</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [addVisible, setAddVisible] = useState(false);

  const { data: masterStocks = [], isLoading: msLoading } = useQuery({
    queryKey: ["master-stock"],
    queryFn: fetchMasterStock,
    staleTime: 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
    retry: 1,
  });

  const { data: radar = [], isLoading: radarLoading } = useQuery({
    queryKey: ["radar-market"],
    queryFn: fetchRadarMarket,
    staleTime: 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
    retry: 1,
  });

  const stockMap = useMemo(() => buildStockMap(masterStocks), [masterStocks]);

  const radarMap = useMemo(() => {
    const m = new Map<string, RadarMarket>();
    for (const r of radar) m.set(r.ticker, r);
    return m;
  }, [radar]);

  const isLoading = msLoading || radarLoading;

  const items: WItem[] = useMemo(
    () =>
      watchlist.map(symbol => {
        const ms = stockMap.get(symbol);
        const r = radarMap.get(symbol);
        const phase = r ? derivePhase(r) : null;
        return {
          symbol,
          name: ms?.name ?? r?.company ?? symbol,
          price: ms?.close ?? r?.close ?? 0,
          changePercent: ms?.changePercent ?? r?.chgPct ?? 0,
          maTrend: r?.maTrend ?? "",
          smfPhase: phase,
          smfScore: r ? Math.round(r.bandarScore) : 0,
          nbs1d: r?.nbs1d ?? 0,
        };
      }),
    [watchlist, stockMap, radarMap]
  );

  const totalUp   = items.filter(i => i.changePercent > 0).length;
  const totalDown = items.filter(i => i.changePercent < 0).length;
  const isFull    = watchlist.length >= MAX_WATCHLIST;
  const topPadding = Platform.OS === "web" ? 67 : insets.top + 8;

  function handleDelete(symbol: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Hapus dari Watchlist",
      `Hapus ${symbol} dari watchlist?`,
      [
        { text: "Batal", style: "cancel" },
        { text: "Hapus", style: "destructive", onPress: () => removeFromWatchlist(symbol) },
      ]
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              ★ Watchlist
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {watchlist.length} / {MAX_WATCHLIST} saham
            </Text>
          </View>

          {/* Up/Down counters */}
          {watchlist.length > 0 && !isLoading && (
            <View style={{ flexDirection: "row", gap: 6, marginRight: 10 }}>
              {totalUp > 0 && (
                <View style={[styles.counterBadge, { backgroundColor: "#34d39922" }]}>
                  <Text style={{ color: "#34d399", fontSize: 11, fontWeight: "700" }}>
                    ▲ {totalUp}
                  </Text>
                </View>
              )}
              {totalDown > 0 && (
                <View style={[styles.counterBadge, { backgroundColor: "#f8717122" }]}>
                  <Text style={{ color: "#f87171", fontSize: 11, fontWeight: "700" }}>
                    ▼ {totalDown}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Add button */}
          <TouchableOpacity
            onPress={() => setAddVisible(true)}
            disabled={isFull}
            style={[
              styles.addBtn,
              { backgroundColor: isFull ? colors.card : "#0ea5e9" },
            ]}
          >
            <Feather name="plus" size={14} color={isFull ? "#475569" : "#fff"} />
            <Text style={[styles.addBtnText, { color: isFull ? "#475569" : "#fff" }]}>
              Tambah
            </Text>
          </TouchableOpacity>

          {/* Hamburger */}
          <MenuButton />
        </View>

        {isLoading && watchlist.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
            <ActivityIndicator size="small" color="#0ea5e9" />
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              Memuat data saham...
            </Text>
          </View>
        )}

        {isFull && (
          <View style={styles.fullBanner}>
            <Feather name="info" size={12} color="#fbbf24" />
            <Text style={styles.fullBannerText}>
              Watchlist penuh ({MAX_WATCHLIST}/{MAX_WATCHLIST}). Hapus saham untuk menambah baru.
            </Text>
          </View>
        )}
      </View>

      {/* ── List ── */}
      <FlatList
        data={items}
        keyExtractor={item => item.symbol}
        renderItem={({ item }) => (
          <WatchlistCard
            item={item}
            onDelete={() => handleDelete(item.symbol)}
          />
        )}
        ListEmptyComponent={
          !isLoading ? <EmptyState onAdd={() => setAddVisible(true)} /> : (
            <SkeletonListScreen count={5} />
          )
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: Platform.OS === "web" ? 100 : 90,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Add Modal ── */}
      <AddModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={addToWatchlist}
        masterStocks={masterStocks}
        watchlist={watchlist}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  header:  { paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  headerSub:   { fontSize: 12, marginTop: 2 },

  counterBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  addBtnText: { fontWeight: "700", fontSize: 13 },

  fullBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fbbf2411", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginTop: 8,
  },
  fullBannerText: { color: "#fbbf24", fontSize: 11, flex: 1 },

  // ── Card ──
  card: {
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  cardRow1: { flexDirection: "row", alignItems: "center" },
  cardRow2: {
    flexDirection: "row", alignItems: "center",
    marginTop: 8, gap: 6, flexWrap: "wrap",
  },
  symbol:      { fontWeight: "900", fontSize: 16 },
  companyName: { color: "#64748b", fontSize: 11, marginTop: 1 },
  price:       { fontWeight: "700", fontSize: 16 },
  changeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  changeText:  { fontSize: 12, fontWeight: "700" },

  trendBadge: {
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1,
  },
  trendBadgeText: { fontSize: 10, fontWeight: "600" },

  smBadge: {
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: "#0a1a2e",
  },
  smBadgeText: { color: "#06b6d4", fontSize: 10 },

  nbsBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  nbsText:  { fontSize: 10, fontWeight: "600" },

  deleteAction: {
    backgroundColor: "#ef4444",
    justifyContent: "center", alignItems: "center",
    width: 72, borderRadius: 12,
    marginBottom: 10, marginLeft: 8,
  },
  deleteActionText: {
    color: "#fff", fontWeight: "700", fontSize: 11, marginTop: 2,
  },

  // ── Modal ──
  modal: {
    backgroundColor: "#1e2433",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 52,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#334155", alignSelf: "center", marginBottom: 16,
  },
  modalTitle: { color: "#fff", fontWeight: "700", fontSize: 18, marginBottom: 2 },
  modalSub:   { color: "#64748b", fontSize: 12, marginBottom: 16 },

  searchBox: {
    backgroundColor: "#0f1629", borderRadius: 10,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, marginBottom: 8,
  },
  searchInput: {
    flex: 1, color: "#fff", fontSize: 16, paddingVertical: 12,
  },
  errorText: {
    color: "#f87171", fontSize: 12, marginBottom: 8, marginLeft: 4,
  },
  suggestion: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#2d3748",
  },
  suggestionSymbol: { color: "#fff", fontWeight: "700", fontSize: 14 },
  suggestionName:   { color: "#64748b", fontSize: 11, marginTop: 1 },
  alreadyBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, backgroundColor: "#16a34a22",
  },
  alreadyText: { color: "#34d399", fontSize: 11 },
  addDirectBtn: {
    backgroundColor: "#0ea5e9", borderRadius: 10,
    paddingVertical: 12, alignItems: "center",
    marginTop: 16, flexDirection: "row",
    justifyContent: "center", gap: 8,
  },
  addDirectText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // ── Empty State ──
  emptyState: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 40, paddingTop: 40,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: "#1e2433",
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  emptyTitle:  { color: "#fff", fontWeight: "700", fontSize: 18, marginBottom: 8 },
  emptyDesc:   {
    color: "#64748b", fontSize: 14, textAlign: "center", lineHeight: 22,
  },
  emptyAddBtn: {
    backgroundColor: "#0ea5e9", borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20,
  },
  emptyAddText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
