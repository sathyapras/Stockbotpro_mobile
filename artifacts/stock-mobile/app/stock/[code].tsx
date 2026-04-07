import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, {
  Circle,
  Line,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  PHASE_CONFIG,
  TREND_CONFIG,
  getFlowScoreColor,
} from "@/services/smartMoneyEngine";
import {
  Verdict,
  computeVerdict,
  fetchStockDetail,
} from "@/services/stockDetailService";
import { formatVol } from "@/services/stockToolsService";

type Tab = "plan" | "financials" | "smartmoney" | "levels";

// ─── Helpers ─────────────────────────────────────────────────

function fRp(n: number | null | undefined): string {
  if (!n) return "–";
  return n.toLocaleString("id-ID");
}

// ─── Score ring (SVG) ─────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, score) / 100) * c;
  return (
    <Svg width={60} height={60} viewBox="0 0 60 60">
      <Circle cx={30} cy={30} r={r} fill="none" stroke={color + "30"} strokeWidth={5} />
      <Circle
        cx={30} cy={30} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform="rotate(-90, 30, 30)"
      />
      <SvgText x={30} y={35} textAnchor="middle" fontSize={13} fontWeight="bold" fill={color}>
        {Math.round(score)}
      </SvgText>
    </Svg>
  );
}

// ─── Small info blocks ────────────────────────────────────────

function InfoBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={styles.infoBlock}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: color ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

// ─── Tab 1: Trading Plan ──────────────────────────────────────

function TradingPlanTab({
  plan,
  verdict,
}: {
  plan: NonNullable<ReturnType<typeof fetchStockDetail> extends Promise<infer T> ? T : never>["plan"];
  verdict: Verdict;
}) {
  const colors = useColors();
  if (!plan) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.mutedForeground }}>Tidak ada trading plan tersedia</Text>
      </View>
    );
  }

  const rrRatio = plan.rr;
  const hasRR = rrRatio > 0;

  const signals = [
    { ok: (plan.rsi ?? 50) < 40, text: `RSI ${plan.rsi?.toFixed(0) ?? "–"} — oversold` },
    { ok: plan.type === "BOS", text: "Breakout momentum terkonfirmasi" },
    { ok: plan.type === "BOW" && plan.status === "BUY", text: "BOW signal aktif" },
    { ok: plan.signals.length > 0, text: plan.signals.join(", ") || "–" },
  ].filter(s => s.text !== "–");

  const typeBadgeColor = plan.type === "BOS" ? "#a78bfa" : plan.type === "BOW" ? "#34d399" : "#60a5fa";
  const typeBadgeLabel = plan.type === "BOS" ? "Buy on Strength" : plan.type === "BOW" ? "Buy on Weakness" : "Derived";

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* Source badge */}
      <View style={[styles.sourceBadge, { backgroundColor: typeBadgeColor + "20", borderColor: typeBadgeColor + "50" }]}>
        <Text style={[styles.sourceBadgeText, { color: typeBadgeColor }]}>
          📡 Data: {typeBadgeLabel}
          {plan.grade !== "–" ? `  ·  Grade ${plan.grade}` : ""}
          {plan.holdDays ? `  ·  ${plan.holdDays}` : ""}
        </Text>
      </View>

      {/* Target + SL side by side */}
      <View style={styles.planBoxRow}>
        <View style={[styles.planBox, { borderColor: "#34d39960", backgroundColor: "#34d39910" }]}>
          <Text style={styles.planBoxIcon}>🎯</Text>
          <Text style={[styles.planBoxLabel, { color: colors.mutedForeground }]}>Target (TP1)</Text>
          <Text style={[styles.planBoxValue, { color: "#34d399" }]}>{fRp(plan.tp1)}</Text>
          {plan.tp1Pct > 0 && (
            <Text style={[styles.planBoxSub, { color: "#34d399" }]}>+{plan.tp1Pct.toFixed(1)}%</Text>
          )}
        </View>
        <View style={[styles.planBox, { borderColor: "#f8717160", backgroundColor: "#f8717110" }]}>
          <Text style={styles.planBoxIcon}>🔴</Text>
          <Text style={[styles.planBoxLabel, { color: colors.mutedForeground }]}>Stop Loss</Text>
          <Text style={[styles.planBoxValue, { color: "#f87171" }]}>{fRp(plan.stopLoss)}</Text>
          {plan.slPct !== 0 && (
            <Text style={[styles.planBoxSub, { color: "#f87171" }]}>{plan.slPct.toFixed(1)}%</Text>
          )}
        </View>
      </View>

      {/* Entry + TP2 */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <InfoBlock
            label="Entry"
            value={plan.entryHigh ? `${fRp(plan.entry)}–${fRp(plan.entryHigh)}` : fRp(plan.entry)}
            color="#fbbf24"
          />
          {plan.tp2 > 0 && <InfoBlock label="TP2" value={fRp(plan.tp2)} color="#a78bfa" />}
          {plan.rsi !== null && <InfoBlock label="RSI" value={plan.rsi.toFixed(0)} color={plan.rsi < 35 ? "#34d399" : plan.rsi > 65 ? "#f87171" : colors.foreground} />}
          {plan.stochK !== null && <InfoBlock label="StochK" value={plan.stochK.toFixed(0)} />}
        </View>
      </View>

      {/* RR Bar */}
      {hasRR && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rrHeader}>
            <Text style={[styles.rrLabel, { color: colors.mutedForeground }]}>Risk / Reward</Text>
            <Text style={[styles.rrValue, { color: rrRatio >= 2 ? "#34d399" : rrRatio >= 1 ? "#fbbf24" : "#f87171" }]}>
              1 : {rrRatio.toFixed(1)}
            </Text>
          </View>
          <View style={styles.rrBarRow}>
            <View style={[styles.rrBarRisk, { flex: 1 }]} />
            <View style={[styles.rrBarReward, { flex: Math.max(0.3, rrRatio) }]} />
          </View>
          <View style={styles.rrBarLabels}>
            <Text style={{ color: "#f87171", fontSize: 9 }}>Risk {Math.abs(plan.slPct).toFixed(1)}%</Text>
            <Text style={{ color: "#34d399", fontSize: 9 }}>Reward {plan.tp1Pct.toFixed(1)}%</Text>
          </View>
        </View>
      )}

      {/* Signal checklist */}
      <SectionTitle title="KONFIRMASI SINYAL" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 8 }]}>
        {signals.map((s, i) => (
          <View key={i} style={styles.signalRow}>
            <Text style={{ fontSize: 14 }}>{s.ok ? "✅" : "⬜"}</Text>
            <Text style={[styles.signalText, { color: s.ok ? colors.foreground : colors.mutedForeground }]}>
              {s.text}
            </Text>
          </View>
        ))}
      </View>

      {/* Commentary */}
      {plan.commentary ? (
        <>
          <SectionTitle title="ROBO COMMENTARY" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.commentary, { color: colors.mutedForeground }]}>
              {plan.commentary}
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

// ─── Tab 2: Financials ────────────────────────────────────────

function FinancialsTab({ quote, broker1d }: {
  quote: NonNullable<any>;
  broker1d: any;
}) {
  const colors = useColors();
  const rsi = quote.rsi;
  const rsiColor = rsi < 30 ? "#34d399" : rsi > 70 ? "#f87171" : "#60a5fa";
  const rsiLabel = rsi < 30 ? "Oversold" : rsi > 70 ? "Overbought" : "Normal";
  const price = quote.price;

  function MARow({ label, ma }: { label: string; ma: number }) {
    if (!ma) return null;
    const above = price > ma;
    return (
      <View style={styles.maRow}>
        <Text style={[styles.maLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <View style={styles.maRight}>
          <Text style={[styles.maValue, { color: colors.foreground }]}>{fRp(ma)}</Text>
          <View style={[styles.maBadge, { backgroundColor: (above ? "#34d399" : "#f87171") + "20" }]}>
            <Text style={[styles.maBadgeText, { color: above ? "#34d399" : "#f87171" }]}>
              {above ? "Above" : "Below"}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const bbWidth = quote.ma20 > 0 ? Math.abs(quote.bbPct) : 0;
  const bbPos = Math.min(100, Math.max(0, quote.bbPct));

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <SectionTitle title="TECHNICAL INDICATORS" />

      {/* RSI Slider */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 8 }]}>
        <View style={styles.indicRow}>
          <Text style={[styles.indicLabel, { color: colors.mutedForeground }]}>RSI (10)</Text>
          <Text style={[styles.indicValue, { color: rsiColor }]}>{rsi.toFixed(1)}</Text>
        </View>
        <View style={styles.rsiTrack}>
          <View style={[styles.rsiZone, { flex: 30, backgroundColor: "#34d39940" }]} />
          <View style={[styles.rsiZone, { flex: 40, backgroundColor: "#60a5fa30" }]} />
          <View style={[styles.rsiZone, { flex: 30, backgroundColor: "#f8717140" }]} />
          <View style={[styles.rsiMarker, { left: `${Math.min(99, Math.max(1, rsi))}%` as any, backgroundColor: rsiColor }]} />
        </View>
        <View style={styles.rsiLabels}>
          <Text style={{ fontSize: 9, color: "#34d399" }}>Oversold 30</Text>
          <Text style={[{ fontSize: 9, fontWeight: "700" }, { color: rsiColor }]}>{rsiLabel}</Text>
          <Text style={{ fontSize: 9, color: "#f87171" }}>Overbought 70</Text>
        </View>
      </View>

      {/* BB */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 6 }]}>
        <View style={styles.indicRow}>
          <Text style={[styles.indicLabel, { color: colors.mutedForeground }]}>Bollinger Band %</Text>
          <Text style={[styles.indicValue, { color: colors.foreground }]}>{quote.bbPct.toFixed(1)}%</Text>
        </View>
        <Text style={[{ fontSize: 10, color: colors.mutedForeground }]}>
          {bbPos < 20 ? "Harga dekat Lower Band — potensi rebound" :
           bbPos > 80 ? "Harga dekat Upper Band — hati-hati overbought" :
           "Harga di tengah band — normal"}
        </Text>
      </View>

      {/* Volume */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <InfoBlock label="Vol Hari Ini" value={formatVol(quote.volK)} color="#60a5fa" />
          <InfoBlock label="Vol Avg 50D" value={formatVol(quote.volAvg50K)} />
          <InfoBlock
            label="Rasio"
            value={quote.volAvg50K > 0 ? `${(quote.volK / quote.volAvg50K).toFixed(1)}x` : "–"}
            color={quote.volK / quote.volAvg50K > 2 ? "#34d399" : colors.foreground}
          />
        </View>
      </View>

      {/* RS */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <InfoBlock label="RS vs IHSG" value={quote.rs.toFixed(3)} color={quote.rs > 1 ? "#34d399" : "#f87171"} />
          <InfoBlock label="RS MA" value={quote.rsMa.toFixed(3)} />
          <InfoBlock label="Score" value={String(quote.totalScore)} color="#a78bfa" />
        </View>
      </View>

      <SectionTitle title="MOVING AVERAGES" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 10 }]}>
        <MARow label="MA 20" ma={quote.ma20} />
        <MARow label="MA 50" ma={quote.ma50} />
        <MARow label="52W High" ma={quote.high52w} />
        {broker1d?.vwap && <MARow label="VWAP" ma={broker1d.vwap} />}
      </View>

      {/* Active strategies from screener */}
      {quote.strategies.length > 0 && (
        <>
          <SectionTitle title="STRATEGI AKTIF HARI INI" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.chipRow}>
              {quote.strategies.map((s: string, i: number) => (
                <View key={i} style={[styles.chip, { backgroundColor: "#60a5fa18", borderColor: "#60a5fa40" }]}>
                  <Text style={{ color: "#60a5fa", fontSize: 11, fontWeight: "600" }}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Broker 1D */}
      {broker1d && (
        <>
          <SectionTitle title="BROKER TODAY (1D)" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.row}>
              <InfoBlock label="Top 1 Broker" value={broker1d.top1} />
              <InfoBlock label="Top 3 Broker" value={broker1d.top3} />
              <InfoBlock label="Top 5 Broker" value={broker1d.top5} />
            </View>
            {broker1d.avgNetBn !== null && (
              <View style={[styles.row, { marginTop: 8 }]}>
                <InfoBlock
                  label="Avg Net (bn)"
                  value={`${broker1d.avgNetBn > 0 ? "+" : ""}${broker1d.avgNetBn.toFixed(1)}B`}
                  color={broker1d.avgNetBn > 0 ? "#34d399" : "#f87171"}
                />
                <InfoBlock label="Acc/Dist" value={broker1d.accDist ?? "–"} color={broker1d.accDist === "Acc" ? "#34d399" : "#f87171"} />
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ─── Tab 3: Smart Money ───────────────────────────────────────

function SmartMoneyTab({ sm, broker1d }: { sm: any; broker1d: any }) {
  const colors = useColors();
  if (!sm) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 32 }}>📊</Text>
        <Text style={[{ color: colors.mutedForeground, textAlign: "center", marginTop: 8 }]}>
          Data Smart Money tidak tersedia untuk saham ini
        </Text>
      </View>
    );
  }

  const phaseCfg = PHASE_CONFIG[sm.phase as keyof typeof PHASE_CONFIG];
  const trendCfg = TREND_CONFIG[sm.flowTrend as keyof typeof TREND_CONFIG];
  const scoreColor = getFlowScoreColor(sm.flowScore);

  const sparkMax = Math.max(...sm.sparkline.map(Math.abs), 1);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* Phase + Score */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: phaseCfg.color + "50", gap: 10 }]}>
        <View style={styles.smHeader}>
          <View>
            <View style={styles.phaseRow}>
              <Text style={{ fontSize: 18 }}>{phaseCfg.icon}</Text>
              <Text style={[styles.phaseLabel, { color: phaseCfg.color }]}>{phaseCfg.label}</Text>
            </View>
            <View style={styles.trendRow}>
              <Text style={[{ fontSize: 13, color: trendCfg.color }]}>
                {trendCfg.icon} {trendCfg.label}
              </Text>
            </View>
          </View>
          <ScoreRing score={sm.flowScore} color={scoreColor} />
        </View>

        {/* Broker bar */}
        {(sm.brokerBuy > 0 || sm.brokerSell > 0) && (
          <View style={styles.brokerBarWrap}>
            <View style={styles.brokerBar}>
              <View style={[styles.brokerBuy, { flex: sm.brokerBuy }]} />
              <View style={[styles.brokerSell, { flex: sm.brokerSell }]} />
            </View>
            <View style={styles.brokerLabels}>
              <Text style={{ color: "#34d399", fontSize: 10, fontWeight: "700" }}>B:{sm.brokerBuy}</Text>
              <Text style={{ color: "#f87171", fontSize: 10, fontWeight: "700" }}>S:{sm.brokerSell}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Sparkline 15D */}
      <SectionTitle title="FLOW 15 HARI" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sparklineContainer}>
          {sm.sparkline.map((v: number, i: number) => {
            const isPos = v >= 0;
            const h = Math.max(2, (Math.abs(v) / sparkMax) * 40);
            return (
              <View key={i} style={styles.sparkBarWrap}>
                {isPos ? (
                  <>
                    <View style={{ height: 40 - h, width: 10 }} />
                    <View style={[styles.sparkBar, { height: h, backgroundColor: "#34d399" }]} />
                    <View style={{ height: 40 }} />
                  </>
                ) : (
                  <>
                    <View style={{ height: 40 }} />
                    <View style={[styles.sparkBar, { height: h, backgroundColor: "#f87171" }]} />
                    <View style={{ height: 40 - h, width: 10 }} />
                  </>
                )}
              </View>
            );
          })}
        </View>
        <Text style={[{ fontSize: 9, color: colors.mutedForeground, marginTop: 4, textAlign: "center" }]}>
          ← 15 hari lalu · hari ini →
        </Text>
      </View>

      {/* Key metrics */}
      <SectionTitle title="KEY METRICS" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 10 }]}>
        <View style={styles.row}>
          <InfoBlock label="Avg 3D (bn)" value={`${sm.avg3d > 0 ? "+" : ""}${sm.avg3d.toFixed(1)}B`} color={sm.avg3d > 0 ? "#34d399" : "#f87171"} />
          <InfoBlock label="Avg 5D (bn)" value={`${sm.avg5d > 0 ? "+" : ""}${sm.avg5d.toFixed(1)}B`} color={sm.avg5d > 0 ? "#34d399" : "#f87171"} />
          <InfoBlock label="Avg 15D (bn)" value={`${sm.avg15d > 0 ? "+" : ""}${sm.avg15d.toFixed(1)}B`} color={sm.avg15d > 0 ? "#34d399" : "#f87171"} />
        </View>
        <View style={styles.row}>
          <InfoBlock label="Fuel (bn)" value={`${sm.netValBn > 0 ? "+" : ""}${sm.netValBn.toFixed(1)}B`} color={sm.netValBn > 0 ? "#34d399" : "#f87171"} />
          <InfoBlock label="Dominasi" value={sm.dominanceLabel ?? "–"} />
          <InfoBlock label="Net Broker" value={String(sm.brokerNet ?? "–")} color={(sm.brokerNet ?? 0) > 0 ? "#34d399" : "#f87171"} />
        </View>
        {sm.latestVwap ? <InfoBlock label="VWAP" value={fRp(sm.latestVwap)} /> : null}
      </View>

      {/* Consistency */}
      <SectionTitle title="KONSISTENSI 15 HARI" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 8 }]}>
        <View style={styles.consistRow}>
          <Text style={[styles.consistLabel, { color: "#34d399" }]}>
            ✅ Akumulasi: {sm.accDays}/15 hari ({Math.round((sm.accDays / 15) * 100)}%)
          </Text>
        </View>
        <View style={styles.consistRow}>
          <Text style={[styles.consistLabel, { color: "#f87171" }]}>
            🔴 Distribusi: {15 - sm.accDays}/15 hari ({Math.round(((15 - sm.accDays) / 15) * 100)}%)
          </Text>
        </View>
        {/* Progress bar */}
        <View style={[styles.barTrack, { backgroundColor: "#f8717140" }]}>
          <View style={[styles.barFill, { width: `${(sm.accDays / 15) * 100}%` as any, backgroundColor: "#34d399" }]} />
        </View>
        <Text style={[{ fontSize: 10, color: colors.mutedForeground }]}>
          {sm.top1Label && `Top1: ${sm.top1Label}`}
          {sm.top3Label && `  ·  Top3: ${sm.top3Label}`}
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Tab 4: Price Levels ──────────────────────────────────────

function PriceLevelsTab({ quote }: { quote: any }) {
  const colors = useColors();
  if (!quote) return null;

  const price = quote.price;
  const ma20 = quote.ma20;
  const ma50 = quote.ma50;
  const high52w = quote.high52w;
  const low52w = high52w * 0.5; // approximation since not in screener

  // Price range bar
  const allLevels = [price, ma20, ma50, high52w].filter(Boolean);
  const minVal = Math.min(...allLevels) * 0.95;
  const maxVal = Math.max(...allLevels) * 1.05;
  const range = maxVal - minVal;

  function pct(v: number) {
    return range > 0 ? ((v - minVal) / range) * 100 : 50;
  }

  const levels = [
    { label: "52W High", value: high52w, color: "#fbbf24", pct: pct(high52w) },
    { label: "MA 50", value: ma50, color: "#a78bfa", pct: pct(ma50) },
    { label: "MA 20", value: ma20, color: "#60a5fa", pct: pct(ma20) },
    { label: "Harga", value: price, color: colors.primary, pct: pct(price) },
  ].filter(l => l.value > 0).sort((a, b) => b.pct - a.pct);

  const priceVsMa20 = ma20 > 0 ? ((price - ma20) / ma20) * 100 : null;
  const priceVsMa50 = ma50 > 0 ? ((price - ma50) / ma50) * 100 : null;
  const priceVs52w = high52w > 0 ? ((price - high52w) / high52w) * 100 : null;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <SectionTitle title="POSISI HARGA vs LEVEL KUNCI" />

      {/* Visual price range */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 16 }]}>
        {levels.map((lv) => (
          <View key={lv.label} style={styles.levelRow}>
            <Text style={[styles.levelLabel, { color: lv.color }]}>{lv.label}</Text>
            <View style={styles.levelBarWrap}>
              <View style={[styles.levelBarTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.levelBarFill, { width: `${lv.pct}%` as any, backgroundColor: lv.color + "60" }]} />
              </View>
              {lv.label === "Harga" && (
                <View style={[styles.priceMarker, { left: `${lv.pct}%` as any, backgroundColor: lv.color }]} />
              )}
            </View>
            <Text style={[styles.levelValue, { color: lv.label === "Harga" ? colors.foreground : colors.mutedForeground }]}>
              {fRp(lv.value)}
            </Text>
          </View>
        ))}
      </View>

      {/* Distance table */}
      <SectionTitle title="JARAK KE LEVEL KUNCI" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 10 }]}>
        {priceVsMa20 !== null && (
          <View style={styles.distRow}>
            <Text style={[styles.distLabel, { color: colors.mutedForeground }]}>vs MA 20</Text>
            <Text style={[styles.distValue, { color: priceVsMa20 >= 0 ? "#34d399" : "#f87171" }]}>
              {priceVsMa20 >= 0 ? "+" : ""}{priceVsMa20.toFixed(2)}%
            </Text>
          </View>
        )}
        {priceVsMa50 !== null && (
          <View style={styles.distRow}>
            <Text style={[styles.distLabel, { color: colors.mutedForeground }]}>vs MA 50</Text>
            <Text style={[styles.distValue, { color: priceVsMa50 >= 0 ? "#34d399" : "#f87171" }]}>
              {priceVsMa50 >= 0 ? "+" : ""}{priceVsMa50.toFixed(2)}%
            </Text>
          </View>
        )}
        {priceVs52w !== null && (
          <View style={styles.distRow}>
            <Text style={[styles.distLabel, { color: colors.mutedForeground }]}>vs 52W High</Text>
            <Text style={[styles.distValue, { color: priceVs52w >= 0 ? "#34d399" : "#f87171" }]}>
              {priceVs52w >= 0 ? "+" : ""}{priceVs52w.toFixed(2)}%
            </Text>
          </View>
        )}
      </View>

      {/* Volume comparison */}
      <SectionTitle title="ANALISA VOLUME" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 8 }]}>
        <View style={styles.row}>
          <InfoBlock label="Vol Hari Ini" value={formatVol(quote.volK)} color="#60a5fa" />
          <InfoBlock label="Vol Avg 50D" value={formatVol(quote.volAvg50K)} />
        </View>
        {quote.volAvg50K > 0 && (
          <>
            <View style={styles.indicRow}>
              <Text style={[{ fontSize: 11, color: colors.mutedForeground }]}>Vol vs Rata-rata</Text>
              <Text style={[{ fontSize: 13, fontWeight: "800" }, {
                color: quote.volK / quote.volAvg50K >= 2 ? "#34d399" :
                       quote.volK / quote.volAvg50K >= 1 ? "#fbbf24" : "#f87171"
              }]}>
                {(quote.volK / quote.volAvg50K).toFixed(1)}x
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.barFill, {
                width: `${Math.min(100, (quote.volK / quote.volAvg50K) * 50)}%` as any,
                backgroundColor: quote.volK / quote.volAvg50K >= 2 ? "#34d399" : "#60a5fa"
              }]} />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Main screen ─────────────────────────────────────────────

export default function StockDetailScreen() {
  const { code, tab: tabParam } = useLocalSearchParams<{ code: string; tab?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const initialTab: Tab = (tabParam as Tab) || "plan";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const ticker = (code ?? "").toUpperCase();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["stock-detail", ticker],
    queryFn: () => fetchStockDetail(ticker),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const verdict = data ? computeVerdict(data.plan, data.quote) : null;
  const quote = data?.quote;
  const isUp = (quote?.chgPct ?? 0) >= 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: "plan", label: "Trading Plan" },
    { id: "financials", label: "Financials" },
    { id: "smartmoney", label: "Smart Money" },
    { id: "levels", label: "Price Levels" },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: ticker,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.foreground,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[{ color: colors.mutedForeground, marginTop: 12, fontSize: 13 }]}>
              Mengambil data {ticker}...
            </Text>
          </View>
        ) : isError || !data ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 32 }}>⚠️</Text>
            <Text style={[{ color: colors.mutedForeground, textAlign: "center", marginTop: 8 }]}>
              Gagal memuat data {ticker}
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
            {/* ── Header ── */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
              {/* Ticker row */}
              <View style={styles.tickerRow}>
                <View>
                  <Text style={[styles.ticker, { color: colors.foreground }]}>{ticker}</Text>
                  {quote && (
                    <View style={styles.chgRow}>
                      <Text style={[styles.priceText, { color: colors.foreground }]}>
                        {fRp(quote.price)}
                      </Text>
                      <Text style={[styles.chgText, { color: isUp ? "#34d399" : "#f87171" }]}>
                        {isUp ? " ▲ " : " ▼ "}{Math.abs(quote.chgPct).toFixed(2)}%
                      </Text>
                    </View>
                  )}
                </View>
                {verdict && <ScoreRing score={verdict.score} color={verdict.color} />}
              </View>

              {/* Verdict card */}
              {verdict && (
                <View style={[styles.verdictCard, { backgroundColor: verdict.color + "15", borderColor: verdict.color + "40" }]}>
                  <Text style={[styles.verdictEmoji]}>{verdict.emoji}</Text>
                  <View style={styles.verdictText}>
                    <Text style={[styles.verdictLabel, { color: verdict.color }]}>{verdict.label}</Text>
                    <Text style={[styles.verdictSub, { color: colors.mutedForeground }]}>{verdict.sub}</Text>
                    <Text style={[styles.verdictAction, { color: verdict.color }]}>→ {verdict.action}</Text>
                  </View>
                </View>
              )}

              {/* OHLCV stats */}
              {quote && (
                <View style={styles.statsRow}>
                  <InfoBlock label="MA20" value={fRp(quote.ma20)} />
                  <InfoBlock label="MA50" value={fRp(quote.ma50)} />
                  <InfoBlock label="52W H" value={fRp(quote.high52w)} />
                  <InfoBlock label="Vol" value={formatVol(quote.volK)} color="#60a5fa" />
                </View>
              )}

              {/* Tab bar */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tabRow}>
                  {tabs.map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        style={[
                          styles.tabBtn,
                          active && { borderBottomWidth: 2, borderBottomColor: colors.primary },
                        ]}
                        onPress={() => setActiveTab(tab.id)}
                      >
                        <Text style={[styles.tabBtnText, { color: active ? colors.primary : colors.mutedForeground }]}>
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* ── Tab content ── */}
            <View style={{ flex: 1 }}>
              {activeTab === "plan" && (
                <TradingPlanTab plan={data.plan} verdict={verdict!} />
              )}
              {activeTab === "financials" && (
                <FinancialsTab quote={quote} broker1d={data.broker1d} />
              )}
              {activeTab === "smartmoney" && (
                <SmartMoneyTab sm={data.smartMoney} broker1d={data.broker1d} />
              )}
              {activeTab === "levels" && (
                <PriceLevelsTab quote={quote} />
              )}
            </View>
          </>
        )}
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 0, borderBottomWidth: 1 },
  tickerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  ticker: { fontSize: 22, fontWeight: "900" },
  chgRow: { flexDirection: "row", alignItems: "baseline", marginTop: 2 },
  priceText: { fontSize: 20, fontWeight: "800" },
  chgText: { fontSize: 14, fontWeight: "700" },
  verdictCard: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 10, gap: 10, marginBottom: 10, alignItems: "flex-start" },
  verdictEmoji: { fontSize: 24 },
  verdictText: { flex: 1, gap: 2 },
  verdictLabel: { fontSize: 14, fontWeight: "900" },
  verdictSub: { fontSize: 11 },
  verdictAction: { fontSize: 11, fontWeight: "700" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  tabRow: { flexDirection: "row", gap: 0 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  tabBtnText: { fontSize: 12, fontWeight: "700" },
  // Cards
  card: { borderRadius: 12, borderWidth: 1, padding: 12 },
  row: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  infoBlock: { gap: 2, minWidth: 60 },
  infoLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase" },
  infoValue: { fontSize: 13, fontWeight: "700" },
  sectionTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginBottom: -4 },
  // Source badge
  sourceBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  sourceBadgeText: { fontSize: 11, fontWeight: "600" },
  // Plan boxes
  planBoxRow: { flexDirection: "row", gap: 10 },
  planBox: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 14, gap: 4, alignItems: "flex-start" },
  planBoxIcon: { fontSize: 20 },
  planBoxLabel: { fontSize: 10, fontWeight: "600" },
  planBoxValue: { fontSize: 18, fontWeight: "900" },
  planBoxSub: { fontSize: 11, fontWeight: "700" },
  // RR
  rrHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  rrLabel: { fontSize: 11 },
  rrValue: { fontSize: 18, fontWeight: "900" },
  rrBarRow: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden" },
  rrBarRisk: { backgroundColor: "#f87171" },
  rrBarReward: { backgroundColor: "#34d399" },
  rrBarLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  // Signals
  signalRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  signalText: { fontSize: 12, flex: 1, lineHeight: 18 },
  commentary: { fontSize: 11, fontStyle: "italic", lineHeight: 17 },
  // RSI
  indicRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  indicLabel: { fontSize: 11 },
  indicValue: { fontSize: 16, fontWeight: "800" },
  rsiTrack: { height: 8, borderRadius: 4, overflow: "visible", flexDirection: "row", position: "relative" },
  rsiZone: { height: "100%" },
  rsiMarker: { position: "absolute", top: -3, width: 14, height: 14, borderRadius: 7, marginLeft: -7 },
  rsiLabels: { flexDirection: "row", justifyContent: "space-between" },
  // MA
  maRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  maLabel: { fontSize: 11 },
  maRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  maValue: { fontSize: 13, fontWeight: "700" },
  maBadge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  maBadgeText: { fontSize: 9, fontWeight: "700" },
  // Chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  // Smart Money
  smHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  phaseRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  phaseLabel: { fontSize: 16, fontWeight: "900" },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  brokerBarWrap: { gap: 4 },
  brokerBar: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden" },
  brokerBuy: { backgroundColor: "#34d399" },
  brokerSell: { backgroundColor: "#f87171" },
  brokerLabels: { flexDirection: "row", justifyContent: "space-between" },
  sparklineContainer: { flexDirection: "row", gap: 3, height: 80, alignItems: "center" },
  sparkBarWrap: { flexDirection: "column", alignItems: "center" },
  sparkBar: { width: 10, borderRadius: 2 },
  // Consistency
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  consistRow: {},
  consistLabel: { fontSize: 12, fontWeight: "600" },
  // Price levels
  levelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelLabel: { fontSize: 10, fontWeight: "700", width: 60 },
  levelBarWrap: { flex: 1, height: 10, position: "relative" },
  levelBarTrack: { height: 10, borderRadius: 5, overflow: "hidden", flex: 1 },
  levelBarFill: { height: 10, borderRadius: 5 },
  priceMarker: { position: "absolute", top: 0, width: 4, height: 10, borderRadius: 2, marginLeft: -2 },
  levelValue: { fontSize: 11, fontWeight: "700", width: 64, textAlign: "right" },
  // Distance table
  distRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  distLabel: { fontSize: 12 },
  distValue: { fontSize: 14, fontWeight: "800" },
});
