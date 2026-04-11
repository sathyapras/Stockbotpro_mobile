import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import {
  type Candle,
  PERIODS,
  fetchHistorical,
  filterByPeriod,
  shortDateLabel,
} from "@/services/historicalService";

import { useColors } from "@/hooks/useColors";
import {
  PHASE_CONFIG,
  TREND_CONFIG,
  getFlowScoreColor,
} from "@/services/smartMoneyEngine";
import {
  getBandarStrength,
  getFlowLabel,
} from "@/services/radarMarketService";
import {
  TradingPlan,
  Verdict,
  computeVerdict,
  fetchStockDetail,
} from "@/services/stockDetailService";
import { formatVol } from "@/services/stockToolsService";
import { type MasterStock } from "@/services/masterStockService";

// ─── Tab types ────────────────────────────────────────────────

type Tab = "plan" | "chart" | "financials" | "smartmoney" | "levels";

// ─── Helpers ─────────────────────────────────────────────────

function fRp(n: number | null | undefined): string {
  if (!n) return "–";
  return n.toLocaleString("id-ID");
}

const GRADE_COLOR: Record<string, string> = {
  A: "#34d399", B: "#60a5fa", C: "#fbbf24", D: "#f87171",
};

// ─── Score ring ───────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 22, c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, score)) / 100) * c;
  return (
    <Svg width={60} height={60} viewBox="0 0 60 60">
      <Circle cx={30} cy={30} r={r} fill="none" stroke={color + "30"} strokeWidth={5} />
      <Circle cx={30} cy={30} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform="rotate(-90, 30, 30)" />
      <SvgText x={30} y={35} textAnchor="middle" fontSize={13} fontWeight="bold" fill={color}>
        {Math.round(score)}
      </SvgText>
    </Svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function InfoCell({ label, value, color, colors }: {
  label: string; value: string; color?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: "700", marginBottom: 3 }}>
        {label}
      </Text>
      <Text style={{ color: color ?? colors.foreground, fontSize: 14, fontWeight: "700" }}>
        {value}
      </Text>
    </View>
  );
}

/** Parse "=== LABEL ===" prefix + body from commentary text */
function parseCommentary(raw: string): { badge: string | null; body: string } | null {
  if (!raw?.trim()) return null;
  const match = raw.trim().match(/^={2,}\s*(.*?)\s*={2,}\s*([\s\S]*)/);
  if (match) {
    const badge = match[1]?.trim() || null;
    const body = match[2]?.trim() ?? "";
    if (!body) return null; // badge only, no body — skip
    return { badge, body };
  }
  return { badge: null, body: raw.trim() };
}

/** Robo Commentary block — parses and renders nicely */
function RoboCommentary({ commentary, colors }: {
  commentary: string;
  colors: ReturnType<typeof useColors>;
}) {
  const parsed = parseCommentary(commentary);
  if (!parsed) return null;
  return (
    <>
      <SectionTitle title="ROBO COMMENTARY" colors={colors} />
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 8 }}>
        {parsed.badge && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 3, height: 16, borderRadius: 2,
              backgroundColor: "#60a5fa" }} />
            <Text style={{ color: "#60a5fa", fontSize: 10, fontWeight: "800",
              letterSpacing: 0.5 }}>
              {parsed.badge}
            </Text>
          </View>
        )}
        <Text style={{ color: colors.foreground, fontSize: 12,
          lineHeight: 18, opacity: 0.85 }}>
          {parsed.body}
        </Text>
      </View>
    </>
  );
}

function SectionTitle({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: "700",
      letterSpacing: 0.5, marginBottom: 4 }}>
      {title}
    </Text>
  );
}

// 3-state bullet item: true=✅, "warn"=⚠️, false=☐
function BulletItem({ ok, text, colors }: {
  ok: boolean | "warn"; text: string;
  colors: ReturnType<typeof useColors>;
}) {
  const icon = ok === "warn" ? "⚠️" : ok ? "✅" : "☐";
  const textColor = ok === "warn" ? "#fbbf24" : ok ? colors.foreground : colors.mutedForeground;
  return (
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
      <Text style={{ fontSize: 13, lineHeight: 18 }}>{icon}</Text>
      <Text style={{ color: textColor, fontSize: 12, flex: 1, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

// ─── Signal badge ─────────────────────────────────────────────

function SignalSourceBadge({ plan, colors }: {
  plan: TradingPlan; colors: ReturnType<typeof useColors>;
}) {
  const src = plan.type === "BOW" ? "Buy on Weakness"
    : plan.type === "BOS" ? "Buy on Strength" : "Derived";
  const gradeColor = GRADE_COLOR[plan.grade] ?? "#94a3b8";
  const isHold = plan.status.toUpperCase().includes("HOLD");
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 8,
      borderRadius: 10, backgroundColor: "#34d39920", borderWidth: 1, borderColor: "#34d39940",
      flexWrap: "wrap" }}>
      <Text style={{ fontSize: 12 }}>🔰</Text>
      <Text style={{ color: "#34d399", fontWeight: "700", fontSize: 11 }}>Data: {src}</Text>
      {plan.grade !== "–" && (
        <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6,
          backgroundColor: gradeColor + "25", borderWidth: 1, borderColor: gradeColor + "50" }}>
          <Text style={{ color: gradeColor, fontWeight: "900", fontSize: 10 }}>Grade {plan.grade}</Text>
        </View>
      )}
      {plan.holdDays ? (
        <Text style={{ color: "#94a3b8", fontSize: 10 }}>· {plan.holdDays}</Text>
      ) : null}
      {isHold && plan.type === "BOW" && (
        <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6,
          backgroundColor: "#fbbf2425", borderWidth: 1, borderColor: "#fbbf2450" }}>
          <Text style={{ color: "#fbbf24", fontWeight: "700", fontSize: 10 }}>HOLD</Text>
        </View>
      )}
    </View>
  );
}

// ─── Tab 1a: Trading Plan (BUY mode) ─────────────────────────

function TradingPlanContent({ plan, ms, colors }: {
  plan: TradingPlan; ms: MasterStock | null; colors: ReturnType<typeof useColors>;
}) {
  const rsi = plan.rsi ?? 50;
  const hasRR = plan.rr > 0;
  const tp1Pct = plan.tp1Pct;
  const slPct = plan.slPct;

  // Build dynamic bullet checklist
  const bullets: { ok: boolean | "warn"; text: string }[] = [];
  if (plan.type === "BOW") {
    bullets.push({
      ok: plan.status === "BUY" ? true : "warn",
      text: `Status: ${plan.status} · Grade ${plan.grade}`,
    });
    if (plan.score > 0 && plan.conf > 0) {
      bullets.push({ ok: plan.score >= 4, text: `Score: ${plan.score} · Confidence: ${plan.conf}%` });
    }
    if (plan.rsPct !== 0) {
      bullets.push({ ok: plan.rsPct > 0, text: `RS vs IHSG: ${plan.rsPct > 0 ? "+" : ""}${plan.rsPct.toFixed(1)}% — ${plan.rsPct > 0 ? "outperform" : "underperform"}` });
    }
    if (plan.rsi !== null) {
      bullets.push({ ok: plan.rsi < 35, text: `RSI ${plan.rsi.toFixed(0)} — ${plan.rsi < 30 ? "Oversold zona beli 🟢" : plan.rsi < 40 ? "Oversold" : plan.rsi > 65 ? "Overbought" : "Normal"}` });
    }
    if (plan.stochK !== null) {
      bullets.push({ ok: plan.stochK < 25, text: `StochK ${plan.stochK.toFixed(0)} — ${plan.stochK < 20 ? "Oversold" : plan.stochK < 40 ? "Low" : "Normal"}` });
    }
    if (plan.secTrend) {
      const isBull = plan.secTrend.toUpperCase().includes("BULL");
      bullets.push({ ok: isBull ? true : "warn", text: `Sector: ${plan.secTrend}` });
    }
    if (plan.setupType) {
      bullets.push({ ok: "warn", text: `Setup: ${plan.setupType}${plan.action ? " · " + plan.action : ""}` });
    }
    if (plan.signals.length > 0) {
      bullets.push({ ok: true, text: plan.signals.join(", ") });
    }
  } else if (plan.type === "BOS") {
    bullets.push({ ok: plan.status === "BUY", text: `Signal: ${plan.status} · ${plan.signals.slice(0, 2).join(" · ")}` });
    if (plan.holdDays) bullets.push({ ok: "warn", text: `Durasi posisi: ${plan.holdDays}` });
    if (plan.vwapTrend) {
      const vwapUp = plan.vwapTrend.toUpperCase().includes("NAIK");
      bullets.push({ ok: vwapUp, text: `VWAP Trend: ${plan.vwapTrend}${plan.vwap ? " · VWAP " + fRp(plan.vwap) : ""}` });
    }
    if (plan.pctVsVwap !== 0) {
      bullets.push({ ok: plan.pctVsVwap >= 0, text: `Harga vs VWAP: ${plan.pctVsVwap > 0 ? "+" : ""}${plan.pctVsVwap.toFixed(1)}%` });
    }
  } else {
    // Computed
    if (plan.rsi !== null) {
      bullets.push({ ok: plan.rsi < 35, text: `RSI ${plan.rsi.toFixed(0)} — ${plan.rsi < 35 ? "Oversold" : "Normal"}` });
    }
    if (plan.signals.length > 0) {
      plan.signals.forEach(s => bullets.push({ ok: true, text: s }));
    }
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12 }}>
      <SignalSourceBadge plan={plan} colors={colors} />

      {/* Unified price grid — all cells equal size */}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, overflow: "hidden" }}>
        {/* Row 1: Entry · TP1 · Stop Loss */}
        <View style={{ flexDirection: "row" }}>
          {[
            { label: "ENTRY",     value: plan.entryHigh ? `${fRp(plan.entry)}–${fRp(plan.entryHigh)}` : fRp(plan.entry), sub: null,                      color: "#fbbf24" },
            { label: "TARGET TP1",value: fRp(plan.tp1),  sub: tp1Pct > 0 ? `+${tp1Pct.toFixed(1)}%` : null,            color: "#34d399" },
            { label: "STOP LOSS", value: fRp(plan.stopLoss), sub: slPct > 0 ? `-${slPct.toFixed(1)}%` : null,           color: "#f87171" },
          ].map((cell, i) => (
            <View key={cell.label} style={{
              flex: 1, padding: 12, alignItems: "center",
              borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: colors.border,
              backgroundColor: i === 1 ? "#34d39908" : i === 2 ? "#f8717108" : "transparent",
            }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: "700",
                marginBottom: 4, textAlign: "center" }}>{cell.label}</Text>
              <Text style={{ color: cell.color, fontWeight: "800", fontSize: 15,
                textAlign: "center" }}>{cell.value}</Text>
              {cell.sub && (
                <Text style={{ color: cell.color, fontSize: 11, fontWeight: "600",
                  marginTop: 2 }}>{cell.sub}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.border }} />

        {/* Row 2: TP2 · R/R · StochK (or Support if stochK unavailable) */}
        <View style={{ flexDirection: "row" }}>
          {[
            { label: "TP2",    value: plan.tp2 > 0 ? (() => {
                const pct = plan.entry > 0 ? ((plan.tp2 - plan.entry) / plan.entry) * 100 : 0;
                return `${fRp(plan.tp2)}${pct > 0 ? ` (+${pct.toFixed(1)}%)` : ""}`;
              })() : "–",  color: "#60a5fa" },
            { label: "R / R",  value: hasRR ? `1 : ${plan.rr.toFixed(1)}` : "–",
              color: plan.rr >= 2 ? "#34d399" : plan.rr >= 1 ? "#fbbf24" : "#f87171" },
            plan.stochK !== null
              ? { label: "STOCHK", value: plan.stochK.toFixed(0),
                  color: plan.stochK < 20 ? "#34d399" : plan.stochK < 40 ? "#fbbf24" : "#94a3b8" }
              : ms?.support && ms.support > 0
                ? { label: "SUPPORT", value: fRp(ms.support), color: "#34d399" }
                : { label: "STOCHK", value: "–", color: "#94a3b8" },
          ].map((cell, i) => (
            <View key={cell.label} style={{
              flex: 1, padding: 12, alignItems: "center",
              borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: colors.border,
            }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: "700",
                marginBottom: 4 }}>{cell.label}</Text>
              <Text style={{ color: cell.color, fontWeight: "800", fontSize: 15 }}>{cell.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* RR Bar */}
      {hasRR && (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Risk / Reward</Text>
            <Text style={{ color: plan.rr >= 2 ? "#34d399" : plan.rr >= 1 ? "#fbbf24" : "#f87171",
              fontWeight: "900", fontSize: 18 }}>
              1 : {plan.rr.toFixed(1)}
            </Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, overflow: "hidden", flexDirection: "row" }}>
            <View style={{ flex: 1, backgroundColor: "#f87171" }} />
            <View style={{ flex: Math.max(0.3, plan.rr), backgroundColor: "#34d399" }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#f87171", fontSize: 10 }}>Risk {slPct.toFixed(1)}%</Text>
            <Text style={{ color: "#34d399", fontSize: 10 }}>Reward {tp1Pct.toFixed(1)}%</Text>
          </View>
        </View>
      )}

      {/* Support & Resistance levels from MASTER_STOCK_DB */}
      {ms && (ms.support > 0 || ms.resistance > 0) && (
        <>
          <SectionTitle title="SUPPORT & RESISTANCE" colors={colors} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {ms.support > 0 && (
              <View style={{ flex: 1, borderRadius: 12, borderWidth: 1,
                borderColor: "#34d39940", backgroundColor: "#34d39910",
                padding: 12, alignItems: "center" }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: "700", marginBottom: 4 }}>
                  🟢 SUPPORT
                </Text>
                <Text style={{ color: "#34d399", fontWeight: "800", fontSize: 16 }}>
                  {fRp(ms.support)}
                </Text>
              </View>
            )}
            {ms.resistance > 0 && (
              <View style={{ flex: 1, borderRadius: 12, borderWidth: 1,
                borderColor: "#f8717140", backgroundColor: "#f8717110",
                padding: 12, alignItems: "center" }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: "700", marginBottom: 4 }}>
                  🔴 RESISTANCE
                </Text>
                <Text style={{ color: "#f87171", fontWeight: "800", fontSize: 16 }}>
                  {fRp(ms.resistance)}
                </Text>
              </View>
            )}
            {ms.vwap > 0 && (
              <View style={{ flex: 1, borderRadius: 12, borderWidth: 1,
                borderColor: "#38BDF840", backgroundColor: "#38BDF810",
                padding: 12, alignItems: "center" }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: "700", marginBottom: 4 }}>
                  💧 VWAP
                </Text>
                <Text style={{ color: "#38BDF8", fontWeight: "800", fontSize: 16 }}>
                  {fRp(ms.vwap)}
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Bullet checklist */}
      <SectionTitle title="KONFIRMASI SINYAL" colors={colors} />
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12 }}>
        {bullets.map((b, i) => (
          <BulletItem key={i} ok={b.ok} text={b.text} colors={colors} />
        ))}
      </View>

      {/* Commentary */}
      <RoboCommentary commentary={plan.commentary} colors={colors} />
    </ScrollView>
  );
}

// ─── Tab 1b: Hold Mode / Trading Position ────────────────────

function HoldModeContent({ plan, price, colors }: {
  plan: TradingPlan; price: number; colors: ReturnType<typeof useColors>;
}) {
  const pl = plan.type === "BOW" ? plan.holdPl : plan.glPct;
  const plColor = pl > 0 ? "#34d399" : pl < 0 ? "#f87171" : "#94a3b8";
  const plLabel = pl > 0 ? "Posisi untung 🟢" : pl < 0 ? "Posisi rugi 🔴" : "Breakeven";
  const upside = plan.tp1 > 0 && price > 0
    ? ((plan.tp1 - price) / price * 100)
    : null;
  const daysHeld = plan.holdDays;

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12 }}>
      <SignalSourceBadge plan={plan} colors={colors} />

      {/* P/L + Entry header */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, padding: 16, borderRadius: 16,
          backgroundColor: plColor + "10", borderWidth: 2, borderColor: plColor + "40" }}>
          <Text style={{ color: "#94a3b8", fontSize: 9, fontWeight: "700" }}>📊 P/L POSISI</Text>
          <Text style={{ color: plColor, fontWeight: "900", fontSize: 28, marginTop: 4 }}>
            {pl > 0 ? "+" : ""}{pl.toFixed(1)}%
          </Text>
          <Text style={{ color: plColor, fontSize: 11 }}>{plLabel}</Text>
        </View>
        <View style={{ flex: 1, padding: 16, borderRadius: 16,
          backgroundColor: "#fbbf2410", borderWidth: 2, borderColor: "#fbbf2440" }}>
          <Text style={{ color: "#94a3b8", fontSize: 9, fontWeight: "700" }}>🗓 HARGA MASUK</Text>
          <Text style={{ color: "#fbbf24", fontWeight: "900", fontSize: 28, marginTop: 4 }}>
            {fRp(plan.entry)}
          </Text>
          {upside !== null && (
            <>
              <Text style={{ color: "#94a3b8", fontSize: 9 }}>Sisa upside ke target</Text>
              <Text style={{ color: upside > 0 ? "#34d399" : "#f87171", fontSize: 13, fontWeight: "700" }}>
                {upside > 0 ? "+" : ""}{upside.toFixed(1)}%
              </Text>
            </>
          )}
        </View>
      </View>

      {/* TP1 + SL small blocks */}
      <View style={{ flexDirection: "row", justifyContent: "space-between",
        padding: 12, borderRadius: 12, backgroundColor: colors.card,
        borderWidth: 1, borderColor: colors.border }}>
        <InfoCell label="TARGET (TP1)" value={fRp(plan.tp1)} color="#34d399" colors={colors} />
        <InfoCell label="STOP LOSS" value={fRp(plan.stopLoss)} color="#f87171" colors={colors} />
        {plan.tp2 > 0 && <InfoCell label="TP2" value={(() => {
          const pct = plan.entry > 0 ? ((plan.tp2 - plan.entry) / plan.entry) * 100 : 0;
          return `${fRp(plan.tp2)}${pct > 0 ? ` (+${pct.toFixed(1)}%)` : ""}`;
        })()} color="#60a5fa" colors={colors} />}
        {daysHeld ? <InfoCell label="DURASI" value={daysHeld} colors={colors} /> : null}
      </View>

      {/* BOS-specific: highest + VWAP */}
      {plan.type === "BOS" && (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
          backgroundColor: colors.card, padding: 12, gap: 8 }}>
          {plan.highest > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Harga tertinggi sejak entry</Text>
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>{fRp(plan.highest)}</Text>
            </View>
          )}
          {plan.vwap > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>VWAP · {plan.vwapTrend}</Text>
              <Text style={{ color: "#38BDF8", fontWeight: "700" }}>{fRp(plan.vwap)}</Text>
            </View>
          )}
          {plan.pctVsVwap !== 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>% vs VWAP</Text>
              <Text style={{ color: plan.pctVsVwap >= 0 ? "#34d399" : "#f87171", fontWeight: "700" }}>
                {plan.pctVsVwap > 0 ? "+" : ""}{plan.pctVsVwap.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Hold guidance */}
      <SectionTitle title="PANDUAN HOLD" colors={colors} />
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 6 }}>
        <Text style={{ color: "#34d399", fontSize: 12 }}>
          ✓ Pertahankan selama di atas {fRp(plan.stopLoss)}
        </Text>
        {plan.tp1 > 0 && (
          <Text style={{ color: "#60a5fa", fontSize: 12 }}>
            → Partial profit di {fRp(plan.tp1)}
          </Text>
        )}
        {plan.tp2 > 0 && (
          <Text style={{ color: "#a78bfa", fontSize: 12 }}>
            → Target lanjutan (TP2): {fRp(plan.tp2)}
          </Text>
        )}
        <Text style={{ color: "#f87171", fontSize: 12 }}>
          ! Keluar jika close &lt; {fRp(plan.stopLoss)}
        </Text>
      </View>

      {/* Commentary */}
      <RoboCommentary commentary={plan.commentary} colors={colors} />
    </ScrollView>
  );
}

// ─── FA ratio row ─────────────────────────────────────────────

function FARatioRow({ label, value, note, colors }: {
  label: string; value: string; note?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between",
      alignItems: "center", paddingVertical: 5,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
      <View>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{label}</Text>
        {note ? <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>{note}</Text> : null}
      </View>
      <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>{value}</Text>
    </View>
  );
}

// ─── Tab 2: Financials ────────────────────────────────────────

function FinancialsTab({ quote, broker1d, masterStock, colors }: {
  quote: NonNullable<any>;
  broker1d: any;
  masterStock: any;
  colors: ReturnType<typeof useColors>;
}) {
  const rsi = quote.rsi;
  const rsiColor = rsi < 30 ? "#34d399" : rsi > 70 ? "#f87171" : "#60a5fa";
  const rsiLabel = rsi < 30 ? "Oversold" : rsi > 70 ? "Overbought" : "Normal";
  const price = quote.price;

  // 52W range — use masterStock if available, else approximate
  const high52w = masterStock?.high52w || quote.high52w;
  const low52w = masterStock?.low52w || Math.min(price * 0.7, quote.ma50 * 0.8);
  const rangePct = high52w > low52w
    ? ((price - low52w) / (high52w - low52w)) * 100 : 50;

  const ms = masterStock;

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12 }}>

      {/* Company info from Master DB */}
      {ms && (ms.name || ms.sector || ms.indexCategory) && (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
          backgroundColor: colors.card, padding: 12, gap: 6 }}>
          {ms.name ? (
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14 }}>
              {ms.name}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {ms.sector ? (
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
                backgroundColor: "#60a5fa18", borderWidth: 1, borderColor: "#60a5fa30" }}>
                <Text style={{ color: "#60a5fa", fontSize: 10, fontWeight: "600" }}>
                  {ms.sector}
                </Text>
              </View>
            ) : null}
            {ms.industry ? (
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
                backgroundColor: "#94a3b818", borderWidth: 1, borderColor: "#94a3b830" }}>
                <Text style={{ color: "#94a3b8", fontSize: 10 }}>{ms.industry}</Text>
              </View>
            ) : null}
            {(ms.indexCategory ?? "").split(",").filter(Boolean).map((idx: string) => {
              const idxColors: Record<string, string> = {
                LQ45: "#60a5fa", KOMPAS100: "#a78bfa", JII30: "#34d399",
              };
              const c = idxColors[idx.trim().toUpperCase()] ?? "#94a3b8";
              return (
                <View key={idx} style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
                  backgroundColor: c + "22", borderWidth: 1, borderColor: c + "40" }}>
                  <Text style={{ color: c, fontSize: 10, fontWeight: "700" }}>{idx.trim()}</Text>
                </View>
              );
            })}
          </View>
          {ms.marketCap > 0 && (
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
              Market Cap: <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {ms.marketCap >= 1000 ? `Rp ${(ms.marketCap / 1000).toFixed(1)}T` : `Rp ${ms.marketCap.toFixed(0)}B`}
              </Text>
            </Text>
          )}
        </View>
      )}

      {/* Market data quick stats */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 8 }}>
        <SectionTitle title="MARKET DATA HARI INI" colors={colors} />
        <View style={{ flexDirection: "row" }}>
          <InfoCell label="VOL HARI INI" value={formatVol(quote.volK)} color="#60a5fa" colors={colors} />
          <InfoCell label="VOL AVG 50D" value={formatVol(quote.volAvg50K)} colors={colors} />
          <InfoCell label="RASIO" colors={colors}
            value={quote.volAvg50K > 0 ? `${(quote.volK / quote.volAvg50K).toFixed(1)}x` : "–"}
            color={quote.volK / quote.volAvg50K >= 2 ? "#34d399" : colors.foreground}
          />
        </View>
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <InfoCell label="MA 20" value={fRp(quote.ma20)} colors={colors}
            color={price > quote.ma20 ? "#34d399" : "#f87171"} />
          <InfoCell label="MA 50" value={fRp(quote.ma50)} colors={colors}
            color={price > quote.ma50 ? "#34d399" : "#f87171"} />
          <InfoCell label="52W HIGH" value={fRp(high52w)} color="#fbbf24" colors={colors} />
        </View>
        {ms && (ms.support > 0 || ms.resistance > 0) && (
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            {ms.support > 0 && (
              <InfoCell label="SUPPORT" value={fRp(ms.support)} color="#34d399" colors={colors} />
            )}
            {ms.resistance > 0 && (
              <InfoCell label="RESISTANCE" value={fRp(ms.resistance)} color="#f87171" colors={colors} />
            )}
            {ms.vwap > 0 && (
              <InfoCell label="VWAP" value={fRp(ms.vwap)} color="#38BDF8" colors={colors} />
            )}
          </View>
        )}
      </View>

      {/* 52W Range Slider (now uses real low52w) */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 8 }}>
        <SectionTitle title="52W PRICE RANGE" colors={colors} />
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
              52W Low {fRp(Math.round(low52w))}
            </Text>
            <Text style={{ color: "#fbbf24", fontSize: 10, fontWeight: "700" }}>
              52W High {fRp(high52w)}
            </Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border,
            overflow: "hidden" }}>
            <View style={{ height: 8, width: `${Math.min(99, Math.max(1, rangePct))}%` as any,
              backgroundColor: "#60a5fa", borderRadius: 4 }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
              {fRp(price)} — {rangePct.toFixed(0)}% dari range tahunan
            </Text>
            {ms?.ytdReturn !== undefined && ms.ytdReturn !== 0 && (
              <Text style={{ color: ms.ytdReturn > 0 ? "#34d399" : "#f87171",
                fontSize: 10, fontWeight: "700" }}>
                YTD: {ms.ytdReturn > 0 ? "+" : ""}{ms.ytdReturn.toFixed(1)}%
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* RSI */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 8 }}>
        <SectionTitle title="TECHNICAL INDICATORS" colors={colors} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>RSI (10)</Text>
          <Text style={{ color: rsiColor, fontWeight: "800", fontSize: 16 }}>{rsi.toFixed(1)}</Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, overflow: "visible",
          flexDirection: "row", position: "relative" }}>
          <View style={{ flex: 30, height: 8, backgroundColor: "#34d39940" }} />
          <View style={{ flex: 40, height: 8, backgroundColor: "#60a5fa30" }} />
          <View style={{ flex: 30, height: 8, backgroundColor: "#f8717140" }} />
          <View style={{ position: "absolute", top: -3,
            left: `${Math.min(99, Math.max(1, rsi))}%` as any,
            width: 14, height: 14, borderRadius: 7, backgroundColor: rsiColor, marginLeft: -7 }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 9, color: "#34d399" }}>Oversold 30</Text>
          <Text style={{ fontSize: 9, color: rsiColor, fontWeight: "600" }}>{rsiLabel}</Text>
          <Text style={{ fontSize: 9, color: "#f87171" }}>Overbought 70</Text>
        </View>

        {/* BB % */}
        <View style={{ marginTop: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Bollinger Band %</Text>
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              {quote.bbPct.toFixed(1)}%
            </Text>
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 2 }}>
            {quote.bbPct < 20 ? "Dekat Lower Band — potensi rebound"
              : quote.bbPct > 80 ? "Dekat Upper Band — hati-hati overbought"
              : "Di tengah band — normal"}
          </Text>
        </View>

        {/* Beta from master */}
        {ms?.beta > 0 && (
          <View style={{ marginTop: 4, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Beta (22D)</Text>
            <Text style={{ color: ms.beta > 1.3 ? "#f87171" : ms.beta < 0.7 ? "#34d399" : colors.foreground,
              fontWeight: "700" }}>
              {ms.beta.toFixed(2)}
              {"  "}<Text style={{ color: colors.mutedForeground, fontSize: 9 }}>
                {ms.beta > 1.3 ? "Volatil tinggi" : ms.beta < 0.7 ? "Defensif" : "Normal"}
              </Text>
            </Text>
          </View>
        )}
      </View>

      {/* Fundamental Ratios from Master DB */}
      {ms && (ms.per > 0 || ms.pbv > 0 || ms.eps > 0 || ms.roe > 0) && (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
          backgroundColor: colors.card, padding: 12, gap: 2 }}>
          <SectionTitle title="FUNDAMENTAL (FA RATIOS)" colors={colors} />
          {ms.per > 0 && (
            <FARatioRow label="P/E Ratio" value={`${ms.per.toFixed(1)}x`}
              note={ms.per < 15 ? "Murah" : ms.per > 30 ? "Mahal" : "Wajar"} colors={colors} />
          )}
          {ms.pbv > 0 && (
            <FARatioRow label="P/B Value" value={`${ms.pbv.toFixed(2)}x`}
              note={ms.pbv < 1 ? "Di bawah book value" : undefined} colors={colors} />
          )}
          {ms.peg > 0 && (
            <FARatioRow label="PEG Ratio" value={ms.peg.toFixed(2)}
              note={ms.peg < 1 ? "Undervalued vs growth" : undefined} colors={colors} />
          )}
          {ms.eps > 0 && (
            <FARatioRow label="EPS" value={`Rp ${ms.eps.toLocaleString("id-ID")}`}
              note="Earnings per Share" colors={colors} />
          )}
          {ms.roe > 0 && (
            <FARatioRow label="ROE" value={`${ms.roe.toFixed(1)}%`}
              note={ms.roe > 15 ? "Profitabilitas tinggi" : undefined} colors={colors} />
          )}
          {ms.dyPct > 0 && (
            <FARatioRow label="Dividend Yield" value={`${ms.dyPct.toFixed(2)}%`}
              colors={colors} />
          )}
        </View>
      )}

      {/* Return performance */}
      {ms && (ms.return10d !== 0 || ms.return30d !== 0 || ms.ytdReturn !== 0) && (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
          backgroundColor: colors.card, padding: 12, gap: 6 }}>
          <SectionTitle title="PERFORMA RETURN" colors={colors} />
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            {ms.return10d !== 0 && (
              <InfoCell label="10D RETURN" colors={colors}
                value={`${ms.return10d > 0 ? "+" : ""}${ms.return10d.toFixed(1)}%`}
                color={ms.return10d > 0 ? "#34d399" : "#f87171"} />
            )}
            {ms.return30d !== 0 && (
              <InfoCell label="30D RETURN" colors={colors}
                value={`${ms.return30d > 0 ? "+" : ""}${ms.return30d.toFixed(1)}%`}
                color={ms.return30d > 0 ? "#34d399" : "#f87171"} />
            )}
            {ms.ytdReturn !== 0 && (
              <InfoCell label="YTD" colors={colors}
                value={`${ms.ytdReturn > 0 ? "+" : ""}${ms.ytdReturn.toFixed(1)}%`}
                color={ms.ytdReturn > 0 ? "#34d399" : "#f87171"} />
            )}
          </View>
        </View>
      )}

      {/* MA status */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 10 }}>
        <SectionTitle title="MOVING AVERAGES & LEVELS" colors={colors} />
        {[
          { label: "MA 20", ma: quote.ma20 },
          { label: "MA 50", ma: quote.ma50 },
          { label: "52W High", ma: high52w },
          { label: "52W Low", ma: low52w },
          ...(broker1d?.vwap ? [{ label: "VWAP (broker)", ma: broker1d.vwap }] : []),
          ...(ms?.support ? [{ label: "Support", ma: ms.support }] : []),
          ...(ms?.resistance ? [{ label: "Resistance", ma: ms.resistance }] : []),
        ].filter(x => x.ma > 0).map(({ label, ma }) => {
          const above = price >= ma;
          const isLevel = label === "52W Low" || label === "Support";
          return (
            <View key={label} style={{ flexDirection: "row", justifyContent: "space-between",
              alignItems: "center" }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{label}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>{fRp(ma)}</Text>
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
                  backgroundColor: (above ? "#34d399" : "#f87171") + "20" }}>
                  <Text style={{ color: above ? "#34d399" : "#f87171",
                    fontSize: 9, fontWeight: "700" }}>
                    {above ? "Above ▲" : "Below ▼"}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* RS + Score */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12 }}>
        <SectionTitle title="RELATIVE STRENGTH & SCORE" colors={colors} />
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <InfoCell label="RS vs IHSG" colors={colors}
            value={quote.rs.toFixed(3)} color={quote.rs > 1 ? "#34d399" : "#f87171"} />
          <InfoCell label="RS MA" value={quote.rsMa.toFixed(3)} colors={colors} />
          <InfoCell label="SCORE" value={String(quote.totalScore)} color="#a78bfa" colors={colors} />
        </View>
      </View>

      {/* Active strategies */}
      {quote.strategies.length > 0 && (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
          backgroundColor: colors.card, padding: 12 }}>
          <SectionTitle title="STRATEGI AKTIF" colors={colors} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {quote.strategies.map((s: string, i: number) => (
              <View key={i} style={{ borderRadius: 6, borderWidth: 1,
                backgroundColor: "#60a5fa18", borderColor: "#60a5fa40",
                paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: "#60a5fa", fontSize: 11, fontWeight: "600" }}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Broker 1D */}
      {broker1d && (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
          backgroundColor: colors.card, padding: 12, gap: 8 }}>
          <SectionTitle title="BROKER TODAY (1D)" colors={colors} />
          <View style={{ flexDirection: "row" }}>
            <InfoCell label="TOP 1" value={broker1d.top1} colors={colors} />
            <InfoCell label="TOP 3" value={broker1d.top3} colors={colors} />
            <InfoCell label="TOP 5" value={broker1d.top5} colors={colors} />
          </View>
          {broker1d.avgNetBn !== null && (
            <View style={{ flexDirection: "row", marginTop: 4 }}>
              <InfoCell label="AVG NET (BN)" colors={colors}
                value={`${broker1d.avgNetBn > 0 ? "+" : ""}${broker1d.avgNetBn.toFixed(1)}B`}
                color={broker1d.avgNetBn > 0 ? "#34d399" : "#f87171"} />
              <InfoCell label="ACC/DIST" value={broker1d.accDist ?? "–"} colors={colors}
                color={broker1d.accDist === "Acc" ? "#34d399" : "#f87171"} />
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Tab 3: Smart Money ───────────────────────────────────────

function RadarNBSSection({ radar, currentPrice, colors }: {
  radar: any;
  currentPrice: number;
  colors: ReturnType<typeof useColors>;
}) {
  const flow = getFlowLabel(radar.flowState ?? "");
  const strength = getBandarStrength(radar.signal1d, radar.signal5d, radar.signal10d);
  const periods = [
    { label: "1D",  value: radar.nbs1d,  signal: radar.signal1d },
    { label: "5D",  value: radar.nbs5d,  signal: radar.signal5d },
    { label: "10D", value: radar.nbs10d, signal: radar.signal10d },
  ];

  const vwapDiff = currentPrice && radar.vwapD1
    ? currentPrice - radar.vwapD1 : null;
  const vwapDiffPct = (radar.vwapD1 > 0 && vwapDiff != null)
    ? ((vwapDiff / radar.vwapD1) * 100).toFixed(2) : null;

  const signalIcon = (sig: string) =>
    sig === "Accumulation" ? "🟢" : sig === "Distribution" ? "🔴" : "⚪";
  const signalColor2 = (sig: string) =>
    sig === "Accumulation" ? "#34d399" : sig === "Distribution" ? "#f87171" : "#94a3b8";

  return (
    <>
      {/* FlowState + Strength */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: flow.color + "40",
        backgroundColor: colors.card, padding: 12, gap: 8 }}>
        <SectionTitle title="FLOW B/S — NET BUY/SELL" colors={colors} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: flow.color }} />
              <Text style={{ color: flow.color, fontWeight: "800", fontSize: 15 }}>
                {radar.flowState}
              </Text>
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Flow State hari ini (1D)</Text>
          </View>
          <View style={{ backgroundColor: strength.color + "22", borderRadius: 8,
            paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" }}>
            <Text style={{ fontSize: 12 }}>{strength.icon}</Text>
            <Text style={{ color: strength.color, fontWeight: "700", fontSize: 11 }}>
              {strength.label}
            </Text>
          </View>
        </View>

        {/* Score bars */}
        <View style={{ gap: 6, marginTop: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Flow Score</Text>
            <Text style={{ color: "#60a5fa", fontWeight: "700" }}>{radar.bandarScore.toFixed(0)}/100</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
            <View style={{ height: 6, width: `${Math.min(100, radar.bandarScore)}%` as any,
              backgroundColor: "#60a5fa", borderRadius: 3 }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, marginBottom: 2 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Trend Score</Text>
            <Text style={{ color: "#a78bfa", fontWeight: "700" }}>{radar.trendScore.toFixed(0)}/100</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
            <View style={{ height: 6, width: `${Math.min(100, radar.trendScore)}%` as any,
              backgroundColor: "#a78bfa", borderRadius: 3 }} />
          </View>
        </View>
      </View>

      {/* NBS Multi-Timeframe Grid */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 8 }}>
        <SectionTitle title="NET BUY/SELL (MILIAR RP)" colors={colors} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {periods.map(tf => (
            <View key={tf.label} style={{ flex: 1, backgroundColor: colors.background,
              borderRadius: 10, padding: 10, alignItems: "center",
              borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: "700" }}>{tf.label}</Text>
              <Text style={{ color: (tf.value ?? 0) >= 0 ? "#34d399" : "#f87171",
                fontWeight: "800", fontSize: 15, marginTop: 4 }}>
                {tf.value != null ? `${tf.value >= 0 ? "+" : ""}${tf.value.toFixed(1)}B` : "N/A"}
              </Text>
              <Text style={{ color: signalColor2(tf.signal), fontSize: 9, marginTop: 3 }}>
                {signalIcon(tf.signal)}{" "}
                {tf.signal === "Accumulation" ? "ACC" : tf.signal === "Distribution" ? "DIST" : "NEU"}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* VWAP Bandar */}
      {radar.vwapD1 > 0 && (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
          backgroundColor: colors.card, padding: 12, gap: 8 }}>
          <SectionTitle title="VWAP BIG MONEY" colors={colors} />
          <View style={{ flexDirection: "row" }}>
            <InfoCell label="VWAP 1D" value={fRp(radar.vwapD1)} color="#38BDF8" colors={colors} />
            {radar.vwap5dAvg > 0 && (
              <InfoCell label="VWAP 5D" value={fRp(radar.vwap5dAvg)} color="#60a5fa" colors={colors} />
            )}
            {vwapDiffPct && (
              <InfoCell label="VS VWAP" colors={colors}
                value={`${parseFloat(vwapDiffPct) > 0 ? "+" : ""}${vwapDiffPct}%`}
                color={parseFloat(vwapDiffPct) >= 0 ? "#34d399" : "#f87171"} />
            )}
          </View>
          {vwapDiff != null && (() => {
            const pct = parseFloat(vwapDiffPct ?? "0");
            const pts = Math.abs(Math.round(vwapDiff)).toLocaleString("id-ID");
            const dir = vwapDiff >= 0 ? "atas" : "bawah";
            let msg: string; let clr: string;
            if (pct > 2)        { msg = "Akumulator dalam posisi sangat menguntungkan — momentum kuat ✅";         clr = "#34d399"; }
            else if (pct >= 0)  { msg = "Posisi Akumulator masih menguntungkan — pantau kelanjutan trend 📈";      clr = "#6ee7b7"; }
            else if (pct > -2)  { msg = "Tekanan jual memaksa Akumulator pada posisi kurang menguntungkan ⚠️";    clr = "#fbbf24"; }
            else                { msg = "Akumulator tertekan signifikan — waspadai potensi cut loss 🔴";           clr = "#f87171"; }
            return (
              <Text style={{ color: clr, fontSize: 12 }}>
                Harga {pts} poin di {dir} rata-rata Big Money → {msg}
              </Text>
            );
          })()}
          {radar.vwapSlopeState ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
              Slope VWAP: <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                {radar.vwapSlopeState}
              </Text>
            </Text>
          ) : null}
        </View>
      )}

      {/* RS Momentum */}
      {radar.rsMom !== 0 && (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
          backgroundColor: colors.card, padding: 12, flexDirection: "row", gap: 8 }}>
          <InfoCell label="RS MOMENTUM" colors={colors}
            value={`${radar.rsMom > 0 ? "+" : ""}${radar.rsMom.toFixed(2)}`}
            color={radar.rsMom > 0 ? "#34d399" : "#f87171"} />
          <InfoCell label="MA TREND" value={radar.maTrend} colors={colors} />
          {radar.narrative ? (
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>NARASI</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 9, fontStyle: "italic" }}
                numberOfLines={2}>{radar.narrative}</Text>
            </View>
          ) : null}
        </View>
      )}
    </>
  );
}

function SmartMoneyTab({ sm, radar, currentPrice, colors }: {
  sm: any;
  radar: any;
  currentPrice: number;
  colors: ReturnType<typeof useColors>;
}) {
  if (!sm && !radar) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 }}>
        <Text style={{ fontSize: 32 }}>📊</Text>
        <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
          Data Smart Money tidak tersedia
        </Text>
      </View>
    );
  }
  const phaseCfg = sm ? PHASE_CONFIG[sm.phase as keyof typeof PHASE_CONFIG] : null;
  const trendCfg = sm ? TREND_CONFIG[sm.flowTrend as keyof typeof TREND_CONFIG] : null;
  const scoreColor = sm ? getFlowScoreColor(sm.flowScore) : "#94a3b8";
  const sparkMax = sm ? Math.max(...sm.sparkline.map(Math.abs), 1) : 1;

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12 }}>

      {/* ── Broker History Smart Money (primary) ── */}
      {sm && phaseCfg && trendCfg && (
        <>
          {/* Phase + Score */}
          <View style={{ borderRadius: 12, borderWidth: 1,
            borderColor: phaseCfg.color + "50", backgroundColor: colors.card, padding: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 9,
                  textTransform: "uppercase", letterSpacing: 1 }}>Broker History 15D</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 18 }}>{phaseCfg.icon}</Text>
                  <Text style={{ color: phaseCfg.color, fontSize: 16, fontWeight: "900" }}>
                    {phaseCfg.label}
                  </Text>
                </View>
                <Text style={{ color: trendCfg.color, fontSize: 13 }}>
                  {trendCfg.icon} {trendCfg.label}
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <ScoreRing score={sm.flowScore} color={scoreColor} />
                <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>Flow Score</Text>
              </View>
            </View>

            {/* Top broker labels */}
            {(sm.top1Label || sm.top3Label) && (
              <View style={{ marginTop: 10, gap: 4 }}>
                {sm.top1Label ? (
                  <Text style={{ color: colors.foreground, fontSize: 11 }}>
                    Smart Money 1: <Text style={{ color: "#a78bfa", fontWeight: "700" }}>{sm.top1Label}</Text>
                  </Text>
                ) : null}
                {sm.top3Label ? (
                  <Text style={{ color: colors.foreground, fontSize: 11 }}>
                    Smart Money 3: <Text style={{ color: "#60a5fa", fontWeight: "700" }}>{sm.top3Label}</Text>
                  </Text>
                ) : null}
                {sm.latestVwap ? (
                  <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                    VWAP: <Text style={{ color: "#38BDF8", fontWeight: "700" }}>{fRp(sm.latestVwap)}</Text>
                    {"  "}B:{sm.brokerBuy} / S:{sm.brokerSell}
                  </Text>
                ) : null}
              </View>
            )}

            {/* B/S bar */}
            {(sm.brokerBuy > 0 || sm.brokerSell > 0) && (
              <View style={{ marginTop: 10, gap: 4 }}>
                <View style={{ height: 8, borderRadius: 4, overflow: "hidden", flexDirection: "row" }}>
                  <View style={{ flex: sm.brokerBuy, backgroundColor: "#34d399" }} />
                  <View style={{ flex: sm.brokerSell, backgroundColor: "#f87171" }} />
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#34d399", fontSize: 10, fontWeight: "700" }}>B:{sm.brokerBuy}</Text>
                  <Text style={{ color: "#f87171", fontSize: 10, fontWeight: "700" }}>S:{sm.brokerSell}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Sparkline 15H */}
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.card, padding: 12 }}>
            <SectionTitle title="BROKER FLOW 15 HARI" colors={colors} />
            <View style={{ flexDirection: "row", gap: 3, height: 80,
              alignItems: "center", marginTop: 8 }}>
              {sm.sparkline.map((v: number, i: number) => {
                const isPos = v >= 0;
                const h = Math.max(2, (Math.abs(v) / sparkMax) * 40);
                return (
                  <View key={i} style={{ flex: 1, flexDirection: "column",
                    alignItems: "center", height: 80, justifyContent: "center" }}>
                    {isPos ? (
                      <>
                        <View style={{ flex: 1 }} />
                        <View style={{ height: h, width: "80%", backgroundColor: "#34d399",
                          borderRadius: 2 }} />
                        <View style={{ height: 40, width: "80%" }} />
                      </>
                    ) : (
                      <>
                        <View style={{ height: 40, width: "80%" }} />
                        <View style={{ height: h, width: "80%", backgroundColor: "#f87171",
                          borderRadius: 2 }} />
                        <View style={{ flex: 1 }} />
                      </>
                    )}
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={{ fontSize: 9, color: "#34d399" }}>● Akumulasi</Text>
              <Text style={{ fontSize: 9, color: colors.mutedForeground }}>← 15 hari lalu · hari ini →</Text>
              <Text style={{ fontSize: 9, color: "#f87171" }}>● Distribusi</Text>
            </View>
          </View>

          {/* Key Metrics */}
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.card, padding: 12, gap: 10 }}>
            <SectionTitle title="KEY METRICS BROKER" colors={colors} />
            <View style={{ flexDirection: "row" }}>
              <InfoCell label="AVG 3D (BN)" colors={colors}
                value={`${sm.avg3d > 0 ? "+" : ""}${sm.avg3d.toFixed(1)}B`}
                color={sm.avg3d > 0 ? "#34d399" : "#f87171"} />
              <InfoCell label="AVG 5D (BN)" colors={colors}
                value={`${sm.avg5d > 0 ? "+" : ""}${sm.avg5d.toFixed(1)}B`}
                color={sm.avg5d > 0 ? "#34d399" : "#f87171"} />
              <InfoCell label="AVG 15D (BN)" colors={colors}
                value={`${sm.avg15d > 0 ? "+" : ""}${sm.avg15d.toFixed(1)}B`}
                color={sm.avg15d > 0 ? "#34d399" : "#f87171"} />
            </View>
            <View style={{ flexDirection: "row" }}>
              <InfoCell label="FUEL (BN)" colors={colors}
                value={`${sm.netValBn > 0 ? "+" : ""}${sm.netValBn.toFixed(1)}B`}
                color={sm.netValBn > 0 ? "#34d399" : "#f87171"} />
              <InfoCell label="DOMINASI" value={sm.dominanceLabel ?? "–"} colors={colors} />
              <InfoCell label="NET BROKER" value={String(sm.brokerNet ?? "–")} colors={colors}
                color={(sm.brokerNet ?? 0) > 0 ? "#34d399" : "#f87171"} />
            </View>
          </View>

          {/* Consistency */}
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.card, padding: 12, gap: 8 }}>
            <SectionTitle title="KONSISTENSI 15 HARI" colors={colors} />
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#34d399", fontSize: 12, fontWeight: "600" }}>
                  Akumulasi: {sm.accDays}/15 hari
                </Text>
                <Text style={{ color: "#34d399", fontSize: 12, fontWeight: "700" }}>
                  {Math.round((sm.accDays / 15) * 100)}%
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: "#f8717140",
                overflow: "hidden" }}>
                <View style={{ height: 6, width: `${(sm.accDays / 15) * 100}%` as any,
                  backgroundColor: "#34d399", borderRadius: 3 }} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#f87171", fontSize: 12, fontWeight: "600" }}>
                  Distribusi: {15 - sm.accDays}/15 hari
                </Text>
                <Text style={{ color: "#f87171", fontSize: 12, fontWeight: "700" }}>
                  {Math.round(((15 - sm.accDays) / 15) * 100)}%
                </Text>
              </View>
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4 }}>
              Flow Trend: {trendCfg.icon} {trendCfg.label}
            </Text>
          </View>
        </>
      )}

      {/* ── Flow B/S — Radar NBS (secondary) ── */}
      {radar && (
        <RadarNBSSection radar={radar} currentPrice={currentPrice} colors={colors} />
      )}
    </ScrollView>
  );
}

// ─── Tab 4: Price Levels ──────────────────────────────────────

function PriceLevelsTab({ quote, colors }: {
  quote: any; colors: ReturnType<typeof useColors>;
}) {
  if (!quote) return null;
  const price = quote.price;
  const levels = [
    { label: "52W High", value: quote.high52w, color: "#fbbf24" },
    { label: "MA 50", value: quote.ma50, color: "#a78bfa" },
    { label: "MA 20", value: quote.ma20, color: "#60a5fa" },
  ].filter(l => l.value > 0);

  const allVals = [...levels.map(l => l.value), price];
  const minVal = Math.min(...allVals) * 0.94;
  const maxVal = Math.max(...allVals) * 1.06;
  const range = maxVal - minVal;
  const pct = (v: number) => range > 0 ? ((v - minVal) / range) * 100 : 50;

  const priceVsMa20 = quote.ma20 > 0 ? ((price - quote.ma20) / quote.ma20) * 100 : null;
  const priceVsMa50 = quote.ma50 > 0 ? ((price - quote.ma50) / quote.ma50) * 100 : null;
  const priceVs52w = quote.high52w > 0 ? ((price - quote.high52w) / quote.high52w) * 100 : null;

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12 }}>
      <SectionTitle title="POSISI HARGA vs LEVEL KUNCI" colors={colors} />

      {/* Harga marker */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 14 }}>
        {[...levels, { label: "Harga", value: price, color: "#ffffff" }]
          .sort((a, b) => b.value - a.value)
          .map((lv) => (
          <View key={lv.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: lv.label === "Harga" ? colors.foreground : lv.color,
              fontSize: 10, fontWeight: "700", width: 60 }}>
              {lv.label}
            </Text>
            <View style={{ flex: 1, height: 10, borderRadius: 5,
              backgroundColor: colors.border, overflow: "hidden" }}>
              <View style={{ height: 10, borderRadius: 5,
                width: `${Math.min(99, Math.max(1, pct(lv.value)))}%` as any,
                backgroundColor: lv.label === "Harga" ? colors.primary + "80" : lv.color + "60" }} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: "700", width: 66, textAlign: "right",
              color: lv.label === "Harga" ? colors.foreground : colors.mutedForeground }}>
              {fRp(lv.value)}
            </Text>
          </View>
        ))}
      </View>

      {/* Distance table */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 10 }}>
        <SectionTitle title="JARAK KE LEVEL KUNCI" colors={colors} />
        {priceVsMa20 !== null && (
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>vs MA 20</Text>
            <Text style={{ color: priceVsMa20 >= 0 ? "#34d399" : "#f87171",
              fontSize: 14, fontWeight: "800" }}>
              {priceVsMa20 >= 0 ? "+" : ""}{priceVsMa20.toFixed(2)}%
            </Text>
          </View>
        )}
        {priceVsMa50 !== null && (
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>vs MA 50</Text>
            <Text style={{ color: priceVsMa50 >= 0 ? "#34d399" : "#f87171",
              fontSize: 14, fontWeight: "800" }}>
              {priceVsMa50 >= 0 ? "+" : ""}{priceVsMa50.toFixed(2)}%
            </Text>
          </View>
        )}
        {priceVs52w !== null && (
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>vs 52W High</Text>
            <Text style={{ color: priceVs52w >= 0 ? "#34d399" : "#f87171",
              fontSize: 14, fontWeight: "800" }}>
              {priceVs52w >= 0 ? "+" : ""}{priceVs52w.toFixed(2)}%
            </Text>
          </View>
        )}
      </View>

      {/* Volume */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 8 }}>
        <SectionTitle title="ANALISA VOLUME" colors={colors} />
        <View style={{ flexDirection: "row" }}>
          <InfoCell label="VOL HARI INI" value={formatVol(quote.volK)} color="#60a5fa" colors={colors} />
          <InfoCell label="VOL AVG 50D" value={formatVol(quote.volAvg50K)} colors={colors} />
        </View>
        {quote.volAvg50K > 0 && (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between",
              marginTop: 4 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Vol vs Rata-rata</Text>
              <Text style={{ fontSize: 13, fontWeight: "800",
                color: quote.volK / quote.volAvg50K >= 2 ? "#34d399"
                  : quote.volK / quote.volAvg50K >= 1 ? "#fbbf24" : "#f87171" }}>
                {(quote.volK / quote.volAvg50K).toFixed(1)}x
              </Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border,
              overflow: "hidden" }}>
              <View style={{ height: 6, borderRadius: 3,
                width: `${Math.min(100, (quote.volK / quote.volAvg50K) * 50)}%` as any,
                backgroundColor: quote.volK / quote.volAvg50K >= 2 ? "#34d399" : "#60a5fa" }} />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Tab 5: Chart (Candlestick + Volume) ─────────────────────

const CHART_PAD_L = 4;
const CHART_PAD_R = 52;
const CANDLE_H    = 175;
const VOL_H       = 50;
const DATE_H      = 18;
const CHART_TOTAL_H = CANDLE_H + 4 + VOL_H + DATE_H;

function sma(closes: number[], idx: number, period: number): number | null {
  if (idx < period - 1) return null;
  let sum = 0;
  for (let i = idx - period + 1; i <= idx; i++) sum += closes[i];
  return sum / period;
}

function CandleChartSvg({ candles, containerWidth, colors }: {
  candles: Candle[];
  containerWidth: number;
  colors: ReturnType<typeof useColors>;
}) {
  const n = candles.length;
  if (n === 0) return null;

  // Decide: fill container OR scroll
  // slotW = width per candle if we fill containerWidth exactly
  const innerContainerW = containerWidth - CHART_PAD_L - CHART_PAD_R;
  const slotW = innerContainerW / n;

  // Fill mode defaults (1B / 3B: candles spread to fill full width)
  let svgW = containerWidth;
  let cW   = Math.min(12, slotW * 0.82);
  let xC: (i: number) => number = (i) => CHART_PAD_L + (i + 0.5) * slotW;

  if (slotW < 3.5) {
    // Scroll mode (6B / 1T): fixed 4px candles, chart scrolls horizontally
    cW   = 4;
    svgW = CHART_PAD_L + n * cW + CHART_PAD_R;
    xC   = (i) => CHART_PAD_L + i * cW + cW / 2;
  }

  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const closes = candles.map(c => c.close);
  const vols   = candles.map(c => c.volume);

  const maxP = Math.max(...highs);
  const minP = Math.min(...lows);
  const priceRange = maxP - minP || 1;
  const maxVol = Math.max(...vols) || 1;

  const yP = (p: number) =>
    CHART_PAD_L + ((maxP - p) / priceRange) * (CANDLE_H - CHART_PAD_L * 2);

  // Y-axis levels
  const yLevels = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    price: maxP - f * priceRange,
    y: CHART_PAD_L + f * (CANDLE_H - CHART_PAD_L * 2),
  }));

  // MA lines
  const ma10pts: { x: number; y: number }[] = [];
  const ma20pts: { x: number; y: number }[] = [];
  closes.forEach((_, i) => {
    const m10 = sma(closes, i, 10);
    const m20 = sma(closes, i, 20);
    if (m10 !== null) ma10pts.push({ x: xC(i), y: yP(m10) });
    if (m20 !== null) ma20pts.push({ x: xC(i), y: yP(m20) });
  });

  // X-axis date labels (sparse)
  const labelStep = Math.max(1, Math.floor(n / 5));
  const dateLabels = candles
    .map((c, i) => ({ i, label: shortDateLabel(c.date) }))
    .filter(({ i }) => i % labelStep === 0 || i === n - 1);

  // Volume y baseline
  const volBase = CANDLE_H + 4 + VOL_H;

  return (
    <Svg width={svgW} height={CHART_TOTAL_H}>

      {/* Grid lines */}
      {yLevels.map((lv, i) => (
        <Line key={`grid-${i}`}
          x1={CHART_PAD_L} y1={lv.y}
          x2={svgW - CHART_PAD_R + 4} y2={lv.y}
          stroke={colors.border} strokeWidth={0.5} />
      ))}

      {/* Y-axis price labels */}
      {yLevels.map((lv, i) => (
        <SvgText key={`yl-${i}`}
          x={svgW - 2} y={lv.y + 3}
          fontSize={8} fill={colors.mutedForeground} textAnchor="end">
          {lv.price >= 1000
            ? lv.price.toFixed(0)
            : lv.price.toFixed(1)}
        </SvgText>
      ))}

      {/* MA20 line (purple, dashed) */}
      {ma20pts.map((p, i) => i === 0 ? null : (
        <Line key={`ma20-${i}`}
          x1={ma20pts[i - 1].x} y1={ma20pts[i - 1].y}
          x2={p.x} y2={p.y}
          stroke="#a78bfa" strokeWidth={0.8} strokeDasharray="2,1" />
      ))}

      {/* MA10 line (blue) */}
      {ma10pts.map((p, i) => i === 0 ? null : (
        <Line key={`ma10-${i}`}
          x1={ma10pts[i - 1].x} y1={ma10pts[i - 1].y}
          x2={p.x} y2={p.y}
          stroke="#60a5fa" strokeWidth={0.8} />
      ))}

      {/* Candles */}
      {candles.map((c, i) => {
        const cx    = xC(i);
        const isUp  = c.close >= c.open;
        const color = isUp ? "#34d399" : "#f87171";
        const bTop  = yP(Math.max(c.open, c.close));
        const bBot  = yP(Math.min(c.open, c.close));
        const bH    = Math.max(1, bBot - bTop);
        return (
          <G key={`c-${i}`}>
            <Line x1={cx} y1={yP(c.high)} x2={cx} y2={yP(c.low)}
              stroke={color} strokeWidth={1} />
            <Rect x={cx - cW / 2} y={bTop} width={cW} height={bH} fill={color} />
          </G>
        );
      })}

      {/* Volume separator line */}
      <Line x1={CHART_PAD_L} y1={CANDLE_H + 2}
        x2={svgW - CHART_PAD_R + 4} y2={CANDLE_H + 2}
        stroke={colors.border} strokeWidth={0.5} />

      {/* Volume bars — centered under each candle */}
      {candles.map((c, i) => {
        const isUp  = c.close >= c.open;
        const color = isUp ? "#34d39966" : "#f8717166";
        const bH    = Math.max(1, (c.volume / maxVol) * (VOL_H - 4));
        return (
          <Rect key={`v-${i}`}
            x={xC(i) - cW / 2} y={volBase - bH}
            width={cW} height={bH}
            fill={color} />
        );
      })}

      {/* X-axis date labels */}
      {dateLabels.map(({ i, label }) => (
        <SvgText key={`dl-${i}`}
          x={xC(i)} y={CHART_TOTAL_H - 2}
          fontSize={7} fill={colors.mutedForeground} textAnchor="middle">
          {label}
        </SvgText>
      ))}

    </Svg>
  );
}

function ChartTab({ symbol }: { symbol: string }) {
  const { width } = useWindowDimensions();
  const colors = useColors();
  const [period, setPeriod] = useState<"1mo" | "3mo" | "6mo" | "1y">("3mo");

  const { data: allCandles = [], isLoading } = useQuery({
    queryKey: ["ohlcv", symbol],
    queryFn: () => fetchHistorical(symbol),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  const days = PERIODS.find(p => p.key === period)?.days ?? 90;
  const candles = filterByPeriod(allCandles, days);
  const last = candles[candles.length - 1];

  // containerWidth = usable chart area (card inner width)
  const containerWidth = width - 32 - 20;  // screen - horizontal margins - card padding
  const innerContainerW = containerWidth - CHART_PAD_L - CHART_PAD_R;
  const slotW = innerContainerW / Math.max(1, candles.length);
  const scrollNeeded = slotW < 3.5;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Period selector */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16,
        paddingTop: 12, paddingBottom: 8, gap: 6 }}>
        {PERIODS.map(p => {
          const active = period === p.key;
          return (
            <TouchableOpacity key={p.key}
              onPress={() => setPeriod(p.key)}
              style={{ paddingHorizontal: 14, paddingVertical: 5,
                borderRadius: 8, borderWidth: 1,
                backgroundColor: active ? colors.primary + "20" : "transparent",
                borderColor: active ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 12, fontWeight: "700",
                color: active ? colors.primary : colors.mutedForeground }}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {/* MA legend */}
        <View style={{ marginLeft: "auto" as any, flexDirection: "row",
          alignItems: "center", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View style={{ width: 12, height: 2, backgroundColor: "#60a5fa" }} />
            <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>MA10</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View style={{ width: 12, height: 2, backgroundColor: "#a78bfa" }} />
            <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>MA20</Text>
          </View>
        </View>
      </View>

      {/* Chart area */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Animated.View style={{ opacity: 1 }}>
            <Text style={{ color: colors.primary, fontSize: 20 }}>📊</Text>
          </Animated.View>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            Memuat chart historis…
          </Text>
        </View>
      ) : candles.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center",
          padding: 32, gap: 8 }}>
          <Text style={{ fontSize: 32 }}>📭</Text>
          <Text style={{ color: colors.mutedForeground, textAlign: "center", fontSize: 13 }}>
            Data historis belum tersedia untuk saham ini.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}>
          {/* Chart container */}
          <View style={{ marginHorizontal: 16, borderRadius: 14,
            borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.card, padding: 10, overflow: "hidden" }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              scrollEnabled={scrollNeeded}>
              <View style={{ paddingBottom: 4 }}>
                <CandleChartSvg candles={candles} containerWidth={containerWidth} colors={colors} />
              </View>
            </ScrollView>
          </View>

          {/* Latest OHLCV strip */}
          {last && (
            <View style={{ marginHorizontal: 16, marginTop: 10,
              borderRadius: 12, borderWidth: 1, borderColor: colors.border,
              backgroundColor: colors.card, padding: 10 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 9,
                fontWeight: "700", marginBottom: 6 }}>
                📅 {shortDateLabel(last.date).toUpperCase()} — OHLCV
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {[
                  { label: "OPEN",   value: last.open.toLocaleString("id-ID"),  color: "#94a3b8" },
                  { label: "HIGH",   value: last.high.toLocaleString("id-ID"),  color: "#34d399" },
                  { label: "LOW",    value: last.low.toLocaleString("id-ID"),   color: "#f87171" },
                  { label: "CLOSE",  value: last.close.toLocaleString("id-ID"), color: last.close >= last.open ? "#34d399" : "#f87171" },
                  { label: "VOL",    value: last.volume >= 1_000_000
                    ? `${(last.volume / 1_000_000).toFixed(1)}M`
                    : `${(last.volume / 1_000).toFixed(0)}K`,            color: "#60a5fa" },
                ].map(cell => (
                  <View key={cell.label} style={{ alignItems: "center" }}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 8,
                      fontWeight: "700", marginBottom: 2 }}>{cell.label}</Text>
                    <Text style={{ color: cell.color, fontWeight: "700",
                      fontSize: 11 }}>{cell.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Price range summary */}
          {candles.length > 0 && (() => {
            const periodHigh = Math.max(...candles.map(c => c.high));
            const periodLow  = Math.min(...candles.map(c => c.low));
            const pLabel = PERIODS.find(p => p.key === period)?.label ?? "";
            return (
              <View style={{ marginHorizontal: 16, marginTop: 10,
                borderRadius: 12, borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.card, padding: 10,
                flexDirection: "row", justifyContent: "space-around" }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>HIGH {pLabel}</Text>
                  <Text style={{ color: "#34d399", fontWeight: "700", fontSize: 13 }}>
                    {periodHigh.toLocaleString("id-ID")}
                  </Text>
                </View>
                <View style={{ width: 1, backgroundColor: colors.border }} />
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>LOW {pLabel}</Text>
                  <Text style={{ color: "#f87171", fontWeight: "700", fontSize: 13 }}>
                    {periodLow.toLocaleString("id-ID")}
                  </Text>
                </View>
                <View style={{ width: 1, backgroundColor: colors.border }} />
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>CANDLES</Text>
                  <Text style={{ color: colors.mutedForeground, fontWeight: "700", fontSize: 13 }}>
                    {candles.length}
                  </Text>
                </View>
              </View>
            );
          })()}
        </ScrollView>
      )}
    </View>
  );
}

// ─── AI Loading Animation ─────────────────────────────────────

const CANDLE_DATA = [
  { color: "#34d399", bodyH: 32, wickT: 12, wickB: 6 },
  { color: "#f87171", bodyH: 22, wickT: 7,  wickB: 10 },
  { color: "#34d399", bodyH: 44, wickT: 10, wickB: 5  },
  { color: "#f87171", bodyH: 18, wickT: 5,  wickB: 8  },
  { color: "#34d399", bodyH: 36, wickT: 14, wickB: 6  },
  { color: "#f87171", bodyH: 28, wickT: 6,  wickB: 12 },
  { color: "#34d399", bodyH: 48, wickT: 8,  wickB: 4  },
];

function StockLoadingAnimation({ ticker }: { ticker: string }) {
  const colors = useColors();
  const CHART_H = 80;

  const bodyAnims = useRef(
    CANDLE_DATA.map(d => new Animated.Value(d.bodyH))
  ).current;
  const scanAnim  = useRef(new Animated.Value(0)).current;
  const dot1      = useRef(new Animated.Value(0.2)).current;
  const dot2      = useRef(new Animated.Value(0.2)).current;
  const dot3      = useRef(new Animated.Value(0.2)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const candleAnims = bodyAnims.map((anim, i) => {
      const target = CANDLE_DATA[i].bodyH;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(anim, {
            toValue: target * 1.5,
            duration: 500 + i * 60,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: target * 0.55,
            duration: 500 + i * 60,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: target,
            duration: 350,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
        ])
      );
    });

    const scan = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.delay(200),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    );

    const makeDot = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.2, duration: 350, useNativeDriver: true }),
          Animated.delay(700),
        ])
      );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    candleAnims.forEach(a => a.start());
    scan.start();
    makeDot(dot1, 0).start();
    makeDot(dot2, 300).start();
    makeDot(dot3, 600).start();
    glow.start();

    return () => {
      candleAnims.forEach(a => a.stop());
      scan.stop();
    };
  }, []);

  const CHART_WIDTH = CANDLE_DATA.length * 24;

  return (
    <View style={{
      flex: 1, alignItems: "center", justifyContent: "center",
      backgroundColor: colors.background, gap: 28,
    }}>
      {/* Chart box */}
      <View style={{
        backgroundColor: colors.card,
        borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: colors.border,
        alignItems: "center",
        shadowColor: "#34d399", shadowOpacity: 0.08,
        shadowRadius: 20, elevation: 4,
      }}>
        {/* Grid lines */}
        <View style={{ position: "absolute", top: 20, left: 20, right: 20, height: CHART_H,
          justifyContent: "space-between", pointerEvents: "none" }}>
          {[0,1,2,3].map(i => (
            <View key={i} style={{ height: 1, backgroundColor: colors.border, opacity: 0.5 }} />
          ))}
        </View>

        {/* Candles */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: CHART_H,
          gap: 8, width: CHART_WIDTH, overflow: "hidden" }}>
          {CANDLE_DATA.map((d, i) => (
            <View key={i} style={{ alignItems: "center", justifyContent: "flex-end",
              height: CHART_H, flex: 1 }}>
              <View style={{ width: 2, height: d.wickT, backgroundColor: d.color,
                opacity: 0.7, borderRadius: 1 }} />
              <Animated.View style={{
                width: 14, height: bodyAnims[i],
                backgroundColor: d.color,
                borderRadius: 3,
                shadowColor: d.color, shadowOpacity: 0.5,
                shadowRadius: 4, elevation: 2,
              }} />
              <View style={{ width: 2, height: d.wickB, backgroundColor: d.color,
                opacity: 0.7, borderRadius: 1 }} />
            </View>
          ))}
        </View>

        {/* Scan line */}
        <Animated.View style={{
          position: "absolute",
          left: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [20, CHART_WIDTH + 20] }),
          top: 20,
          width: 2,
          height: CHART_H,
          backgroundColor: "#34d399",
          opacity: 0.8,
          borderRadius: 1,
          shadowColor: "#34d399", shadowOpacity: 1, shadowRadius: 8,
        }} />

        {/* Bottom axis line */}
        <View style={{ height: 1, width: CHART_WIDTH, backgroundColor: colors.border,
          marginTop: 4, opacity: 0.8 }} />
      </View>

      {/* Text block */}
      <View style={{ alignItems: "center", gap: 6 }}>
        <Animated.Text style={{
          color: colors.mutedForeground, fontSize: 12,
          letterSpacing: 2, fontWeight: "600", textTransform: "uppercase",
          opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
        }}>
          Processing Insight for
        </Animated.Text>
        <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 22,
          letterSpacing: 1 }}>
          {ticker}
        </Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View key={i} style={{
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: "#34d399",
              opacity: d,
            }} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────

export default function StockDetailScreen() {
  const { code, tab: tabParam } = useLocalSearchParams<{ code: string; tab?: string }>();
  const colors = useColors();
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
  const plan = data?.plan;
  const isUp = (quote?.chgPct ?? 0) >= 0;

  const isHold = plan?.status?.toUpperCase().includes("HOLD") ?? false;
  const planTabLabel = isHold ? "Trading Position" : "Trading Plan";

  const tabs: { id: Tab; label: string }[] = [
    { id: "plan",       label: planTabLabel    },
    { id: "chart",      label: "Chart"         },
    { id: "financials", label: "Financials"    },
    { id: "smartmoney", label: "Smart Money"   },
    { id: "levels",     label: "Price Levels"  },
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {isLoading ? (
          <StockLoadingAnimation ticker={ticker} />
        ) : isError || !data ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 }}>
            <Text style={{ fontSize: 32 }}>⚠️</Text>
            <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
              Gagal memuat data {ticker}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, paddingHorizontal: 24,
                paddingVertical: 10, borderRadius: 10, marginTop: 8 }}
              onPress={() => refetch()}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Fixed header ── */}
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 0,
              borderBottomWidth: 1, borderBottomColor: colors.border,
              backgroundColor: colors.background }}>

              {/* Ticker + Price (left) | Score + Key stats (right) */}
              <View style={{ flexDirection: "row", alignItems: "flex-start",
                marginBottom: 8, gap: 10 }}>

                {/* Left column */}
                <View style={{ flex: 1 }}>
                  {/* Ticker + signal badges */}
                  <View style={{ flexDirection: "row", alignItems: "center",
                    gap: 5, flexWrap: "wrap", marginBottom: 5 }}>
                    <Text style={{ fontSize: 22, fontWeight: "900",
                      color: colors.foreground }}>
                      {ticker}
                    </Text>
                    {plan?.type && (
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2,
                        borderRadius: 6, backgroundColor: "#34d39920",
                        borderWidth: 1, borderColor: "#34d39950" }}>
                        <Text style={{ color: "#34d399", fontSize: 10,
                          fontWeight: "700" }}>{plan.type}</Text>
                      </View>
                    )}
                    {plan?.status && (
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: (isHold ? "#fbbf24" : "#34d399") + "20",
                        borderWidth: 1,
                        borderColor: (isHold ? "#fbbf24" : "#34d399") + "50" }}>
                        <Text style={{ color: isHold ? "#fbbf24" : "#34d399",
                          fontSize: 10, fontWeight: "700" }}>
                          {isHold ? "HOLD" : plan.status}
                        </Text>
                      </View>
                    )}
                    {plan?.grade && plan.grade !== "–" && (
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: (GRADE_COLOR[plan.grade] ?? "#94a3b8") + "20",
                        borderWidth: 1,
                        borderColor: (GRADE_COLOR[plan.grade] ?? "#94a3b8") + "50" }}>
                        <Text style={{ color: GRADE_COLOR[plan.grade] ?? "#94a3b8",
                          fontSize: 10, fontWeight: "700" }}>
                          Grade {plan.grade}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Price + change */}
                  {quote && (
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                      <Text style={{ fontSize: 20, fontWeight: "800",
                        color: colors.foreground }}>
                        {fRp(quote.price)}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: "700",
                        color: isUp ? "#34d399" : "#f87171" }}>
                        {isUp ? "▲" : "▼"} {Math.abs(quote.chgPct).toFixed(2)}%
                      </Text>
                      {plan?.holdDays && (
                        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                          {plan.holdDays}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Right column: Score ring + RSI + StochK */}
                {verdict && (
                  <View style={{ alignItems: "center", gap: 2 }}>
                    <ScoreRing score={verdict.score} color={verdict.color} />
                    <Text style={{ color: colors.mutedForeground, fontSize: 7,
                      fontWeight: "700", letterSpacing: 0.5 }}>SCORE</Text>
                    {plan?.rsi !== null && plan?.rsi !== undefined && (
                      <View style={{ alignItems: "center", marginTop: 4,
                        paddingHorizontal: 8, paddingVertical: 3,
                        borderRadius: 6, backgroundColor: colors.card,
                        borderWidth: 1, borderColor: colors.border, width: 60 }}>
                        <Text style={{ color: plan.rsi < 30 ? "#34d399"
                          : plan.rsi > 70 ? "#f87171" : "#94a3b8",
                          fontSize: 13, fontWeight: "900" }}>
                          {plan.rsi.toFixed(0)}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 7,
                          fontWeight: "600" }}>RSI</Text>
                      </View>
                    )}
                    {plan?.stochK !== null && plan?.stochK !== undefined && (
                      <View style={{ alignItems: "center",
                        paddingHorizontal: 8, paddingVertical: 3,
                        borderRadius: 6, backgroundColor: colors.card,
                        borderWidth: 1, borderColor: colors.border, width: 60 }}>
                        <Text style={{ color: plan.stochK < 20 ? "#34d399"
                          : plan.stochK < 40 ? "#fbbf24" : "#94a3b8",
                          fontSize: 13, fontWeight: "900" }}>
                          {plan.stochK.toFixed(0)}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 7,
                          fontWeight: "600" }}>StochK</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Verdict banner — compact single row */}
              {verdict && (
                <View style={{ flexDirection: "row", borderRadius: 10, borderWidth: 1,
                  borderColor: verdict.color + "40", backgroundColor: verdict.color + "15",
                  paddingHorizontal: 10, paddingVertical: 7,
                  gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontSize: 18 }}>{verdict.emoji}</Text>
                  <Text style={{ color: verdict.color, fontSize: 13,
                    fontWeight: "900" }}>{verdict.label}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 10,
                    flex: 1 }} numberOfLines={1}>{verdict.sub}</Text>
                  <Text style={{ color: verdict.color, fontSize: 10,
                    fontWeight: "700" }}>→ {verdict.action}</Text>
                </View>
              )}

              {/* Metrics strip */}
              {quote && (() => {
                const price = quote.price ?? 0;
                const t20 = quote.ma20 > 0
                  ? price >= quote.ma20
                    ? { label: "▲ Bullish", color: "#34d399" }
                    : { label: "▼ Bearish", color: "#f87171" }
                  : null;
                const t50 = quote.ma50 > 0
                  ? price >= quote.ma50
                    ? { label: "▲ Bullish", color: "#34d399" }
                    : { label: "▼ Bearish", color: "#f87171" }
                  : null;
                return (
                  <View style={{ flexDirection: "row", justifyContent: "space-between",
                    marginBottom: 8 }}>
                    {/* Trend 20 */}
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: "600" }}>Trend 20</Text>
                      <Text style={{ color: t20?.color ?? colors.foreground, fontSize: 11, fontWeight: "700" }}>
                        {t20?.label ?? "—"}
                      </Text>
                    </View>
                    {/* Trend 50 */}
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: "600" }}>Trend 50</Text>
                      <Text style={{ color: t50?.color ?? colors.foreground, fontSize: 11, fontWeight: "700" }}>
                        {t50?.label ?? "—"}
                      </Text>
                    </View>
                    {/* 52W High */}
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: "600" }}>52W H</Text>
                      <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700" }}>
                        {fRp(quote.high52w)}
                      </Text>
                    </View>
                    {/* Volume */}
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: "600" }}>VOL</Text>
                      <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700" }}>
                        {formatVol(quote.volK)}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Tab bar */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row" }}>
                  {tabs.map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        style={{ paddingHorizontal: 12, paddingVertical: 10,
                          borderBottomWidth: active ? 2 : 0,
                          borderBottomColor: colors.primary }}
                        onPress={() => setActiveTab(tab.id)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700",
                          color: active ? colors.primary : colors.mutedForeground }}>
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
              {activeTab === "plan" && plan && (
                isHold
                  ? <HoldModeContent plan={plan} price={quote?.price ?? 0} colors={colors} />
                  : <TradingPlanContent plan={plan} ms={data.masterStock} colors={colors} />
              )}
              {activeTab === "plan" && !plan && (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: colors.mutedForeground }}>
                    Tidak ada trading plan
                  </Text>
                </View>
              )}
              {activeTab === "financials" && quote && (
                <FinancialsTab
                  quote={quote}
                  broker1d={data.broker1d}
                  masterStock={data.masterStock}
                  colors={colors}
                />
              )}
              {activeTab === "smartmoney" && (
                <SmartMoneyTab
                  sm={data.smartMoney}
                  radar={data.radar}
                  currentPrice={data.quote?.price ?? data.radar?.close ?? 0}
                  colors={colors}
                />
              )}
              {activeTab === "chart" && (
                <ChartTab symbol={ticker} />
              )}
              {activeTab === "levels" && (
                <PriceLevelsTab quote={quote} colors={colors} />
              )}
            </View>
          </>
        )}
      </View>
    </>
  );
}
