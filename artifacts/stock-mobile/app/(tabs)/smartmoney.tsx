import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

import {
  type SmartMoneyItem,
  type SmartMoneyPhase,
  PHASE_CONFIG,
  fetchSmartMoneyFlow,
} from "@/services/smartMoneyService";
import { MenuButton } from "@/components/MenuButton";
import { hapticLight } from "@/hooks/useHaptic";
import { useColors } from "@/hooks/useColors";

// ─── Sparkline mini chart ─────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values.map(Math.abs), 0.1);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 24 }}>
      {values.map((v, i) => {
        const h = Math.max(3, (Math.abs(v) / max) * 22);
        const c = v >= 0 ? "#34d399" : "#f87171";
        return (
          <View key={i} style={{ width: 6, height: h, borderRadius: 2,
            backgroundColor: c, opacity: i === values.length - 1 ? 1 : 0.6 }} />
        );
      })}
    </View>
  );
}

// ─── Smart Money Card ─────────────────────────────────────────

function SmartMoneyCard({ stock, rank }: { stock: SmartMoneyItem; rank: number }) {
  const router = useRouter();
  const colors = useColors();
  const cfg    = PHASE_CONFIG[stock.phase] ?? PHASE_CONFIG.CHURNING;
  const isUp   = (stock.mom3d ?? 0) >= 0;
  const momColor = isUp ? "#34d399" : "#f87171";

  return (
    <TouchableOpacity
      onPress={() => { hapticLight(); router.push(`/stock/${stock.ticker}?tab=smartmoney` as any); }}
      activeOpacity={0.8}
      style={{
        backgroundColor: colors.card, borderRadius: 12, padding: 14,
        borderLeftWidth: 3, borderLeftColor: cfg.color,
      }}>

      {/* Row 1: Rank + Ticker + Badge + Phase label + avg3d + Score */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <Text style={{ color: "#475569", fontSize: 11, width: 22 }}>{rank}</Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15 }}>{stock.ticker}</Text>
            <View style={{
              backgroundColor: cfg.bg, borderRadius: 4,
              paddingHorizontal: 6, paddingVertical: 1,
              borderWidth: 1, borderColor: cfg.color + "50",
            }}>
              <Text style={{ color: cfg.badgeColor, fontSize: 9, fontWeight: "700" }}>{cfg.badge}</Text>
            </View>
            <Text style={{ color: cfg.color, fontSize: 10, fontWeight: "600" }}>{cfg.display}</Text>
          </View>
          <Text style={{ color: "#475569", fontSize: 10 }} numberOfLines={1}>{stock.ticker}</Text>
        </View>
        {/* avg3d + score */}
        <View style={{ alignItems: "flex-end", marginRight: 10 }}>
          <Text style={{
            color: (stock.avg3d ?? 0) >= 0 ? "#34d399" : "#f87171",
            fontWeight: "700", fontSize: 14,
          }}>
            {(stock.avg3d ?? 0) >= 0 ? "+" : ""}{(stock.avg3d ?? 0).toFixed(1)}B
          </Text>
          <Text style={{ color: "#475569", fontSize: 9 }}>avg3d</Text>
        </View>
        <View style={{ alignItems: "flex-end", minWidth: 32 }}>
          <Text style={{ color: "#a78bfa", fontWeight: "900", fontSize: 18 }}>{stock.flowScore}</Text>
          <Text style={{ color: "#475569", fontSize: 9 }}>score</Text>
        </View>
      </View>

      {/* Row 2: Flow score bar + Momentum arrow */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <View style={{ flex: 1, height: 4, backgroundColor: colors.muted, borderRadius: 2, overflow: "hidden" }}>
          <View style={{
            height: "100%", borderRadius: 2,
            width: `${Math.min(100, stock.flowScore ?? 0)}%` as any,
            backgroundColor: cfg.color,
          }} />
        </View>
        <Text style={{ color: momColor, fontSize: 11, minWidth: 70 }}>
          {isUp ? "↑" : "↓"} mom {isUp ? "+" : ""}{(stock.mom3d ?? 0).toFixed(1)}
        </Text>
        <Sparkline values={stock.sparkline ?? []} color={cfg.color} />
      </View>

      {/* Row 3: Acc/Dist days + Broker label */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#34d399" }} />
            <Text style={{ color: "#64748b", fontSize: 10 }}>
              {stock.accDays ?? 0}h acc
            </Text>
          </View>
          {(stock.distDays ?? 0) > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#f87171" }} />
              <Text style={{ color: "#64748b", fontSize: 10 }}>
                {stock.distDays}h dist
              </Text>
            </View>
          )}
        </View>
        {stock.top1Label && stock.top1Label !== "—" && (
          <Text style={{ color: "#475569", fontSize: 10 }}>
            pola: <Text style={{ color: "#94a3b8" }}>{stock.top1Label}</Text>
          </Text>
        )}
      </View>

      {/* Phase description */}
      <Text style={{ color: cfg.color + "99", fontSize: 10, marginTop: 6, fontStyle: "italic" }}>
        {cfg.icon} {cfg.desc}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Phase summary pills ──────────────────────────────────────

function PhaseSummaryBar({ data }: { data: SmartMoneyItem[] }) {
  const counts = useMemo(() => {
    const c: Partial<Record<SmartMoneyPhase, number>> = {};
    data.forEach(s => { c[s.phase] = (c[s.phase] ?? 0) + 1; });
    return c;
  }, [data]);

  const phases = (Object.keys(PHASE_CONFIG) as SmartMoneyPhase[])
    .filter(p => (counts[p] ?? 0) > 0);

  const top3 = [
    { phase: "IGNITION"    as SmartMoneyPhase, count: counts.IGNITION    ?? 0 },
    { phase: "EARLY_ACC"   as SmartMoneyPhase, count: counts.EARLY_ACC   ?? 0 },
    { phase: "DISTRIBUTION"as SmartMoneyPhase, count: counts.DISTRIBUTION ?? 0 },
  ];

  return (
    <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
      {top3.map(({ phase, count }) => {
        const cfg = PHASE_CONFIG[phase];
        return (
          <View key={phase} style={{
            flex: 1, backgroundColor: cfg.bg,
            borderRadius: 10, padding: 10,
            borderWidth: 1, borderColor: cfg.color + "50",
            alignItems: "center",
          }}>
            <Text style={{ color: cfg.color, fontWeight: "900", fontSize: 20 }}>{count}</Text>
            <Text style={{ color: cfg.color + "cc", fontSize: 9, marginTop: 2 }}>
              {cfg.icon} {phase === "IGNITION" ? "Ignition" : phase === "EARLY_ACC" ? "Awal Acc" : "Distribusi"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function SmartMoneyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top + 8;

  const [activePhase, setActivePhase] = useState<SmartMoneyPhase | null>(null);
  const [search, setSearch] = useState("");

  const { data: raw, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["smart-money-flow"],
    queryFn:  fetchSmartMoneyFlow,
    staleTime: 30 * 60 * 1000,
  });

  const smData = raw?.data ?? [];
  const dataAvailable = smData.length > 0;
  const latestDate = smData[0]?.date ?? null;

  // Search-filtered list (before phase filter)
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return smData;
    const q = search.trim().toUpperCase();
    return smData.filter(s =>
      s.ticker.includes(q) ||
      (s.name ?? "").toUpperCase().includes(q)
    );
  }, [smData, search]);

  // Phase counts from search-filtered data
  const phaseCounts = useMemo(() => {
    const c: Partial<Record<SmartMoneyPhase, number>> = {};
    searchFiltered.forEach(s => { c[s.phase] = (c[s.phase] ?? 0) + 1; });
    return c;
  }, [searchFiltered]);

  const sortedPhases = (Object.keys(PHASE_CONFIG) as SmartMoneyPhase[])
    .filter(p => (phaseCounts[p] ?? 0) > 0);

  // Final filtered list (search + phase)
  const filtered = useMemo(() => {
    if (activePhase) return searchFiltered.filter(s => s.phase === activePhase);
    return searchFiltered;
  }, [searchFiltered, activePhase]);

  // Reset phase filter if search leaves 0 results for that phase
  useEffect(() => {
    if (activePhase && (phaseCounts[activePhase] ?? 0) === 0) {
      setActivePhase(null);
    }
  }, [phaseCounts, activePhase]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View style={{ paddingTop: topPadding, paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start",
          justifyContent: "space-between", marginBottom: 2 }}>
          <View>
            <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 20 }}>💎 Smart Money Flow</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 1 }}>
              Analisis broker · Update setelah 17:30 WIB
            </Text>
          </View>
          <MenuButton />
        </View>

        {latestDate && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#34d399" }} />
            <Text style={{ color: "#64748b", fontSize: 11 }}>
              Data:{" "}
              {new Date(latestDate).toLocaleDateString("id-ID", {
                day: "numeric", month: "short", year: "numeric",
              })}
              {"  ·  "}{smData.length} saham
            </Text>
          </View>
        )}
      </View>

      {/* ── Loading ── */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#a78bfa" />
          <Text style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
            Memuat Smart Money Flow…
          </Text>
        </View>
      )}

      {/* ── Error ── */}
      {!isLoading && isError && (
        <View style={styles.center}>
          <Text style={{ fontSize: 32 }}>⚠️</Text>
          <Text style={{ color: "#64748b", fontSize: 14, textAlign: "center" }}>
            Gagal memuat data.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: "#a78bfa", borderRadius: 10,
              paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 }}
            onPress={() => refetch()}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── No data yet (before 17:30) ── */}
      {!isLoading && !isError && !dataAvailable && (
        <View style={styles.center}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🕐</Text>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 16,
            textAlign: "center", marginBottom: 8 }}>
            Data Belum Tersedia
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
            Smart Money Flow diproses setelah market tutup.{"\n"}
            Coba lagi setelah jam 17:30 WIB.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.card, borderRadius: 10, borderWidth: 1,
              borderColor: colors.border, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16 }}
            onPress={() => refetch()}>
            <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Data available ── */}
      {!isLoading && dataAvailable && (
        <>
          {/* Summary bar */}
          <View style={{ paddingHorizontal: 16 }}>
            <PhaseSummaryBar data={smData} />
          </View>

          {/* Search */}
          <View style={{ marginHorizontal: 16, marginBottom: 8,
            backgroundColor: colors.card, borderRadius: 10,
            borderWidth: 1, borderColor: colors.border,
            flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
            <Text style={{ color: colors.mutedForeground, marginRight: 8 }}>🔍</Text>
            <TextInput
              placeholder="Cari ticker…"
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              style={{ flex: 1, color: colors.foreground, fontSize: 13, paddingVertical: 10 }}
              autoCapitalize="characters"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Text style={{ color: "#475569", fontSize: 16, paddingLeft: 6 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Phase filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{
              paddingHorizontal: 16, gap: 6, paddingBottom: 8,
              alignItems: "center", flexDirection: "row",
            }}>
            <TouchableOpacity
              onPress={() => setActivePhase(null)}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                backgroundColor: !activePhase ? colors.card : "transparent",
                borderWidth: 1, borderColor: !activePhase ? colors.mutedForeground : colors.border,
                alignSelf: "flex-start",
              }}>
              <Text style={{ color: !activePhase ? colors.foreground : colors.mutedForeground, fontSize: 12 }}>
                Semua {searchFiltered.length}
              </Text>
            </TouchableOpacity>

            {sortedPhases.map(phase => {
              const cfg    = PHASE_CONFIG[phase];
              const active = activePhase === phase;
              return (
                <TouchableOpacity
                  key={phase}
                  onPress={() => setActivePhase(p => p === phase ? null : phase)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                    backgroundColor: active ? cfg.bg : "transparent",
                    borderWidth: 1, borderColor: active ? cfg.color : "#334155",
                    flexDirection: "row", alignItems: "center", gap: 4,
                    alignSelf: "flex-start",
                  }}>
                  <Text style={{ fontSize: 11 }}>{cfg.icon}</Text>
                  <Text style={{
                    color: active ? cfg.color : "#64748b", fontSize: 12,
                    fontWeight: active ? "700" : "400",
                  }}>
                    {cfg.display} {phaseCounts[phase] ?? 0}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Stock list */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.ticker}
            renderItem={({ item, index }) => (
              <SmartMoneyCard stock={item} rank={index + 1} />
            )}
            contentContainerStyle={{
              paddingHorizontal: 16, paddingTop: 4,
              paddingBottom: insets.bottom + 80, gap: 8,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isLoading}
                onRefresh={() => refetch()}
                tintColor="#a78bfa"
              />
            }
            ListHeaderComponent={
              <View style={{ flexDirection: "row", justifyContent: "space-between",
                alignItems: "center", marginBottom: 6 }}>
                <Text style={{ color: "#64748b", fontSize: 12 }}>
                  {activePhase
                    ? `${PHASE_CONFIG[activePhase].icon} ${PHASE_CONFIG[activePhase].display}`
                    : "💎 Semua Fase"
                  }{" · "}{filtered.length} saham
                </Text>
                <Text style={{ color: "#475569", fontSize: 10 }}>
                  Diurutkan: Fase → Score
                </Text>
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 24, gap: 8, minHeight: 300,
  },
});
