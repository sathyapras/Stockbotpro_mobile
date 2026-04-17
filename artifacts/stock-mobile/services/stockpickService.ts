import { PROXY_BASE } from "../config/api";

function proxyUrl(name: string): string {
  return `${PROXY_BASE}/${name}`;
}

// ─── Raw types from AFL server ─────────────────────────────────

export interface BOWRaw {
  Ticker: string;
  Date: string;
  Status: "BUY" | "HOLD" | "SOLD";
  Grade: string;
  Rank: string;
  Score: string;
  Conf: string;
  RS_pct: string;
  Val_B: string;
  Close: string;
  BuyClose: string;
  BuyBreak: string;
  Entry: string;
  StopLoss: string;
  SL_pct: string;
  TP1: string;
  TP2: string;
  DistTP1: string;
  RR: string;
  SR_pct: string;
  RSI: string;
  StochK: string;
  Days: string;
  HoldPL_pct: string;
  ClosedPL_pct: string;
  Exit: string;
  SecTrend: string;
  Type: string;
  Action: string;
  OHLCVSignals: string;
  Commentary: string;
}

export interface BOSRaw {
  Ticker: string;
  Date: string;
  Signal: string;  // "Signal BUY" | "Signal HOLD" | "Signal SELL"
  Trend: string;
  Close: string;
  Entry: string;
  StopLoss: string;
  SL_pct: string;
  Target1: string;
  Target2: string;
  SellPrice: string;
  GL_pct: string;
  Hold: string;
  Highest: string;
  Val_B: string;
  Support: string;
  Resistance: string;
  ShortTrend: string;
  VWAP: string;
  VWAP_Trend: string;
  PctVsVWAP: string;
  VWAP_Filter: string;
  SecTrend: string;
  Commentary: string;
}

// ─── Normalised types for the UI ──────────────────────────────

export type SignalStatus = "BUY" | "HOLD" | "SELL" | "SOLD";
export type SignalType = "BOW" | "BOS";

export interface StockPickItem {
  type: SignalType;
  ticker: string;
  date: string;
  status: SignalStatus;
  grade: string;           // BOW: A/B/C/D   BOS: –
  score: number;           // BOW: 0-20   BOS: derived from GL_pct
  conf: number;            // BOW: 0-100  BOS: –
  rsPct: number;           // BOW: RS vs IHSG
  valB: number;            // miliar Rp
  close: number;
  entry: number;
  entryHigh: number | null; // BOW: BuyBreak
  stopLoss: number;
  slPct: number;
  tp1: number;
  tp2: number;
  tp1Pct: number;
  rr: number;
  rsi: number | null;      // BOW only
  stochK: number | null;   // BOW only
  holdDays: string;        // "3 hari" or "hari ke-1"
  glPct: number;           // P&L% (BOW: HoldPL_pct, BOS: GL_pct)
  secTrend: string;
  trend: string;           // BOS: Trend / BOW: ShortTrend via OHLCVSignals
  vwap: number | null;     // BOS only
  vwapTrend: string;       // BOS only
  vwapPct: number | null;  // BOS only
  action: string;          // BOW: Action  BOS: VWAP_Filter
  commentary: string;
  signals: string[];       // chips below the card
}

// ─── Parsers ──────────────────────────────────────────────────

function pf(s: string | null | undefined): number {
  if (!s) return 0;
  return parseFloat(s.replace(/%%/g, "").replace(/ bn/g, "")) || 0;
}

function parseBOW(raw: BOWRaw): StockPickItem {
  const slPct = pf(raw.SL_pct);
  const tp1 = pf(raw.TP1);
  const entry = pf(raw.Entry);
  const tp1Pct = entry > 0 ? ((tp1 - entry) / entry) * 100 : pf(raw.DistTP1);

  const signals: string[] = [];
  if (raw.RSI && parseFloat(raw.RSI) < 30)  signals.push(`RSI ${raw.RSI} Oversold`);
  if (raw.StochK && parseFloat(raw.StochK) < 20) signals.push(`StochK ${raw.StochK}`);
  if (raw.OHLCVSignals?.trim()) signals.push(...raw.OHLCVSignals.trim().split(" ").filter(Boolean));
  if (raw.Type?.trim()) signals.push(raw.Type.trim());

  return {
    type: "BOW",
    ticker: raw.Ticker,
    date: raw.Date,
    status: raw.Status as SignalStatus,
    grade: raw.Grade ?? "–",
    score: pf(raw.Score),
    conf: pf(raw.Conf),
    rsPct: pf(raw.RS_pct),
    valB: pf(raw.Val_B),
    close: pf(raw.Close),
    entry,
    entryHigh: pf(raw.BuyBreak) || null,
    stopLoss: pf(raw.StopLoss),
    slPct,
    tp1,
    tp2: pf(raw.TP2),
    tp1Pct,
    rr: pf(raw.RR),
    rsi: pf(raw.RSI) || null,
    stochK: pf(raw.StochK) || null,
    holdDays: raw.Days ?? "",
    glPct: pf(raw.HoldPL_pct || raw.ClosedPL_pct),
    secTrend: raw.SecTrend ?? "",
    trend: raw.Action ?? "",
    vwap: null,
    vwapTrend: "",
    vwapPct: null,
    action: raw.Action ?? "",
    commentary: raw.Commentary?.replace(/%%/g, "%").trim() ?? "",
    signals: signals.slice(0, 4),
  };
}

function parseBOS(raw: BOSRaw): StockPickItem {
  const status = raw.Signal?.replace("Signal ", "") as SignalStatus;
  const close = pf(raw.Close);
  const entry = pf(raw.Entry);
  const tp1 = pf(raw.Target1);
  const tp2 = pf(raw.Target2);
  const tp1Pct = entry > 0 ? ((tp1 - entry) / entry) * 100 : 0;
  const slPct = pf(raw.SL_pct.replace(/%%/g, ""));
  // derive a score from GL_pct + trend strength
  const glPct = pf(raw.GL_pct);
  const trendScore: Record<string, number> = {
    "Strong Bullish +++": 18, "Strong Bullish ++": 14, "Bullish +": 10,
    "Weak Bullish +": 6, "Neutral": 3,
  };
  const score = Math.min(20, (trendScore[raw.Trend] ?? 5) + Math.max(0, glPct / 5));

  const signals: string[] = [];
  if (raw.Trend?.trim()) signals.push(raw.Trend.trim());
  if (raw.VWAP_Filter === "[VWAP OK]") signals.push("VWAP OK");
  const secParts = raw.SecTrend?.split(" ");
  if (secParts?.at(-1) === "BULL") signals.push(`${secParts.slice(0,-1).join(" ")} BULL`);

  return {
    type: "BOS",
    ticker: raw.Ticker,
    date: raw.Date,
    status,
    grade: "–",
    score,
    conf: 0,
    rsPct: pf(raw.PctVsVWAP),
    valB: pf(raw.Val_B),
    close,
    entry,
    entryHigh: null,
    stopLoss: pf(raw.StopLoss),
    slPct,
    tp1,
    tp2,
    tp1Pct,
    rr: tp1Pct > 0 && slPct < 0 ? tp1Pct / Math.abs(slPct) : 0,
    rsi: null,
    stochK: null,
    holdDays: raw.Hold ?? "",
    glPct,
    secTrend: raw.SecTrend ?? "",
    trend: raw.Trend ?? "",
    vwap: pf(raw.VWAP) || null,
    vwapTrend: raw.VWAP_Trend ?? "",
    vwapPct: pf(raw.PctVsVWAP) || null,
    action: raw.VWAP_Filter ?? "",
    commentary: raw.Commentary?.replace(/%%/g, "%").trim() ?? "",
    signals: signals.slice(0, 4),
  };
}

// ─── Fetchers ─────────────────────────────────────────────────

export async function fetchBOW(): Promise<StockPickItem[]> {
  const res = await fetch(proxyUrl("BuyOnWeakness_Signal"));
  if (!res.ok) throw new Error("Failed to fetch BOW data");
  const raw: BOWRaw[] = await res.json();
  return raw.map(parseBOW);
}

export async function fetchBOS(): Promise<StockPickItem[]> {
  const res = await fetch(proxyUrl("BuyOnStrenght_Signal"));
  if (!res.ok) throw new Error("Failed to fetch BOS data");
  const raw: BOSRaw[] = await res.json();
  return raw.map(parseBOS);
}

export async function fetchAllPicks(): Promise<{ bow: StockPickItem[]; bos: StockPickItem[] }> {
  const [bow, bos] = await Promise.all([fetchBOW(), fetchBOS()]);
  return { bow, bos };
}

// ─── Helpers ──────────────────────────────────────────────────

export const GRADE_COLOR: Record<string, string> = {
  A: "#34d399", B: "#fbbf24", C: "#fb923c", D: "#94a3b8", "–": "#64748b",
};

export const STATUS_CONFIG: Record<SignalStatus, { color: string; label: string }> = {
  BUY:  { color: "#34d399", label: "BUY" },
  HOLD: { color: "#fbbf24", label: "HOLD" },
  SELL: { color: "#f87171", label: "SELL" },
  SOLD: { color: "#94a3b8", label: "SOLD" },
};

export function formatRp(n: number | null | undefined): string {
  if (!n) return "–";
  return n.toLocaleString("id-ID");
}

export function countByStatus(items: StockPickItem[]): Record<string, number> {
  return items.reduce((acc, x) => {
    acc[x.status] = (acc[x.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
