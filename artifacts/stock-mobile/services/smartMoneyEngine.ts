import { Platform } from "react-native";

// On web (HTTPS), fetch via the API proxy to avoid mixed-content blocking.
// On native iOS/Android, fetch directly from HTTP (no restriction).
function getDataUrl(name: "broksum_data_1d" | "broksum_data_history15d"): string {
  if (Platform.OS === "web") {
    const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
    return `https://${domain}/api/proxy/${name}`;
  }
  const DIRECT: Record<string, string> = {
    broksum_data_1d:         "http://103.190.28.45/broksum_data_1d.json",
    broksum_data_history15d: "http://103.190.28.45/broksum_data_history15d.json",
  };
  return DIRECT[name];
}

export interface BrokerRow {
  ticker: string;
  date: string;
  top1_rpb: string;
  top3_rpb: string;
  top5_rpb: string;
  average_rpbn: string | null;
  net_value_rpb: string | null;
  vwap: number | null;
  broker_buy: number | null;
  broker_sell: number | null;
  acc_dist: "Acc" | "Dist" | null;
}

export type Phase =
  | "IGNITION"
  | "EARLY_ACC"
  | "STRONG_TREND"
  | "EXHAUSTION"
  | "DISTRIBUTION"
  | "CHURNING";

export type FlowTrend =
  | "GROWING"
  | "SHRINKING"
  | "TURNING_ACC"
  | "TURNING_DIST"
  | "STABLE";

export interface SmartMoneyResult {
  ticker: string;
  date: string;
  latestAccDist: "Acc" | "Dist" | null;
  latestVwap: number | null;
  top1Label: string;
  top3Label: string;
  top5Label: string;
  top1Val: number;
  top3Val: number;
  brokerBuy: number;
  brokerSell: number;
  avg3d: number;
  avg5d: number;
  avg15d: number;
  mom3d: number;
  mom5d: number;
  dominance: number;
  dominanceLabel: "Single Broker" | "Healthy" | "Weak";
  brokerNet: number;
  fuel: number;
  accDays: number;
  distDays: number;
  flowScore: number;
  phase: Phase;
  sparkline: number[];
  flowTrend: FlowTrend;
  netValBn: number;
}

export const PHASE_CONFIG: Record<Phase, { color: string; label: string; icon: string }> = {
  IGNITION:     { color: "#a78bfa", label: "Ignition",     icon: "🔥" },
  EARLY_ACC:    { color: "#34d399", label: "Early Acc",    icon: "📈" },
  STRONG_TREND: { color: "#60a5fa", label: "Strong Trend", icon: "💪" },
  EXHAUSTION:   { color: "#fbbf24", label: "Exhaustion",   icon: "⚠️" },
  DISTRIBUTION: { color: "#f87171", label: "Distribution", icon: "🚨" },
  CHURNING:     { color: "#94a3b8", label: "Churning",     icon: "↔️" },
};

export const TREND_CONFIG: Record<FlowTrend, { icon: string; color: string; label: string }> = {
  GROWING:      { icon: "▲", color: "#34d399", label: "Menguat" },
  SHRINKING:    { icon: "▼", color: "#f87171", label: "Melemah" },
  TURNING_ACC:  { icon: "↑", color: "#a78bfa", label: "Balik Akumulasi" },
  TURNING_DIST: { icon: "↓", color: "#fb923c", label: "Balik Distribusi" },
  STABLE:       { icon: "→", color: "#94a3b8", label: "Stabil" },
};

function parseRPB(raw: string): { label: string; val: number } {
  const parts = raw.split(" | ");
  const label = parts[0]?.trim() ?? "";
  const val = parseFloat(parts[1] ?? "0") || 0;
  return { label, val };
}

function parseAvgBn(raw: string | null): number {
  if (!raw) return 0;
  return parseFloat(raw.replace(" bn", "")) || 0;
}

function parseFuel(raw: string | null): number {
  if (!raw) return 0;
  return parseFloat(raw.replace(" bn", "")) || 0;
}

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function norm(v: number, min: number, max: number): number {
  return Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
}

function classifyPhase(params: {
  avg3d: number;
  mom3d: number;
  fuel: number;
  brokerNet: number;
  dominance: number;
  distDays: number;
  totalDays: number;
}): Phase {
  const { avg3d, mom3d, fuel, brokerNet, dominance, distDays, totalDays } = params;
  if (avg3d > 0 && mom3d > 0 && brokerNet < 0)                        return "IGNITION";
  if (avg3d > 0 && mom3d > 0 && dominance < 0.7)                      return "EARLY_ACC";
  if (avg3d > 0.5 && mom3d >= 0 && fuel > 0 && brokerNet > 0)         return "STRONG_TREND";
  if (avg3d > 0 && mom3d < 0 && fuel > 0)                             return "EXHAUSTION";
  if (avg3d < 0 && distDays >= Math.floor(totalDays * 0.6))           return "DISTRIBUTION";
  return "CHURNING";
}

function computeFlowScore(params: {
  avg3d: number;
  mom3d: number;
  fuel: number;
  accDays: number;
  totalDays: number;
}): number {
  const { avg3d, mom3d, fuel, accDays, totalDays } = params;
  const a = norm(avg3d, -15, 15)   * 0.35;
  const b = norm(mom3d, -8,   8)   * 0.25;
  const c = norm(fuel,  -300, 300) * 0.25;
  const d = (accDays / Math.max(totalDays, 1)) * 100 * 0.15;
  return Math.round(a + b + c + d);
}

function computeFlowTrend(today: BrokerRow, yesterday: BrokerRow | undefined): FlowTrend {
  if (!yesterday) return "STABLE";
  const fuelToday = parseFuel(today.net_value_rpb);
  const fuelYest  = parseFuel(yesterday.net_value_rpb);
  const delta = fuelToday - fuelYest;
  if (today.acc_dist === "Acc" && yesterday.acc_dist === "Dist") return "TURNING_ACC";
  if (today.acc_dist === "Dist" && yesterday.acc_dist === "Acc") return "TURNING_DIST";
  if (delta > 1)  return "GROWING";
  if (delta < -1) return "SHRINKING";
  return "STABLE";
}

function computeDominanceLabel(d: number): "Single Broker" | "Healthy" | "Weak" {
  if (d > 0.7)  return "Single Broker";
  if (d >= 0.4) return "Healthy";
  return "Weak";
}

function computeTicker(days: BrokerRow[]): SmartMoneyResult {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const prev   = sorted[sorted.length - 2];

  const avgValsNewestFirst = sorted.map(d => parseAvgBn(d.average_rpbn)).reverse();

  const avg3d  = mean(avgValsNewestFirst.slice(0, 3));
  const avg5d  = mean(avgValsNewestFirst.slice(0, 5));
  const avg15d = mean(avgValsNewestFirst);
  const mom3d  = avg3d - avg5d;
  const mom5d  = avg5d - avg15d;

  const top1 = parseRPB(latest.top1_rpb ?? " | 0");
  const top3 = parseRPB(latest.top3_rpb ?? " | 0");
  const top5 = parseRPB(latest.top5_rpb ?? " | 0");

  const sign = latest.acc_dist === "Acc" ? 1 : -1;
  const top1Val = top1.val * sign;
  const top3Val = top3.val * sign;

  const dominance = Math.abs(top3Val) > 0
    ? Math.abs(top1Val) / Math.abs(top3Val)
    : 0;

  const fuel      = parseFuel(latest.net_value_rpb);
  const brokerBuy  = latest.broker_buy  ?? 0;
  const brokerSell = latest.broker_sell ?? 0;
  const brokerNet  = brokerBuy - brokerSell;

  const accDays  = sorted.filter(d => d.acc_dist === "Acc").length;
  const distDays = sorted.filter(d => d.acc_dist === "Dist").length;

  const flowScore = computeFlowScore({
    avg3d, mom3d, fuel, accDays, totalDays: sorted.length,
  });

  const phase = classifyPhase({
    avg3d, mom3d, fuel, brokerNet, dominance,
    distDays, totalDays: sorted.length,
  });

  const sparkline = sorted.map(d => parseAvgBn(d.average_rpbn));
  const flowTrend = computeFlowTrend(latest, prev);

  return {
    ticker: latest.ticker,
    date: latest.date,
    latestAccDist: latest.acc_dist,
    latestVwap: latest.vwap,
    top1Label: top1.label,
    top3Label: top3.label,
    top5Label: top5.label,
    top1Val,
    top3Val,
    brokerBuy,
    brokerSell,
    avg3d,
    avg5d,
    avg15d,
    mom3d,
    mom5d,
    dominance,
    dominanceLabel: computeDominanceLabel(dominance),
    brokerNet,
    fuel,
    accDays,
    distDays,
    flowScore,
    phase,
    sparkline,
    flowTrend,
    netValBn: fuel,
  };
}

export async function fetchSmartMoney(): Promise<SmartMoneyResult[]> {
  const res15d = await fetch(getDataUrl("broksum_data_history15d"));
  const history: BrokerRow[] = await res15d.json();

  const byTicker: Record<string, BrokerRow[]> = {};
  for (const row of history) {
    if (!byTicker[row.ticker]) byTicker[row.ticker] = [];
    byTicker[row.ticker].push(row);
  }

  return Object.values(byTicker).map(computeTicker);
}

export async function fetchSmartMoneyForTicker(ticker: string): Promise<SmartMoneyResult | null> {
  const res = await fetch(getDataUrl("broksum_data_history15d"));
  const history: BrokerRow[] = await res.json();
  const days = history.filter(r => r.ticker === ticker);
  if (!days.length) return null;
  return computeTicker(days);
}

export function getFlowScoreColor(score: number): string {
  if (score >= 70) return "#a78bfa";
  if (score >= 50) return "#60a5fa";
  return "#94a3b8";
}

export function filterByTab(
  data: SmartMoneyResult[],
  tab: "top_acc" | "entry" | "warning" | "strong",
): SmartMoneyResult[] {
  switch (tab) {
    case "top_acc":
      return data
        .filter(d =>
          d.latestAccDist === "Acc" &&
          (d.phase === "IGNITION" || d.phase === "EARLY_ACC") &&
          d.flowScore >= 50,
        )
        .sort((a, b) => b.flowScore - a.flowScore);
    case "entry":
      return data
        .filter(d => d.phase === "IGNITION" || d.phase === "EARLY_ACC")
        .sort((a, b) => b.flowScore - a.flowScore);
    case "warning":
      return data
        .filter(d =>
          d.phase === "DISTRIBUTION" ||
          (d.phase === "EXHAUSTION" && d.latestAccDist === "Dist"),
        )
        .sort((a, b) => a.flowScore - b.flowScore);
    case "strong":
      return data
        .filter(d => d.phase === "STRONG_TREND")
        .sort((a, b) => b.flowScore - a.flowScore);
    default:
      return data.sort((a, b) => b.flowScore - a.flowScore);
  }
}
