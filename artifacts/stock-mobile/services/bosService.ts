import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "sbp_auth_token";
const BOS_URL   = "https://stockbotpro.replit.app/api/bos";

// ─── Types ────────────────────────────────────────────────────

export interface BosRow {
  symbol:      string;
  date:        string;
  signal:      string;
  trend:       string;
  close:       number;
  entry:       number;
  stopLoss:    number;
  slPct:       number;
  tp1:         number;
  tp2:         number;
  sellPrice:   number;
  glPct:       number;
  hold:        string;
  highest:     number;
  valB:        number;
  support:     number;
  resistance:  number;
  shortTrend:  string;
  vwap:        number;
  vwapTrend:   string;
  vwapPct:     number;
  vwapFilter:  string;
  secTrend:    string;
  slPhase:     string;
  exitReason:  string;
  rr:          number;
  commentary:  string;
}

export interface BosMeta {
  rows:          number;
  fileName:      string;
  uploadedAt:    string;
  approvedCount: number;
}

export interface BosResponse {
  data: BosRow[];
  meta: BosMeta;
}

// ─── Signal classification ─────────────────────────────────────

export const isBuy  = (r: BosRow) => r.signal.toUpperCase().includes("BUY");
export const isHold = (r: BosRow) => r.signal.toUpperCase().includes("HOLD");
export const isSell = (r: BosRow) =>
  r.signal.toUpperCase().includes("SELL") || r.signal.toUpperCase().includes("SOLD");

export function sortByGL(rows: BosRow[]): BosRow[] {
  return [...rows].sort((a, b) => (b.glPct ?? 0) - (a.glPct ?? 0));
}

// ─── Badge helpers ─────────────────────────────────────────────

export function getSLPhaseBadge(slPhase: string): { label: string; color: string } | null {
  if (!slPhase) return null;
  const p = slPhase.toUpperCase();
  if (p.includes("TGT2 HIT")) return { label: "🏆 TP2 Hit · Locked", color: "#a855f7" };
  if (p.includes("TGT1 HIT")) return { label: "🎯 TP1 Hit · Trail ON", color: "#3b82f6" };
  if (p.includes("TRAIL"))    return { label: "🔒 Trail Active",      color: "#06b6d4" };
  if (p.includes("P1"))       return { label: "P1: Fixed SL",         color: "#64748b" };
  return { label: slPhase, color: "#64748b" };
}

export function getVwapStatus(vwapFilter: string): { icon: string; color: string; label: string } {
  const v = (vwapFilter ?? "").toUpperCase();
  if (v.includes("BLOKIR")) return { icon: "🚫", color: "#ef4444", label: "VWAP BLOKIR" };
  if (v.includes("FILTER")) return { icon: "⚠️", color: "#f97316", label: "VWAP FILTER" };
  if (v.includes("OK"))     return { icon: "✅", color: "#22c55e", label: "VWAP OK" };
  return { icon: "—", color: "#64748b", label: vwapFilter };
}

export function getTrendBadge(trend: string): { label: string; color: string } {
  const t = (trend ?? "").toUpperCase();
  if (t.includes("STRONG") && t.includes("BULLISH")) return { label: "Strong Bull", color: "#16a34a" };
  if (t.includes("WEAK")   && t.includes("BULLISH")) return { label: "Weak Bull",   color: "#84cc16" };
  if (t.includes("WEAK")   && t.includes("BEARISH")) return { label: "Weak Bear",   color: "#f97316" };
  if (t.includes("STRONG") && t.includes("BEARISH")) return { label: "Strong Bear", color: "#ef4444" };
  return { label: trend || "—", color: "#64748b" };
}

export function getTargetStatus(row: BosRow) {
  const phase = (row.slPhase ?? "").toUpperCase();
  const tp2Hit = phase.includes("TGT2 HIT");
  const tp1Hit = phase.includes("TGT1 HIT") || tp2Hit;
  const trailActive = phase.includes("TRAIL");
  const match = tp2Hit ? row.slPhase.match(/TS=(\d+)/) : null;
  return { tp1Hit, tp2Hit, trailActive, lockedAt: match?.[1] ?? null };
}

export function glColor(glPct: number): string {
  if (glPct > 0)  return "#22c55e";
  if (glPct < 0)  return "#ef4444";
  return "#94a3b8";
}

export function fmtRp(n: number): string {
  if (!n) return "—";
  return "Rp " + n.toLocaleString("id-ID");
}

// ─── Fetch ────────────────────────────────────────────────────

export async function fetchBos(): Promise<BosResponse> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(BOS_URL, { headers });
  if (res.status === 404) throw Object.assign(new Error("NO_DATA"), { code: "NO_DATA" });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
