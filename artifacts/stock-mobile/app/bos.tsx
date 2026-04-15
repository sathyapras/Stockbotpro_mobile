import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
  BosRow,
  fmtRp,
  fetchBos,
  getTargetStatus,
  getSLPhaseBadge,
  getTrendBadge,
  getVwapStatus,
  glColor,
  isBuy,
  isHold,
  isSell,
  sortByGL,
} from "@/services/bosService";

// ─── Types ────────────────────────────────────────────────────

type TabId = "BUY" | "HOLD" | "SELL";

// ─── Helpers ──────────────────────────────────────────────────

function formatUploadDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Badge components ─────────────────────────────────────────

function TrendBadge({ trend }: { trend: string }) {
  const { label, color } = getTrendBadge(trend);
  return (
    <View style={[styles.badge, { backgroundColor: color + "22", borderColor: color + "55" }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function SLPhaseBadge({ slPhase }: { slPhase: string }) {
  const badge = getSLPhaseBadge(slPhase);
  if (!badge) return null;
  return (
    <View style={[styles.badge, { backgroundColor: badge.color + "22", borderColor: badge.color + "55" }]}>
      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
    </View>
  );
}

function SecTrendBadge({ secTrend }: { secTrend: string }) {
  const isBear = secTrend.toUpperCase().includes("BEAR");
  const isNM   = secTrend.toUpperCase().includes("NOT MAPPED") || !secTrend;
  const color  = isBear ? "#ef4444" : isNM ? "#64748b" : "#22c55e";
  return (
    <Text style={{ fontSize: 11, color, fontWeight: "600" }}>
      {isBear ? "⚠️ " : ""}{secTrend || "—"}
    </Text>
  );
}

// ─── Target hit banner ────────────────────────────────────────

function TargetHitBanner({ row }: { row: BosRow }) {
  const { tp1Hit, tp2Hit } = getTargetStatus(row);
  if (!tp1Hit) return null;
  return (
    <View style={styles.targetBanner}>
      <Text style={styles.targetBannerText}>
        🎯 {tp2Hit ? "TP2 TERCAPAI!" : "TP1 TERCAPAI!"} &nbsp;
        {tp2Hit ? "Jual posisi · Trail Stop terkunci" : "Jual 50% posisi · Trail Stop aktif"}
      </Text>
    </View>
  );
}

// ─── Commentary expandable ────────────────────────────────────

function Commentary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const lines = text.split("\n");
  const preview = lines.slice(0, 2).join("\n");
  const hasMore = lines.length > 2 || text.length > 120;
  return (
    <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
      <Text style={styles.commentary} numberOfLines={expanded ? undefined : 2}>
        {expanded ? text : preview}
      </Text>
      {hasMore && (
        <Text style={styles.commentaryToggle}>{expanded ? "Sembunyikan ▲" : "Selengkapnya ▼"}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── BUY card ─────────────────────────────────────────────────

function BuyCard({ row, onPress }: { row: BosRow; onPress: () => void }) {
  const colors = useColors();
  const vwap = getVwapStatus(row.vwapFilter);
  const isTrailAbove = row.slPct < 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: "#34d39940" }]}
      onPress={onPress} activeOpacity={0.8}
    >
      <TargetHitBanner row={row} />

      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.signalRow}>
            <Text style={styles.signalDot}>🟢</Text>
            <Text style={[styles.signalLabel, { color: "#34d399" }]}>BUY ON STRENGTH</Text>
          </View>
          <Text style={[styles.ticker, { color: colors.foreground }]}>{row.symbol}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={[styles.price, { color: colors.foreground }]}>{fmtRp(row.close)}</Text>
          <TrendBadge trend={row.trend} />
        </View>
      </View>

      {/* Entry / SL / TP */}
      <View style={styles.levelRow}>
        <View style={styles.levelItem}>
          <Text style={styles.levelLabel}>Entry</Text>
          <Text style={[styles.levelVal, { color: colors.foreground }]}>{row.entry.toLocaleString("id-ID")}</Text>
        </View>
        <View style={styles.levelItem}>
          <Text style={styles.levelLabel}>SL</Text>
          <Text style={[styles.levelVal, { color: isTrailAbove ? "#22c55e" : "#ef4444" }]}>
            {row.stopLoss.toLocaleString("id-ID")}
            {isTrailAbove ? " ↑" : ""}
          </Text>
        </View>
        <View style={styles.levelItem}>
          <Text style={styles.levelLabel}>TP1</Text>
          <Text style={[styles.levelVal, { color: "#22c55e" }]}>{row.tp1.toLocaleString("id-ID")}</Text>
        </View>
        {row.tp2 > 0 && (
          <View style={styles.levelItem}>
            <Text style={styles.levelLabel}>TP2</Text>
            <Text style={[styles.levelVal, { color: "#4ade80" }]}>{row.tp2.toLocaleString("id-ID")}</Text>
          </View>
        )}
      </View>

      {/* Meta chips */}
      <View style={styles.metaRow}>
        <View style={[styles.chip, { backgroundColor: "#34d39918", borderColor: "#34d39940" }]}>
          <Text style={{ color: "#34d399", fontSize: 11, fontWeight: "700" }}>
            R:R 1:{row.rr > 0 ? row.rr.toFixed(1) : "—"}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: "#f9731618", borderColor: "#f9731640" }]}>
          <Text style={{ color: "#f97316", fontSize: 11, fontWeight: "700" }}>
            SL {Math.abs(row.slPct).toFixed(1)}%{isTrailAbove ? " (trail ↑)" : ""}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: "#60a5fa18", borderColor: "#60a5fa40" }]}>
          <Text style={{ color: "#60a5fa", fontSize: 11, fontWeight: "700" }}>
            Vol {row.valB.toFixed(0)}B
          </Text>
        </View>
      </View>

      {/* SL Phase */}
      <SLPhaseBadge slPhase={row.slPhase} />

      {/* VWAP */}
      <Text style={[styles.vwapLine, { color: colors.mutedForeground }]}>
        VWAP: {row.vwapTrend} · <Text style={{ color: vwap.color }}>{vwap.icon} {vwap.label}</Text>
      </Text>

      {/* Sektor */}
      <SecTrendBadge secTrend={row.secTrend} />

      {/* Commentary */}
      <View style={styles.divider} />
      <Commentary text={row.commentary} />
    </TouchableOpacity>
  );
}

// ─── HOLD card ────────────────────────────────────────────────

function HoldCard({ row, onPress }: { row: BosRow; onPress: () => void }) {
  const colors = useColors();
  const vwap = getVwapStatus(row.vwapFilter);
  const isTrailAbove = row.slPct < 0;
  const { tp1Hit, tp2Hit } = getTargetStatus(row);
  const gl = row.glPct;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: "#fbbf2440" }]}
      onPress={onPress} activeOpacity={0.8}
    >
      <TargetHitBanner row={row} />

      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.signalRow}>
            <Text style={styles.signalDot}>🟡</Text>
            <Text style={[styles.signalLabel, { color: "#fbbf24" }]}>HOLD POSITION</Text>
          </View>
          <Text style={[styles.ticker, { color: colors.foreground }]}>{row.symbol}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={[styles.price, { color: colors.foreground }]}>{fmtRp(row.close)}</Text>
          <TrendBadge trend={row.trend} />
        </View>
      </View>

      {/* Entry / Highest */}
      <View style={styles.levelRow}>
        <View style={styles.levelItem}>
          <Text style={styles.levelLabel}>Entry</Text>
          <Text style={[styles.levelVal, { color: colors.foreground }]}>{row.entry.toLocaleString("id-ID")}</Text>
        </View>
        <View style={styles.levelItem}>
          <Text style={styles.levelLabel}>Highest</Text>
          <Text style={[styles.levelVal, { color: "#34d399" }]}>{row.highest.toLocaleString("id-ID")}</Text>
        </View>
        <View style={styles.levelItem}>
          <Text style={styles.levelLabel}>G/L</Text>
          <Text style={[styles.levelVal, { color: glColor(gl) }]}>
            {gl > 0 ? "+" : ""}{gl.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.levelItem}>
          <Text style={styles.levelLabel}>Hold</Text>
          <Text style={[styles.levelVal, { color: colors.mutedForeground }]}>{row.hold}</Text>
        </View>
      </View>

      {/* SL + Phase */}
      <View style={styles.slRow}>
        <Text style={[styles.slText, { color: isTrailAbove ? "#22c55e" : "#94a3b8" }]}>
          SL: {row.stopLoss.toLocaleString("id-ID")}{isTrailAbove ? " ↑ profit protected" : ""}
        </Text>
        <SLPhaseBadge slPhase={row.slPhase} />
      </View>

      {/* TP targets */}
      <View style={styles.metaRow}>
        <View style={[styles.chip, { backgroundColor: tp1Hit ? "#22c55e18" : "#94a3b818", borderColor: tp1Hit ? "#22c55e40" : "#94a3b840" }]}>
          <Text style={{ color: tp1Hit ? "#22c55e" : "#94a3b8", fontSize: 11, fontWeight: "700" }}>
            TP1: {row.tp1.toLocaleString("id-ID")}{tp1Hit ? " ✅" : ""}
          </Text>
        </View>
        {row.tp2 > 0 && (
          <View style={[styles.chip, { backgroundColor: tp2Hit ? "#22c55e18" : "#94a3b818", borderColor: tp2Hit ? "#22c55e40" : "#94a3b840" }]}>
            <Text style={{ color: tp2Hit ? "#22c55e" : "#94a3b8", fontSize: 11, fontWeight: "700" }}>
              TP2: {row.tp2.toLocaleString("id-ID")}{tp2Hit ? " ✅" : ""}
            </Text>
          </View>
        )}
      </View>

      {/* VWAP */}
      <Text style={[styles.vwapLine, { color: colors.mutedForeground }]}>
        VWAP: {row.vwapTrend} · <Text style={{ color: vwap.color }}>{vwap.icon} {vwap.label}</Text>
      </Text>

      {/* Sektor */}
      <SecTrendBadge secTrend={row.secTrend} />

      {/* Commentary */}
      <View style={styles.divider} />
      <Commentary text={row.commentary} />
    </TouchableOpacity>
  );
}

// ─── SELL card ────────────────────────────────────────────────

function SellCard({ row, onPress }: { row: BosRow; onPress: () => void }) {
  const colors = useColors();
  const gl = row.glPct;
  const { tp1Hit, tp2Hit } = getTargetStatus(row);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: "#ef444440" }]}
      onPress={onPress} activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.signalRow}>
            <Text style={styles.signalDot}>🔴</Text>
            <Text style={[styles.signalLabel, { color: "#ef4444" }]}>
              CLOSED{row.exitReason ? ` · ${row.exitReason}` : ""}
            </Text>
          </View>
          <Text style={[styles.ticker, { color: colors.foreground }]}>{row.symbol}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={[styles.price, { color: glColor(gl) }]}>
            {gl > 0 ? "+" : ""}{gl.toFixed(1)}%
          </Text>
          <Text style={[{ color: colors.mutedForeground, fontSize: 11 }]}>{row.hold}</Text>
        </View>
      </View>

      {/* Entry → Sold */}
      <View style={styles.levelRow}>
        <View style={styles.levelItem}>
          <Text style={styles.levelLabel}>Entry</Text>
          <Text style={[styles.levelVal, { color: colors.foreground }]}>{row.entry.toLocaleString("id-ID")}</Text>
        </View>
        <Text style={[styles.levelVal, { color: colors.mutedForeground, alignSelf: "flex-end", marginBottom: 4 }]}>→</Text>
        <View style={styles.levelItem}>
          <Text style={styles.levelLabel}>Sold</Text>
          <Text style={[styles.levelVal, { color: glColor(gl) }]}>
            {row.sellPrice > 0 ? row.sellPrice.toLocaleString("id-ID") : "—"}
          </Text>
        </View>
        <View style={styles.levelItem}>
          <Text style={styles.levelLabel}>G/L</Text>
          <Text style={[styles.levelVal, { color: glColor(gl) }]}>
            {gl > 0 ? "+" : ""}{gl.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* TP targets */}
      <View style={styles.metaRow}>
        <View style={[styles.chip, { backgroundColor: tp1Hit ? "#22c55e18" : "#94a3b818", borderColor: tp1Hit ? "#22c55e40" : "#94a3b840" }]}>
          <Text style={{ color: tp1Hit ? "#22c55e" : "#94a3b8", fontSize: 11, fontWeight: "700" }}>
            TP1: {row.tp1.toLocaleString("id-ID")}{tp1Hit ? " ✅" : ""}
          </Text>
        </View>
        {row.tp2 > 0 && (
          <View style={[styles.chip, { backgroundColor: tp2Hit ? "#22c55e18" : "#94a3b818", borderColor: tp2Hit ? "#22c55e40" : "#94a3b840" }]}>
            <Text style={{ color: tp2Hit ? "#22c55e" : "#94a3b8", fontSize: 11, fontWeight: "700" }}>
              TP2: {row.tp2.toLocaleString("id-ID")}{tp2Hit ? " ✅" : ""}
            </Text>
          </View>
        )}
      </View>

      {/* Phase info */}
      <SLPhaseBadge slPhase={row.slPhase} />

      {/* Commentary */}
      {!!row.commentary && (
        <>
          <View style={styles.divider} />
          <Commentary text={row.commentary} />
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Detail Bottom Sheet ──────────────────────────────────────

function DetailSheet({ row, visible, onClose }: { row: BosRow | null; visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  if (!row) return null;

  const { tp1Hit, tp2Hit, trailActive, lockedAt } = getTargetStatus(row);
  const vwap = getVwapStatus(row.vwapFilter);
  const trendBadge = getTrendBadge(row.trend);
  const slBadge = getSLPhaseBadge(row.slPhase);
  const isTrailAbove = row.slPct < 0;
  const gl = row.glPct;

  function Row({ label, val, color }: { label: string; val: string; color?: string }) {
    return (
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.detailVal, { color: color ?? colors.foreground }]}>{val}</Text>
      </View>
    );
  }

  function Section({ title }: { title: string }) {
    return (
      <Text style={[styles.detailSection, { color: colors.mutedForeground, borderBottomColor: colors.border }]}>
        {title}
      </Text>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

        {/* Title */}
        <View style={styles.sheetHeader}>
          <View>
            <Text style={[styles.sheetTicker, { color: colors.foreground }]}>{row.symbol}</Text>
            <Text style={[styles.sheetSubtitle, { color: trendBadge.color }]}>
              {row.trend} · {row.secTrend}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeBtnText, { color: colors.mutedForeground }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Section title="POSISI" />
          <Row label="Entry"     val={fmtRp(row.entry)} />
          <Row label="Stop Loss" val={`${fmtRp(row.stopLoss)}${isTrailAbove ? " ↑ di atas entry" : ""}`}
               color={isTrailAbove ? "#22c55e" : undefined} />
          <Row label="Target 1"  val={`${fmtRp(row.tp1)}${tp1Hit ? " ✅ Tercapai" : ""}`}
               color={tp1Hit ? "#22c55e" : undefined} />
          <Row label="Target 2"  val={`${fmtRp(row.tp2)}${tp2Hit ? " ✅ Tercapai" : ""}`}
               color={tp2Hit ? "#22c55e" : undefined} />
          {row.sellPrice > 0 && (
            <Row label="Sell Price" val={fmtRp(row.sellPrice)} />
          )}
          <Row label="R:R"       val={row.rr > 0 ? `1 : ${row.rr.toFixed(1)}` : "—"} />
          <Row label="SL Jarak"  val={`${Math.abs(row.slPct).toFixed(1)}%${isTrailAbove ? " (trail ↑ profit protected)" : ""}`}
               color={isTrailAbove ? "#22c55e" : undefined} />

          <Section title="FASE SL" />
          {slBadge && (
            <View style={[styles.badge, { backgroundColor: slBadge.color + "22", borderColor: slBadge.color + "55", marginHorizontal: 16, marginBottom: 8 }]}>
              <Text style={[styles.badgeText, { color: slBadge.color }]}>{slBadge.label}</Text>
            </View>
          )}
          {!!row.exitReason && <Row label="Exit" val={row.exitReason} color="#ef4444" />}
          {lockedAt && <Row label="TS Locked" val={`Rp ${lockedAt}`} color="#a855f7" />}

          <Section title="PERFORMA" />
          <Row label="G/L"       val={`${gl > 0 ? "+" : ""}${gl.toFixed(1)}%`} color={glColor(gl)} />
          <Row label="Hold"      val={row.hold} />
          <Row label="Highest"   val={fmtRp(row.highest)} />
          <Row label="Vol Transaksi" val={`Rp ${row.valB.toFixed(0)} B`} />

          <Section title="VWAP & TEKNIKAL" />
          <Row label="VWAP(5)"   val={fmtRp(row.vwap)} />
          <Row label="Trend VWAP" val={row.vwapTrend} />
          <Row label="Jarak vs VWAP" val={`${row.vwapPct > 0 ? "+" : ""}${row.vwapPct.toFixed(1)}%`}
               color={row.vwapPct >= 0 ? "#22c55e" : "#ef4444"} />
          <Row label="Filter"    val={`${vwap.icon} ${vwap.label}`} color={vwap.color} />
          <Row label="Support"   val={fmtRp(row.support)} />
          <Row label="Resistance" val={fmtRp(row.resistance)} />

          {!!row.commentary && (
            <>
              <Section title="ANALISA AFL" />
              <Text style={[styles.sheetCommentary, { color: colors.foreground }]}>
                {row.commentary}
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState({ tab, noData }: { tab: TabId; noData?: boolean }) {
  const labels: Record<TabId, string> = {
    BUY:  "Tidak Ada Sinyal BUY\nSemua posisi sedang dalam status HOLD",
    HOLD: "Tidak Ada Posisi HOLD\nBelum ada posisi yang sedang berjalan",
    SELL: "Tidak Ada Exit\nBelum ada posisi yang ditutup hari ini",
  };
  if (noData) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>Data BOS Belum Tersedia</Text>
        <Text style={styles.emptyDesc}>
          Admin belum mengupload sinyal hari ini.{"\n"}
          Coba lagi besok pagi setelah market open (09:00 WIB)
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>✅</Text>
      <Text style={styles.emptyDesc}>{labels[tab]}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────

export default function BosScreen() {
  const router  = useRouter();
  const colors  = useColors();
  const insets  = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabId>("HOLD");
  const [detail, setDetail]       = useState<BosRow | null>(null);
  const [sheetVisible, setSheet]  = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["bos"],
    queryFn:  fetchBos,
    staleTime: 5 * 60 * 1000,
    retry: (count, err: any) => err?.message !== "NO_DATA" && count < 2,
  });

  const noData = (error as any)?.message === "NO_DATA";

  const allRows  = data?.data ?? [];
  const buyRows  = sortByGL(allRows.filter(isBuy));
  const holdRows = sortByGL(allRows.filter(isHold));
  const sellRows = sortByGL(allRows.filter(isSell));

  const tabRows: Record<TabId, BosRow[]> = { BUY: buyRows, HOLD: holdRows, SELL: sellRows };
  const rows = tabRows[activeTab];

  function openDetail(row: BosRow) {
    setDetail(row);
    setSheet(true);
  }

  const tabs: { id: TabId; emoji: string; count: number }[] = [
    { id: "BUY",  emoji: "🟢", count: buyRows.length  },
    { id: "HOLD", emoji: "🟡", count: holdRows.length },
    { id: "SELL", emoji: "🔴", count: sellRows.length },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, {
        paddingTop: Platform.OS === "web" ? 16 : insets.top + 8,
        backgroundColor: colors.background,
        borderBottomColor: colors.border,
      }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backArrow, { color: colors.mutedForeground }]}>‹</Text>
          <Text style={[styles.backLabel, { color: colors.mutedForeground }]}>Kembali</Text>
        </TouchableOpacity>

        <View style={styles.headerTitle}>
          <Text style={[styles.screenTitle, { color: "#34d399" }]}>📈 Jejak Cuan</Text>
          <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
            Buy on Strength Signal
          </Text>
        </View>

        {/* Meta info bar */}
        {data?.meta && (
          <View style={[styles.metaBar, { backgroundColor: "#34d39910", borderColor: "#34d39930" }]}>
            <Text style={[styles.metaBarText, { color: "#34d399" }]}>
              Data: {formatUploadDate(data.meta.uploadedAt)} · {data.meta.rows} posisi
            </Text>
          </View>
        )}

        {/* Sub-tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {tabs.map(t => {
            const active = activeTab === t.id;
            const tabColor = t.id === "BUY" ? "#34d399" : t.id === "HOLD" ? "#fbbf24" : "#ef4444";
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tab, active && { borderBottomColor: tabColor, borderBottomWidth: 2.5 }]}
                onPress={() => setActiveTab(t.id)}
              >
                <Text style={[styles.tabText, { color: active ? tabColor : colors.mutedForeground }]}>
                  {t.emoji} {t.id} ({t.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#34d399" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Mengambil data BOS Explorer...
          </Text>
        </View>
      ) : noData ? (
        <EmptyState tab={activeTab} noData />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 32 }}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Gagal memuat data. Cek koneksi dan coba lagi.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={r => r.symbol}
          renderItem={({ item }) => {
            if (activeTab === "BUY")  return <BuyCard  row={item} onPress={() => openDetail(item)} />;
            if (activeTab === "SELL") return <SellCard row={item} onPress={() => openDetail(item)} />;
            return <HoldCard row={item} onPress={() => openDetail(item)} />;
          }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => refetch()}
              tintColor="#34d399"
            />
          }
          ListEmptyComponent={<EmptyState tab={activeTab} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Detail Sheet ── */}
      <DetailSheet row={detail} visible={sheetVisible} onClose={() => setSheet(false)} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  backArrow: { fontSize: 24, fontWeight: "300", lineHeight: 28 },
  backLabel: { fontSize: 13 },
  headerTitle: { marginBottom: 8 },
  screenTitle: { fontSize: 20, fontWeight: "900" },
  screenSub: { fontSize: 11, marginTop: 2 },
  metaBar: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10, alignSelf: "flex-start" },
  metaBarText: { fontSize: 12, fontWeight: "700" },

  // Tabs
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10 },
  tabText: { fontSize: 12, fontWeight: "800" },

  // Card
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardHeaderLeft: { flex: 1, gap: 2 },
  cardHeaderRight: { alignItems: "flex-end", gap: 4 },
  signalRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  signalDot: { fontSize: 10 },
  signalLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  ticker: { fontSize: 22, fontWeight: "900" },
  price: { fontSize: 15, fontWeight: "800" },

  // Levels
  levelRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  levelItem: { gap: 2 },
  levelLabel: { fontSize: 9, color: "#64748b", fontWeight: "700", textTransform: "uppercase" },
  levelVal: { fontSize: 13, fontWeight: "800" },

  // Meta chips
  metaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },

  // Badge
  badge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "700" },

  // SL row
  slRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  slText: { fontSize: 12, fontWeight: "600" },

  // VWAP
  vwapLine: { fontSize: 11 },

  // Commentary
  commentary: { fontSize: 12, color: "#94a3b8", lineHeight: 17 },
  commentaryToggle: { fontSize: 11, color: "#0ea5e9", marginTop: 2 },

  // Divider
  divider: { height: 1, backgroundColor: "#1e293b", marginVertical: 2 },

  // Target banner
  targetBanner: { backgroundColor: "#22c55e18", borderRadius: 8, borderWidth: 1, borderColor: "#22c55e40", padding: 8 },
  targetBannerText: { color: "#22c55e", fontWeight: "800", fontSize: 12 },

  // List
  list: { paddingHorizontal: 16, paddingTop: 10 },

  // Center / loading / error
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10, minHeight: 250 },
  loadingText: { fontSize: 13, textAlign: "center" },
  errorText: { fontSize: 14, textAlign: "center" },
  retryBtn: { backgroundColor: "#34d399", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },

  // Empty state
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#e2e8f0", marginBottom: 6, textAlign: "center" },
  emptyDesc: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 20 },

  // Detail sheet
  sheetOverlay: { flex: 1, backgroundColor: "#00000060" },
  sheet: { maxHeight: "80%", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, marginBottom: 8 },
  sheetTicker: { fontSize: 24, fontWeight: "900" },
  sheetSubtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: { padding: 6 },
  closeBtnText: { fontSize: 18 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 6 },
  detailLabel: { fontSize: 13 },
  detailVal: { fontSize: 13, fontWeight: "700", textAlign: "right", flex: 1, marginLeft: 8 },
  detailSection: { fontSize: 10, fontWeight: "800", letterSpacing: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4, borderBottomWidth: 1, marginBottom: 4 },
  sheetCommentary: { fontSize: 13, lineHeight: 20, paddingHorizontal: 20, paddingVertical: 10 },
});
