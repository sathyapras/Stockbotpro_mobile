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
import { Circle, Svg } from "react-native-svg";
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

type PhaseKey = "Leading" | "Improving" | "Weakening" | "Lagging";
type SortMode = "sm" | "phase";

// ─── Arc Meter (SVG) ──────────────────────────────────────────

function SmArcMeter({ score, color }: { score: number; color: string }) {
  const size   = 64;
  const radius = 26;
  const stroke = 5;
  const circ   = 2 * Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circ;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {/* track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#1e293b" strokeWidth={stroke}
        />
        {/* fill */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ color, fontWeight: "900", fontSize: 16, lineHeight: 18 }}>
        {Math.round(score)}
      </Text>
      <Text style={{ color: "#475569", fontSize: 8 }}>SM</Text>
    </View>
  );
}

// ─── Phase Donut (mini) ───────────────────────────────────────

function PhaseDonut({
  phase, count, total, active, onPress,
}: {
  phase: PhaseKey; count: number; total: number;
  active: boolean; onPress: () => void;
}) {
  const cfg    = PHASE_CONFIG[phase];
  const size   = 52;
  const radius = 20;
  const stroke = 4;
  const circ   = 2 * Math.PI * radius;
  const pct    = total > 0 ? count / total : 0;
  const filled = pct * circ;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignItems: "center", gap: 4,
        opacity: active ? 1 : 0.55,
      }}>
      <View style={{
        width: size, height: size,
        alignItems: "center", justifyContent: "center",
        backgroundColor: active ? cfg.bg : "transparent",
        borderRadius: size / 2,
      }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#1e293b" strokeWidth={stroke}
          />
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={cfg.color} strokeWidth={stroke}
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeDashoffset={circ / 4}
            strokeLinecap="round"
          />
        </Svg>
        <Text style={{ color: cfg.color, fontWeight: "800", fontSize: 15 }}>{count}</Text>
      </View>
      <Text style={{ color: active ? cfg.color : "#64748b", fontSize: 10, fontWeight: "600" }}>
        {phase}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Summary Strip ────────────────────────────────────────────

function SummaryStrip({
  phaseCounts, total, activePhase, onSelect,
}: {
  phaseCounts: Record<string, number>; total: number;
  activePhase: PhaseKey | null; onSelect: (p: PhaseKey | null) => void;
}) {
  const phases: PhaseKey[] = ["Leading", "Improving", "Weakening", "Lagging"];
  return (
    <View style={{
      flexDirection: "row", justifyContent: "space-around", alignItems: "center",
      marginHorizontal: 16, marginBottom: 4,
      backgroundColor: "#0b1628", borderRadius: 16, padding: 14,
      borderWidth: 1, borderColor: "#1e293b",
    }}>
      {/* All button */}
      <TouchableOpacity
        onPress={() => onSelect(null)}
        style={{ alignItems: "center", gap: 4, opacity: activePhase === null ? 1 : 0.45 }}>
        <View style={{
          width: 52, height: 52,
          borderRadius: 26, alignItems: "center", justifyContent: "center",
          backgroundColor: activePhase === null ? "#0f1729" : "transparent",
          borderWidth: 1.5, borderColor: activePhase === null ? "#334155" : "#1e293b",
        }}>
          <Text style={{ color: "#94a3b8", fontWeight: "800", fontSize: 15 }}>{total}</Text>
        </View>
        <Text style={{ color: activePhase === null ? "#94a3b8" : "#475569", fontSize: 10, fontWeight: "600" }}>
          Semua
        </Text>
      </TouchableOpacity>

      {phases.map(p => (
        <PhaseDonut
          key={p}
          phase={p}
          count={phaseCounts[p] ?? 0}
          total={total}
          active={activePhase === p}
          onPress={() => onSelect(activePhase === p ? null : p)}
        />
      ))}
    </View>
  );
}

// ─── RS Momentum Bar ──────────────────────────────────────────

function RsMomentumBar({ value, color }: { value: number; color: string }) {
  const pct    = Math.min(Math.abs(value) / 10, 1);
  const isUp   = value >= 0;
  const barW   = `${pct * 50}%` as any;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text style={{ color, fontSize: 11, fontWeight: "700", minWidth: 54 }}>
        {isUp ? "↑ RS +" : "↓ RS "}{value.toFixed(1)}
      </Text>
      <View style={{
        flex: 1, height: 4, backgroundColor: "#1e293b",
        borderRadius: 2, overflow: "hidden",
      }}>
        {/* center divider trick */}
        <View style={{
          position: "absolute",
          height: "100%", width: barW,
          left: isUp ? "50%" : undefined,
          right: isUp ? undefined : "50%",
          backgroundColor: color,
          borderRadius: 2,
        }} />
        <View style={{
          position: "absolute", left: "50%", width: 1,
          height: "100%", backgroundColor: "#334155",
        }} />
      </View>
    </View>
  );
}

// ─── Sector Card (Redesigned) ─────────────────────────────────

function SectorCard({ sector, rank }: { sector: SectorData; rank: number }) {
  const colors = useColors();
  const cfg    = PHASE_CONFIG[sector.phase];
  const rsUp   = sector.rsChange2w >= 0;
  const rsColor = rsUp ? "#34d399" : "#f87171";

  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1, borderColor: cfg.color + "30",
    }}>
      {/* Top accent bar */}
      <View style={{ height: 2, backgroundColor: cfg.color, opacity: 0.7 }} />

      <View style={{ padding: 14 }}>
        {/* Row 1: Rank + Name + Arc Meter */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <Text style={{
            color: colors.mutedForeground, fontSize: 11, width: 20, fontWeight: "600",
          }}>#{rank}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{
              color: colors.foreground, fontWeight: "800", fontSize: 15, letterSpacing: 0.1,
            }}>
              {sector.sector}
            </Text>
            {/* Phase badge inline */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
              <View style={{
                backgroundColor: cfg.bg, borderRadius: 6,
                borderWidth: 1, borderColor: cfg.color + "50",
                paddingHorizontal: 7, paddingVertical: 2,
              }}>
                <Text style={{ color: cfg.color, fontSize: 10, fontWeight: "700" }}>
                  {cfg.emoji} {sector.phase}
                </Text>
              </View>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                {sector.accPct.toFixed(0)}% Akumulasi
                <Text style={{ color: colors.mutedForeground, opacity: 0.6 }}>
                  {" "}({sector.accCount}/{sector.radarCount})
                </Text>
              </Text>
            </View>
          </View>
          {/* Arc score */}
          <SmArcMeter score={sector.avgBandarScore} color={cfg.color} />
        </View>

        {/* Row 2: RS Momentum Bar */}
        <RsMomentumBar value={sector.rsChange2w} color={rsColor} />

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: "#1e293b", marginVertical: 10 }} />

        {/* Row 3: Top stocks */}
        {sector.topStocks.length > 0 && (
          <View style={{ flexDirection: "row", gap: 6 }}>
            {sector.topStocks.map(s => (
              <TouchableOpacity
                key={s.symbol}
                onPress={() => router.push(`/stock/${s.symbol}` as any)}
                style={{
                  flex: 1,
                  backgroundColor: s.isAccum ? "#052e1680" : "#0f172a",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: s.isAccum ? "#16a34a50" : "#1e293b",
                  paddingHorizontal: 10, paddingVertical: 8,
                  alignItems: "center",
                }}>
                <Text style={{
                  color: colors.foreground, fontWeight: "800", fontSize: 12,
                  letterSpacing: 0.3,
                }}>
                  {s.symbol}
                </Text>
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3,
                }}>
                  <View style={{
                    width: 5, height: 5, borderRadius: 3,
                    backgroundColor: s.isAccum ? "#34d399" : "#64748b",
                  }} />
                  <Text style={{
                    color: s.isAccum ? "#34d399" : colors.mutedForeground,
                    fontSize: 10, fontWeight: "600",
                  }}>
                    {s.bandarScore}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function SectorRotationScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;

  const [sortBy,       setSortBy]       = useState<SortMode>("sm");
  const [filterPhase,  setFilterPhase]  = useState<PhaseKey | null>(null);
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
          <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 4 }}>
            <Text style={{ color: "#60a5fa", fontSize: 22 }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 18 }}>
            🔄 Rotasi Sektor
          </Text>
          {sectors.length > 0 && (
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
              {sectors.length} sektor
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setSortBy(s => s === "sm" ? "phase" : "sm")}
          style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            backgroundColor: colors.card, borderRadius: 8,
            paddingHorizontal: 10, paddingVertical: 5,
            borderWidth: 1, borderColor: "#1e293b",
          }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            {sortBy === "sm" ? "SM Score ▼" : "Phase ▼"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Summary Strip (phase donuts) ── */}
      {!isLoading && sectors.length > 0 && (
        <SummaryStrip
          phaseCounts={phaseCounts}
          total={sectors.length}
          activePhase={filterPhase}
          onSelect={setFilterPhase}
        />
      )}

      {/* ── Loading ── */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Menghitung rotasi sektor…
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => item.sector}
          renderItem={({ item, index }) => (
            <SectorCard sector={item} rank={index + 1} />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90, gap: 10, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !hintDismissed ? (
              <View
                style={{
                  backgroundColor: "#0b1628", borderRadius: 14,
                  marginBottom: 2, borderWidth: 1, borderColor: "#1e2d45",
                  overflow: "hidden",
                }}>
                {/* Header */}
                <View style={{
                  flexDirection: "row", justifyContent: "space-between",
                  alignItems: "center", paddingHorizontal: 14, paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: "#1e2d45",
                }}>
                  <Text style={{ color: "#60a5fa", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
                    ℹ️  CARA BACA
                  </Text>
                  <TouchableOpacity onPress={() => setHintDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: "#475569", fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Section 1: Phase */}
                <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, gap: 5 }}>
                  <Text style={{ color: "#94a3b8", fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 2 }}>
                    FASE SEKTOR
                  </Text>
                  {(Object.keys(PHASE_CONFIG) as PhaseKey[]).map(phase => (
                    <View key={phase} style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                      <Text style={{ fontSize: 11 }}>{PHASE_CONFIG[phase].emoji}</Text>
                      <Text style={{ flex: 1, color: "#94a3b8", fontSize: 11, lineHeight: 16 }}>
                        <Text style={{ fontWeight: "700", color: PHASE_CONFIG[phase].color }}>
                          {phase}
                        </Text>
                        {" — "}{PHASE_HINTS[phase]}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: "#1e2d45", marginHorizontal: 14 }} />

                {/* Section 2: SM Score */}
                <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, gap: 4 }}>
                  <Text style={{ color: "#94a3b8", fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 2 }}>
                    SM SCORE (LINGKARAN KANAN)
                  </Text>
                  <Text style={{ color: "#94a3b8", fontSize: 11, lineHeight: 16 }}>
                    <Text style={{ color: "#a78bfa", fontWeight: "700" }}>0–100</Text>
                    {" "}— rata-rata Smart Money Score semua saham dalam sektor. Semakin tinggi, semakin kuat akumulasi institusi di sektor tersebut.
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 3 }}>
                    <Text style={{ color: "#94a3b8", fontSize: 11 }}>
                      <Text style={{ color: "#34d399", fontWeight: "700" }}>≥70</Text> Kuat
                    </Text>
                    <Text style={{ color: "#94a3b8", fontSize: 11 }}>
                      <Text style={{ color: "#f59e0b", fontWeight: "700" }}>50–69</Text> Moderat
                    </Text>
                    <Text style={{ color: "#94a3b8", fontSize: 11 }}>
                      <Text style={{ color: "#f87171", fontWeight: "700" }}>&lt;50</Text> Lemah
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: "#1e2d45", marginHorizontal: 14 }} />

                {/* Section 3: RS */}
                <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, gap: 4 }}>
                  <Text style={{ color: "#94a3b8", fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 2 }}>
                    RS MOMENTUM (BAR HORIZONTAL)
                  </Text>
                  <Text style={{ color: "#94a3b8", fontSize: 11, lineHeight: 16 }}>
                    Perubahan Relative Strength sektor dalam{" "}
                    <Text style={{ color: "#e2e8f0", fontWeight: "600" }}>2 minggu terakhir</Text>.
                    Bar memanjang ke kanan (
                    <Text style={{ color: "#34d399", fontWeight: "700" }}>↑ hijau</Text>
                    ) = momentum naik. Bar ke kiri (
                    <Text style={{ color: "#f87171", fontWeight: "700" }}>↓ merah</Text>
                    ) = momentum melemah.
                  </Text>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: "#1e2d45", marginHorizontal: 14 }} />

                {/* Section 4: Akumulasi + Chip */}
                <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, gap: 4 }}>
                  <Text style={{ color: "#94a3b8", fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 2 }}>
                    ANGKA DI KARTU SAHAM
                  </Text>
                  <Text style={{ color: "#94a3b8", fontSize: 11, lineHeight: 16 }}>
                    <Text style={{ color: "#e2e8f0", fontWeight: "600" }}>% Akumulasi</Text>
                    {" "}= persentase saham dalam sektor yang sedang dalam fase akumulasi (net buy institusi aktif). Contoh: 59% (10/17) artinya 10 dari 17 saham sedang diakumulasi.
                  </Text>
                  <Text style={{ color: "#94a3b8", fontSize: 11, lineHeight: 16, marginTop: 4 }}>
                    <Text style={{ color: "#e2e8f0", fontWeight: "600" }}>Angka di chip saham</Text>
                    {" "}= Bandar Score individual saham (0–100). Titik{" "}
                    <Text style={{ color: "#34d399", fontWeight: "700" }}>● hijau</Text>
                    {" "}= saham sedang diakumulasi. Tap chip untuk buka detail saham.
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, gap: 10 }}>
              <Text style={{ fontSize: 32 }}>🔄</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                {filterPhase
                  ? `Tidak ada sektor "${filterPhase}"`
                  : "Data sektor tidak tersedia"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
