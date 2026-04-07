import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

import { useColors } from "@/hooks/useColors";
import {
  PHASE_CONFIG,
  TREND_CONFIG,
  getFlowScoreColor,
} from "@/services/smartMoneyEngine";
import {
  TradingPlan,
  Verdict,
  computeVerdict,
  fetchStockDetail,
} from "@/services/stockDetailService";
import { formatVol } from "@/services/stockToolsService";

// ─── Tab types ────────────────────────────────────────────────

type Tab = "plan" | "financials" | "smartmoney" | "levels";

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
  const textColor = ok === "warn" ? "#fbbf24" : ok ? colors.foreground : "#64748b";
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

// ─── Position size calculator ─────────────────────────────────

function PosSizeCalc({ entry, sl, colors }: {
  entry: number; sl: number; colors: ReturnType<typeof useColors>;
}) {
  const [capital, setCapital] = useState("25000000");
  const [riskPct, setRiskPct] = useState("2");

  const cap = parseInt(capital.replace(/\D/g, "")) || 25_000_000;
  const risk = parseFloat(riskPct) || 2;
  const riskPerShare = Math.abs(entry - sl);
  const maxRupiah = cap * risk / 100;
  const lotByRisk = riskPerShare > 0 ? Math.floor(maxRupiah / riskPerShare / 100) : 0;
  const lotByCap = entry > 0 ? Math.floor(cap / (entry * 100)) : 0;
  const maxLot = Math.max(1, Math.min(lotByRisk, lotByCap));
  const actualCost = maxLot * 100 * entry;
  const fmtM = (n: number) => n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(1)} jt`
    : `Rp ${n.toLocaleString("id-ID")}`;

  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card, padding: 12, gap: 10 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: "700" }}>
        🧮 POSITION SIZE CALCULATOR
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 2 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 9, marginBottom: 3 }}>MODAL</Text>
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.background, paddingHorizontal: 10, paddingVertical: 6 }}>
            <TextInput
              style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}
              value={capital}
              onChangeText={setCapital}
              keyboardType="numeric"
              selectTextOnFocus
            />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 9, marginBottom: 3 }}>RISK %</Text>
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.background, paddingHorizontal: 10, paddingVertical: 6 }}>
            <TextInput
              style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}
              value={riskPct}
              onChangeText={setRiskPct}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
          </View>
        </View>
      </View>
      <View style={{ borderRadius: 10, backgroundColor: "#60a5fa18",
        borderWidth: 1, borderColor: "#60a5fa30", padding: 10 }}>
        <Text style={{ color: "#60a5fa", fontWeight: "900", fontSize: 16 }}>
          ~{maxLot} lot · {fmtM(actualCost)}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 3 }}>
          Risiko/saham: Rp {fRp(riskPerShare)} → max rugi {fmtM(maxRupiah)} ({risk}% dari {fmtM(cap)})
        </Text>
        <Text style={{ color: "#f87171", fontSize: 10, marginTop: 3 }}>
          Stop loss jika close &lt; {fRp(sl)}
        </Text>
      </View>
    </View>
  );
}

// ─── Tab 1a: Trading Plan (BUY mode) ─────────────────────────

function TradingPlanContent({ plan, colors }: {
  plan: TradingPlan; colors: ReturnType<typeof useColors>;
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

      {/* TP1 + SL boxes */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, padding: 16, borderRadius: 16,
          backgroundColor: "#34d39910", borderWidth: 2, borderColor: "#34d39940" }}>
          <Text style={{ color: "#94a3b8", fontSize: 9, fontWeight: "700" }}>🎯 TARGET (TP1)</Text>
          <Text style={{ color: "#34d399", fontWeight: "900", fontSize: 28, marginTop: 4 }}>
            {fRp(plan.tp1)}
          </Text>
          {tp1Pct > 0 && (
            <Text style={{ color: "#34d399", fontSize: 13, fontWeight: "700" }}>
              +{tp1Pct.toFixed(1)}%
            </Text>
          )}
        </View>
        <View style={{ flex: 1, padding: 16, borderRadius: 16,
          backgroundColor: "#f8717110", borderWidth: 2, borderColor: "#f8717140" }}>
          <Text style={{ color: "#94a3b8", fontSize: 9, fontWeight: "700" }}>🔴 STOP LOSS</Text>
          <Text style={{ color: "#f87171", fontWeight: "900", fontSize: 28, marginTop: 4 }}>
            {fRp(plan.stopLoss)}
          </Text>
          {slPct > 0 && (
            <Text style={{ color: "#f87171", fontSize: 13, fontWeight: "700" }}>
              -{slPct.toFixed(1)}%
            </Text>
          )}
        </View>
      </View>

      {/* ENTRY · TP2 · RSI · STOCHK row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between",
        padding: 12, borderRadius: 12, backgroundColor: colors.card,
        borderWidth: 1, borderColor: colors.border }}>
        <InfoCell label="ENTRY" colors={colors}
          value={plan.entryHigh ? `${fRp(plan.entry)}–${fRp(plan.entryHigh)}` : fRp(plan.entry)}
          color="#fbbf24" />
        {plan.tp2 > 0 && (
          <InfoCell label="TP2" value={fRp(plan.tp2)} color="#60a5fa" colors={colors} />
        )}
        {plan.rsi !== null && (
          <InfoCell label="RSI" colors={colors}
            value={plan.rsi.toFixed(0)}
            color={plan.rsi < 35 ? "#34d399" : plan.rsi > 65 ? "#f87171" : "white"} />
        )}
        {plan.stochK !== null && (
          <InfoCell label="STOCHK" colors={colors}
            value={plan.stochK.toFixed(0)}
            color={plan.stochK < 20 ? "#34d399" : "white"} />
        )}
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

      {/* Position Size Calculator */}
      {plan.entry > 0 && plan.stopLoss > 0 && (
        <PosSizeCalc entry={plan.entry} sl={plan.stopLoss} colors={colors} />
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
      {plan.commentary ? (
        <>
          <SectionTitle title="ROBO COMMENTARY" colors={colors} />
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.card, padding: 12 }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border,
              paddingBottom: 6, marginBottom: 8 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
                ════════════════════════════
              </Text>
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 11,
              fontStyle: "italic", lineHeight: 17 }}>
              {plan.commentary}
            </Text>
          </View>
        </>
      ) : null}
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
        {plan.tp2 > 0 && <InfoCell label="TP2" value={fRp(plan.tp2)} color="#60a5fa" colors={colors} />}
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
      {plan.commentary ? (
        <>
          <SectionTitle title="ROBO COMMENTARY" colors={colors} />
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.card, padding: 12 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11,
              fontStyle: "italic", lineHeight: 17 }}>
              {plan.commentary}
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

// ─── Tab 2: Financials ────────────────────────────────────────

function FinancialsTab({ quote, broker1d, colors }: {
  quote: NonNullable<any>;
  broker1d: any;
  colors: ReturnType<typeof useColors>;
}) {
  const rsi = quote.rsi;
  const rsiColor = rsi < 30 ? "#34d399" : rsi > 70 ? "#f87171" : "#60a5fa";
  const rsiLabel = rsi < 30 ? "Oversold" : rsi > 70 ? "Overbought" : "Normal";
  const price = quote.price;

  // 52W range calculation (approximate low from high and price context)
  const high52w = quote.high52w;
  const approxLow52w = Math.min(price * 0.7, quote.ma50 * 0.8, price);
  const rangePct = high52w > approxLow52w
    ? ((price - approxLow52w) / (high52w - approxLow52w)) * 100 : 50;

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12 }}>

      {/* Market data quick stats */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 8 }}>
        <SectionTitle title="MARKET DATA" colors={colors} />
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
          <InfoCell label="52W HIGH" value={fRp(quote.high52w)} color="#fbbf24" colors={colors} />
        </View>
      </View>

      {/* 52W Range Slider */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 8 }}>
        <SectionTitle title="52W PRICE RANGE" colors={colors} />
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
              52W Low ~{fRp(Math.round(approxLow52w))}
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
          <Text style={{ color: colors.mutedForeground, fontSize: 10, textAlign: "center" }}>
            {fRp(price)} — {rangePct.toFixed(0)}% dari range tahunan
          </Text>
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
      </View>

      {/* MA status */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.card, padding: 12, gap: 10 }}>
        <SectionTitle title="MOVING AVERAGES" colors={colors} />
        {[
          { label: "MA 20", ma: quote.ma20 },
          { label: "MA 50", ma: quote.ma50 },
          { label: "52W High", ma: high52w },
          ...(broker1d?.vwap ? [{ label: "VWAP", ma: broker1d.vwap }] : []),
        ].filter(x => x.ma > 0).map(({ label, ma }) => {
          const above = price > ma;
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

function SmartMoneyTab({ sm, colors }: { sm: any; colors: ReturnType<typeof useColors> }) {
  if (!sm) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 }}>
        <Text style={{ fontSize: 32 }}>📊</Text>
        <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
          Data Smart Money tidak tersedia
        </Text>
      </View>
    );
  }
  const phaseCfg = PHASE_CONFIG[sm.phase as keyof typeof PHASE_CONFIG];
  const trendCfg = TREND_CONFIG[sm.flowTrend as keyof typeof TREND_CONFIG];
  const scoreColor = getFlowScoreColor(sm.flowScore);
  const sparkMax = Math.max(...sm.sparkline.map(Math.abs), 1);

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12 }}>

      {/* Phase + Score */}
      <View style={{ borderRadius: 12, borderWidth: 1,
        borderColor: phaseCfg.color + "50", backgroundColor: colors.card, padding: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ gap: 6 }}>
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
                SM1: <Text style={{ color: "#a78bfa", fontWeight: "700" }}>{sm.top1Label}</Text>
              </Text>
            ) : null}
            {sm.top3Label ? (
              <Text style={{ color: colors.foreground, fontSize: 11 }}>
                SM3: <Text style={{ color: "#60a5fa", fontWeight: "700" }}>{sm.top3Label}</Text>
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
        <SectionTitle title="FLOW 15 HARI" colors={colors} />
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
        <SectionTitle title="KEY METRICS" colors={colors} />
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
        {sm.latestVwap ? (
          <View style={{ flexDirection: "row", marginTop: 2 }}>
            <InfoCell label="VWAP" value={fRp(sm.latestVwap)} colors={colors} color="#38BDF8" />
          </View>
        ) : null}
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
    { id: "plan", label: planTabLabel },
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              Mengambil data {ticker}...
            </Text>
          </View>
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

              {/* Ticker + Score ring */}
              <View style={{ flexDirection: "row", justifyContent: "space-between",
                alignItems: "flex-start", marginBottom: 8 }}>
                <View>
                  <Text style={{ fontSize: 22, fontWeight: "900", color: colors.foreground }}>
                    {ticker}
                  </Text>
                  {quote && (
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                      <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground }}>
                        {fRp(quote.price)}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: "700",
                        color: isUp ? "#34d399" : "#f87171" }}>
                        {isUp ? "▲" : "▼"} {Math.abs(quote.chgPct).toFixed(2)}%
                      </Text>
                    </View>
                  )}
                </View>
                {verdict && <ScoreRing score={verdict.score} color={verdict.color} />}
              </View>

              {/* Verdict card */}
              {verdict && (
                <View style={{ flexDirection: "row", borderRadius: 12, borderWidth: 1,
                  borderColor: verdict.color + "40", backgroundColor: verdict.color + "15",
                  padding: 10, gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                  <Text style={{ fontSize: 22 }}>{verdict.emoji}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: verdict.color, fontSize: 14, fontWeight: "900" }}>
                      {verdict.label}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{verdict.sub}</Text>
                    <Text style={{ color: verdict.color, fontSize: 11, fontWeight: "700" }}>
                      → {verdict.action}
                    </Text>
                  </View>
                </View>
              )}

              {/* Metrics strip */}
              {quote && (
                <View style={{ flexDirection: "row", justifyContent: "space-between",
                  marginBottom: 8 }}>
                  {[
                    { label: "MA20", val: fRp(quote.ma20) },
                    { label: "MA50", val: fRp(quote.ma50) },
                    { label: "52W H", val: fRp(quote.high52w) },
                    { label: "VOL", val: formatVol(quote.volK) },
                  ].map(({ label, val }) => (
                    <View key={label} style={{ alignItems: "center" }}>
                      <Text style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: "600" }}>
                        {label}
                      </Text>
                      <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700" }}>
                        {val}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

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
                  : <TradingPlanContent plan={plan} colors={colors} />
              )}
              {activeTab === "plan" && !plan && (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: colors.mutedForeground }}>
                    Tidak ada trading plan
                  </Text>
                </View>
              )}
              {activeTab === "financials" && quote && (
                <FinancialsTab quote={quote} broker1d={data.broker1d} colors={colors} />
              )}
              {activeTab === "smartmoney" && (
                <SmartMoneyTab sm={data.smartMoney} colors={colors} />
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
