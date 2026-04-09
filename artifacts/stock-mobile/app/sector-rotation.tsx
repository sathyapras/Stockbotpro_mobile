import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { fetchMasterStock } from "@/services/masterStockService";
import { fetchRadarMarket } from "@/services/radarMarketService";
import {
  PHASE_CONFIG,
  PHASE_HINTS,
  PHASE_ORDER,
  type SectorData,
  buildSectorStats,
} from "@/services/sectorService";

// ─── Phase filter ─────────────────────────────────────────────

type PhaseKey = "Leading" | "Improving" | "Weakening" | "Lagging";
type SortMode = "sm" | "phase";

// ─── Sector Card ──────────────────────────────────────────────

function SectorCard({ sector, rank }: { sector: SectorData; rank: number }) {
  const colors = useColors();
  const cfg = PHASE_CONFIG[sector.phase];
  const rsUp = sector.rsChange2w >= 0;

  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: 14, padding: 14,
      borderLeftWidth: 3, borderLeftColor: cfg.color,
    }}>
      {/* Row 1: Rank + Name + SM Score */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, width: 22 }}>{rank}.</Text>
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15, flex: 1 }}>
          {sector.sector}
        </Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#a78bfa", fontWeight: "900", fontSize: 20 }}>
            {Math.round(sector.avgBandarScore)}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>/100</Text>
        </View>
      </View>

      {/* Row 2: Phase badge + RS + Acc% */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <View style={{
          backgroundColor: cfg.bg, borderRadius: 6,
          borderWidth: 1, borderColor: cfg.color + "60",
          paddingHorizontal: 8, paddingVertical: 3,
        }}>
          <Text style={{ color: cfg.color, fontSize: 10, fontWeight: "700" }}>
            {cfg.emoji} {sector.phase}
          </Text>
        </View>

        <Text style={{ color: rsUp ? "#34d399" : "#f87171", fontSize: 11 }}>
          {rsUp ? "↑" : "↓"} RS {rsUp ? "+" : ""}{sector.rsChange2w.toFixed(1)}
        </Text>

        <Text style={{ color: colors.mutedForeground, fontSize: 11, marginLeft: "auto" }}>
          {sector.accPct.toFixed(0)}% Acc
          <Text style={{ color: colors.mutedForeground, opacity: 0.6 }}>
            {" "}({sector.accCount}/{sector.radarCount})
          </Text>
        </Text>
      </View>

      {/* SM Score bar */}
      <View style={{
        height: 4, backgroundColor: colors.muted,
        borderRadius: 2, overflow: "hidden", marginBottom: 10,
      }}>
        <View style={{
          height: "100%", borderRadius: 2, backgroundColor: cfg.color,
          width: `${Math.min(100, sector.avgBandarScore)}%` as any,
        }} />
      </View>

      {/* Top 3 stocks */}
      {sector.topStocks.length > 0 && (
        <View style={{ flexDirection: "row", gap: 6 }}>
          {sector.topStocks.map(s => (
            <TouchableOpacity
              key={s.symbol}
              onPress={() => router.push(`/stock/${s.symbol}` as any)}
              style={{
                backgroundColor: s.isAccum ? "#052e1680" : colors.muted,
                borderRadius: 8, borderWidth: 1,
                borderColor: s.isAccum ? "#16a34a50" : colors.border,
                paddingHorizontal: 8, paddingVertical: 5,
              }}>
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 11 }}>{s.symbol}</Text>
              <Text style={{ color: s.isAccum ? "#34d399" : colors.mutedForeground, fontSize: 9 }}>
                {s.bandarScore}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────

export default function SectorRotationScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;

  const [sortBy, setSortBy]         = useState<SortMode>("sm");
  const [filterPhase, setFilterPhase] = useState<PhaseKey | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);

  const { data: stocks = [], isLoading: loadingStocks } = useQuery({
    queryKey: ["master-stock"],
    queryFn:  fetchMasterStock,
    staleTime: 60 * 60 * 1000,
  });

  const { data: radar = [], isLoading: loadingRadar } = useQuery({
    queryKey: ["radar-market"],
    queryFn:  fetchRadarMarket,
    staleTime: 60 * 60 * 1000,
  });

  const isLoading = loadingStocks || loadingRadar;

  const sectors = useMemo(() => {
    if (!stocks.length || !radar.length) return [];
    return buildSectorStats(stocks, radar);
  }, [stocks, radar]);

  const phaseCounts = useMemo(() => {
    const c: Record<string, number> = { Leading: 0, Improving: 0, Weakening: 0, Lagging: 0 };
    sectors.forEach(s => { if (c[s.phase] !== undefined) c[s.phase]++; });
    return c;
  }, [sectors]);

  const sorted = useMemo(() => {
    let list = filterPhase
      ? sectors.filter(s => s.phase === filterPhase)
      : [...sectors];
    if (sortBy === "sm")    return list.sort((a, b) => b.avgBandarScore - a.avgBandarScore);
    if (sortBy === "phase") return list.sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]);
    return list;
  }, [sectors, sortBy, filterPhase]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ height: topPad }} />

      {/* ── Header ── */}
      <View style={{
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity onPress={() => router.back()}
            style={{ paddingRight: 4 }}>
            <Text style={{ color: "#60a5fa", fontSize: 22 }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 18 }}>🔄 Rotasi Sektor</Text>
          {sectors.length > 0 && (
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{sectors.length} sektor</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setSortBy(s => s === "sm" ? "phase" : "sm")}
          style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            backgroundColor: colors.card, borderRadius: 8,
            paddingHorizontal: 10, paddingVertical: 5,
          }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            {sortBy === "sm" ? "SM Score ▼" : "Phase ▼"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Phase Filter Pills ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}>
        <TouchableOpacity
          onPress={() => setFilterPhase(null)}
          style={{
            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
            backgroundColor: filterPhase === null ? colors.card : "transparent",
            borderWidth: 1, borderColor: filterPhase === null ? colors.border : colors.border,
          }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Semua {sectors.length}</Text>
        </TouchableOpacity>

        {(Object.keys(PHASE_CONFIG) as PhaseKey[]).map(phase => {
          const cfg = PHASE_CONFIG[phase];
          const active = filterPhase === phase;
          return (
            <TouchableOpacity key={phase}
              onPress={() => setFilterPhase(f => f === phase ? null : phase)}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                backgroundColor: active ? cfg.bg : "transparent",
                borderWidth: 1, borderColor: active ? cfg.color : colors.border,
              }}>
              <Text style={{ color: active ? cfg.color : colors.mutedForeground, fontSize: 12 }}>
                {cfg.emoji} {phase} {phaseCounts[phase]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Loading ── */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Menghitung rotasi sektor…</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => item.sector}
          renderItem={({ item, index }) => (
            <SectorCard sector={item} rank={index + 1} />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90, gap: 8 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !hintDismissed ? (
              <TouchableOpacity
                onPress={() => setHintDismissed(true)}
                style={{
                  backgroundColor: colors.card, borderRadius: 12, padding: 12,
                  marginBottom: 4, borderWidth: 1, borderColor: colors.border,
                }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between",
                  alignItems: "flex-start" }}>
                  <Text style={{ color: "#60a5fa", fontSize: 11, fontWeight: "700",
                    letterSpacing: 1, marginBottom: 6 }}>ℹ️  CARA BACA</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>✕</Text>
                </View>
                <View style={{ gap: 4 }}>
                  {(Object.keys(PHASE_CONFIG) as PhaseKey[]).map(phase => (
                    <Text key={phase} style={{ color: colors.mutedForeground, fontSize: 11 }}>
                      {PHASE_CONFIG[phase].emoji} <Text style={{ fontWeight: "600" }}>{phase}</Text>
                      {" — "}{PHASE_HINTS[phase]}
                    </Text>
                  ))}
                </View>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, gap: 10 }}>
              <Text style={{ fontSize: 32 }}>🔄</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                {filterPhase ? `Tidak ada sektor "${filterPhase}"` : "Data sektor tidak tersedia"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
