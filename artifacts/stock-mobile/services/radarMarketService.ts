import { Platform } from "react-native";

// ─── Types ────────────────────────────────────────────────────

export interface RadarRaw {
  Ticker: string;
  Company: string;
  Close: string;
  TO_Rp_Bn: string;
  Chg_Pct: string;
  Perf10D: string;
  Perf30D: string;
  MarketContext: string;
  FlowState: string;
  VWAPContext: string;
  TrendContext: string;
  PositionContext: string;
  Phase: string;
  Narrative: string;
  BandarScore: string;
  FlowCore: string;
  TrendScore: string;
  AlignScore: string;
  PosHealth: string;
  VWAP_D1: string;
  VWAP_5D_Avg: string;
  VWAP_Stack: string;
  VWAPSlope_Pct: string;
  VWAPSlope_State: string;
  VWAPDist_Pct: string;
  NBS1D: string;
  NBS5D: string;
  NBS10D: string;
  NF5D: string;
  NF25D: string;
  VWAPInflow_Pct: string;
  NetValRatio: string;
  DivState: string;
  HarmonyStr: string;
  HarmonyState: string;
  RS_Mom: string;
  MA_Trend: string;
  Slope_MA20: string;
  Slope_MA40: string;
  Slope_MA60: string;
  Beta: string;
  Alpha: string;
  R_Squared: string;
}

export interface RadarMarket {
  ticker: string;
  company: string;
  close: number;
  toRpBn: number;
  chgPct: number;
  perf10d: number;
  perf30d: number;
  marketContext: string;
  flowState: string;
  vwapContext: string;
  trendContext: string;
  positionContext: string;
  phase: string;
  narrative: string;
  bandarScore: number;
  flowCore: number;
  trendScore: number;
  alignScore: number;
  posHealth: number;
  vwapD1: number;
  vwap5dAvg: number;
  vwapStack: number;
  vwapSlopePct: number;
  vwapSlopeState: string;
  vwapDistPct: number;
  nbs1d: number;
  nbs5d: number;
  nbs10d: number;
  nf5d: number;
  nf25d: number;
  vwapInflowPct: number;
  netValRatio: number;
  divState: string;
  harmonyStr: number;
  harmonyState: string;
  rsMom: number;
  maTrend: string;
  slopeMA20: string;
  slopeMA40: string;
  slopeMA60: string;
  beta: number;
  alpha: number;
  rSquared: number;
  // derived
  signal1d: string;
  signal5d: string;
  signal10d: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function pn(s: string | undefined | null): number {
  const v = parseFloat(s ?? "");
  return isNaN(v) ? 0 : v;
}

export function flowToSignal(flowState: string): "Accumulation" | "Distribution" | "Neutral" {
  const s = (flowState ?? "").toUpperCase();
  if (s.includes("ACCUMULATION")) return "Accumulation";
  if (s.includes("DISTRIBUTION")) return "Distribution";
  return "Neutral";
}

export function deriveSignal(rawCtx: string, nbsValue: number): "Accumulation" | "Distribution" | "Neutral" {
  const s = (rawCtx ?? "").toUpperCase().trim();
  if (s.includes("ACCUMULATION")) return "Accumulation";
  if (s.includes("DISTRIBUTION")) return "Distribution";
  if (nbsValue > 0) return "Accumulation";
  if (nbsValue < 0) return "Distribution";
  return "Neutral";
}

export function getFlowLabel(flowState: string): { label: string; color: string; short: string } {
  const s = (flowState ?? "").toUpperCase();
  if (s.includes("STRONG ACCUMULATION")) return { label: "Akumulasi Kuat", color: "#10b981", short: "ACC ✦" };
  if (s.includes("ACCUMULATION"))        return { label: "Akumulasi",       color: "#34d399", short: "ACC" };
  if (s.includes("STRONG DISTRIBUTION")) return { label: "Distribusi Kuat", color: "#dc2626", short: "DIST ✦" };
  if (s.includes("DISTRIBUTION"))        return { label: "Distribusi",      color: "#f87171", short: "DIST" };
  return { label: "Netral", color: "#94a3b8", short: "NEU" };
}

export function getBandarStrength(s1: string, s5: string, s10: string): {
  label: string; color: string; icon: string;
} {
  const signals = [s1, s5, s10];
  const acc  = signals.filter(s => s === "Accumulation").length;
  const dist = signals.filter(s => s === "Distribution").length;
  if (acc  === 3) return { label: "ACC KUAT",  color: "#10b981", icon: "🟩🟩🟩" };
  if (acc  === 2) return { label: "ACC",       color: "#34d399", icon: "🟩🟩⬜" };
  if (dist === 3) return { label: "DIST KUAT", color: "#dc2626", icon: "🟥🟥🟥" };
  if (dist === 2) return { label: "DIST",      color: "#f87171", icon: "🟥🟥⬜" };
  return { label: "MIXED", color: "#94a3b8", icon: "⬜⬜⬜" };
}

export function formatNBS(value: number | null): { text: string; color: string } {
  if (value == null) return { text: "N/A", color: "#64748b" };
  const sign  = value >= 0 ? "+" : "";
  const color = value >= 0 ? "#34d399" : "#f87171";
  return { text: `${sign}${value.toFixed(1)}B`, color };
}

export function vwapInterpretation(
  currentPrice: number,
  vwap: number
): { text: string; color: string; icon: string } | null {
  if (!vwap || !currentPrice) return null;
  const diff = currentPrice - vwap;
  const pct  = ((diff / vwap) * 100).toFixed(1);
  const pts = Math.round(Math.abs(diff)).toLocaleString("id-ID");
  const pctNum = parseFloat(pct);
  if (pctNum > 2) return {
    text: `Harga ${pts} poin di atas rata-rata Big Money → Akumulator dalam posisi sangat menguntungkan ✅`,
    color: "#34d399", icon: "📈",
  };
  if (pctNum >= 0) return {
    text: `Harga ${pts} poin di atas rata-rata Big Money → Posisi Akumulator masih menguntungkan 📈`,
    color: "#6ee7b7", icon: "📈",
  };
  if (pctNum > -2) return {
    text: `Harga ${pts} poin di bawah rata-rata Big Money → Tekanan jual memaksa Akumulator pada posisi kurang menguntungkan ⚠️`,
    color: "#fbbf24", icon: "📉",
  };
  return {
    text: `Harga ${pts} poin di bawah rata-rata Big Money → Akumulator tertekan signifikan — waspadai potensi cut loss 🔴`,
    color: "#f87171", icon: "📉",
  };
}

// ─── Parser ───────────────────────────────────────────────────

export function parseRadarItem(raw: RadarRaw): RadarMarket {
  const flowState = raw.FlowState ?? "";
  const vwapContext = raw.VWAPContext ?? "";
  const trendContext = raw.TrendContext ?? "";
  return {
    ticker:         raw.Ticker ?? "",
    company:        raw.Company ?? "",
    close:          pn(raw.Close),
    toRpBn:         pn(raw.TO_Rp_Bn),
    chgPct:         pn(raw.Chg_Pct),
    perf10d:        pn(raw.Perf10D),
    perf30d:        pn(raw.Perf30D),
    marketContext:  raw.MarketContext ?? "",
    flowState,
    vwapContext,
    trendContext,
    positionContext: raw.PositionContext ?? "",
    phase:          raw.Phase ?? "",
    narrative:      raw.Narrative ?? "",
    bandarScore:    pn(raw.BandarScore),
    flowCore:       pn(raw.FlowCore),
    trendScore:     pn(raw.TrendScore),
    alignScore:     pn(raw.AlignScore),
    posHealth:      pn(raw.PosHealth),
    vwapD1:         pn(raw.VWAP_D1),
    vwap5dAvg:      pn(raw.VWAP_5D_Avg),
    vwapStack:      pn(raw.VWAP_Stack),
    vwapSlopePct:   pn(raw.VWAPSlope_Pct),
    vwapSlopeState: raw.VWAPSlope_State ?? "",
    vwapDistPct:    pn(raw.VWAPDist_Pct),
    nbs1d:          pn(raw.NBS1D),
    nbs5d:          pn(raw.NBS5D),
    nbs10d:         pn(raw.NBS10D),
    nf5d:           pn(raw.NF5D),
    nf25d:          pn(raw.NF25D),
    vwapInflowPct:  pn(raw.VWAPInflow_Pct),
    netValRatio:    pn(raw.NetValRatio),
    divState:       raw.DivState ?? "",
    harmonyStr:     pn(raw.HarmonyStr),
    harmonyState:   raw.HarmonyState ?? "",
    rsMom:          pn(raw.RS_Mom),
    maTrend:        raw.MA_Trend ?? "",
    slopeMA20:      raw.Slope_MA20 ?? "",
    slopeMA40:      raw.Slope_MA40 ?? "",
    slopeMA60:      raw.Slope_MA60 ?? "",
    beta:           pn(raw.Beta),
    alpha:          pn(raw.Alpha),
    rSquared:       pn(raw.R_Squared),
    // derived signals — fallback to NBS value if context is ambiguous
    signal1d:       deriveSignal(flowState,    pn(raw.NBS1D)),
    signal5d:       deriveSignal(vwapContext,  pn(raw.NBS5D)),
    signal10d:      deriveSignal(trendContext, pn(raw.NBS10D)),
  };
}

// ─── Fetch all ────────────────────────────────────────────────

let radarCache: RadarMarket[] | null = null;
let radarCachedAt = 0;
const RADAR_TTL = 60 * 60 * 1000;

function radarProxyUrl(): string {
  if (Platform.OS === "web") {
    const { PROXY_BASE } = require("../config/api");
    return `${PROXY_BASE}/RADAR_MARKET`;
  }
  return "http://103.190.28.248/stockbotprodata/RADAR_MARKET";
}

export async function fetchRadarMarket(): Promise<RadarMarket[]> {
  if (radarCache && Date.now() - radarCachedAt < RADAR_TTL) return radarCache;
  const res = await fetch(radarProxyUrl());
  if (!res.ok) throw new Error(`Radar fetch failed: ${res.status}`);
  const raw: RadarRaw[] = await res.json();
  const parsed = raw.map(parseRadarItem);
  radarCache = parsed;
  radarCachedAt = Date.now();
  return parsed;
}

export async function fetchRadarBySymbol(ticker: string): Promise<RadarMarket | null> {
  const all = await fetchRadarMarket();
  return all.find(r => r.ticker === ticker.toUpperCase()) ?? null;
}

// ─── Bandar Detector — top 40 by |nbs1d| ─────────────────────

export function bandarDetector(data: RadarMarket[], maxItems = 40): RadarMarket[] {
  return [...data]
    .sort((a, b) => Math.abs(b.nbs1d) - Math.abs(a.nbs1d))
    .slice(0, maxItems);
}

// ─── Smart Money In — all 3 TF positive ──────────────────────

export function smartMoneyIn(data: RadarMarket[]): RadarMarket[] {
  return data
    .filter(r => r.nbs1d > 0 && r.nbs5d > 0 && r.nbs10d > 0)
    .sort((a, b) => (Math.abs(b.nbs1d) + Math.abs(b.nbs5d) + Math.abs(b.nbs10d))
                  - (Math.abs(a.nbs1d) + Math.abs(a.nbs5d) + Math.abs(a.nbs10d)));
}

// ─── Score formula ────────────────────────────────────────────

export function calcSmartMoneyScore(r: RadarMarket): number {
  return Math.min(99, Math.round(
    (Math.abs(r.nbs1d) + Math.abs(r.nbs5d) + Math.abs(r.nbs10d)) * 3 + 50
  ));
}
