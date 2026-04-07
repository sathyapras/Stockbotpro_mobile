import { Platform } from "react-native";
import {
  BrokerRow,
  SmartMoneyResult,
  fetchSmartMoneyForTicker,
} from "./smartMoneyEngine";
import { MasterStock, fetchMasterStockBySymbol } from "./masterStockService";
import { RadarMarket, fetchRadarBySymbol } from "./radarMarketService";
import { ScreenerRaw } from "./stockToolsService";
import { BOWRaw, BOSRaw } from "./stockpickService";

function proxyUrl(name: string) {
  if (Platform.OS === "web") {
    const d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
    return `https://${d}/api/proxy/${name}`;
  }
  const DIRECT: Record<string, string> = {
    broksum_data_1d: "http://103.190.28.45/broksum_data_1d.json",
    broksum_data_history15d: "http://103.190.28.45/broksum_data_history15d.json",
    BuyOnStrenght_Signal: "http://103.190.28.248/stockbotprodata/BuyOnStrenght_Signal",
    BuyOnWeakness_Signal: "http://103.190.28.248/stockbotprodata/BuyOnWeakness_Signal",
    STOCKTOOLS_SCREENER: "http://103.190.28.248/stockbotprodata/STOCKTOOLS_SCREENER",
  };
  return DIRECT[name];
}

async function fetchJson<T>(name: string): Promise<T> {
  const res = await fetch(proxyUrl(name));
  if (!res.ok) throw new Error(`Failed: ${name}`);
  return res.json();
}

// ─── Assembled stock detail ────────────────────────────────────

export interface TradingPlan {
  type: "BOW" | "BOS" | "COMPUTED";
  status: string;          // "BUY" | "HOLD" | "SOLD" | "WAIT"
  grade: string;           // "A" | "B" | "C" | "D" | "–"
  entry: number;
  entryHigh: number | null;
  stopLoss: number;
  slPct: number;
  tp1: number;
  tp2: number;
  tp1Pct: number;
  rr: number;
  rsi: number | null;
  stochK: number | null;
  holdDays: string;        // "hari ke-3" | "7 hari" (BOS)
  signals: string[];       // OHLCV signal chips
  commentary: string;      // stripped commentary
  action: string;          // "BUY BASE" | "NO TRADE" etc
  score: number;
  // Extended BOW fields
  conf: number;            // confidence %
  rsPct: number;           // RS vs IHSG %
  secTrend: string;        // "Financials BEAR"
  setupType: string;       // "A-Extreme" | "C-Support"
  holdPl: number;          // P/L % when status=HOLD (BOW)
  // Extended BOS fields
  glPct: number;           // G/L % for BOS
  highest: number;         // highest price since entry (BOS)
  vwapTrend: string;       // "NAIK 1 bar" (BOS)
  vwap: number;            // VWAP price (BOS)
  pctVsVwap: number;       // % vs VWAP (BOS)
}

export interface StockQuote {
  ticker: string;
  price: number;
  chgPct: number;
  volK: number;
  volAvg50K: number;
  ma20: number;
  ma50: number;
  high52w: number;
  rsi: number;
  bbPct: number;
  rs: number;
  rsMa: number;
  totalScore: number;
  commentary: string;
  strategies: string[];   // active strategy names
}

export interface OneDayBroker {
  vwap: number | null;
  brokerBuy: number | null;
  brokerSell: number | null;
  accDist: string | null;
  top1: string;
  top3: string;
  top5: string;
  avgNetBn: number | null;
}

export interface StockDetail {
  ticker: string;
  quote: StockQuote | null;
  plan: TradingPlan | null;
  broker1d: OneDayBroker | null;
  smartMoney: SmartMoneyResult | null;
  masterStock: MasterStock | null;   // fundamental + technical from master DB
  radar: RadarMarket | null;         // NBS / VWAP / FlowState from Radar Market
}

// ─── Parsers ─────────────────────────────────────────────────

function pf(s: string | null | undefined): number {
  if (!s) return 0;
  return parseFloat(s.replace(/%%/g, "")) || 0;
}

function parseScreenerRow(r: ScreenerRaw): StockQuote {
  const activeStrategies: string[] = [];
  const flagMap: [string, string][] = [
    ["Swing", "Swing Up"], ["BBSq", "BB Squeeze"], ["HL", "Higher Low"],
    ["Div", "RSI Div"], ["Retest", "Buy Retest"], ["Vol", "Vol Spike"],
    ["Support", "At Support"], ["WH52", "Near 52W High"], ["Break", "Breakout"],
    ["SEPA", "SEPA"], ["VCP_Setup", "VCP Setup"], ["VCP_BO", "VCP Breakout"],
    ["Darvas", "Darvas Box"],
  ];
  flagMap.forEach(([k, label]) => {
    if ((r as any)[k] === "1") activeStrategies.push(label);
  });

  return {
    ticker: r.Ticker,
    price: pf(r.Close),
    chgPct: pf(r.Chg_Pct),
    volK: pf(r.Vol_K),
    volAvg50K: pf(r.VolAvg50_K),
    ma20: pf(r.MA20),
    ma50: pf(r.MA50),
    high52w: pf(r.High52W),
    rsi: pf(r.RSI10),
    bbPct: pf(r.BB_Pct),
    rs: pf(r.RS),
    rsMa: pf(r.RS_MA),
    totalScore: pf(r.Score),
    commentary: r.Commentary?.replace(/%%/g, "%").trim() ?? "",
    strategies: activeStrategies,
  };
}

function parse1dBroker(r: BrokerRow): OneDayBroker {
  const parseTopLabel = (s: string | null): string => {
    if (!s) return "–";
    const parts = s.split("|");
    return parts[0]?.trim() || "–";
  };
  const avgMatch = r.average_rpbn?.match(/([+-]?\d+\.?\d*)/);
  return {
    vwap: r.vwap,
    brokerBuy: r.broker_buy,
    brokerSell: r.broker_sell,
    accDist: r.acc_dist,
    top1: parseTopLabel(r.top1_rpb),
    top3: parseTopLabel(r.top3_rpb),
    top5: parseTopLabel(r.top5_rpb),
    avgNetBn: avgMatch ? parseFloat(avgMatch[1]) : null,
  };
}

function stripCommentaryMeta(raw: string | undefined): string {
  if (!raw) return "";
  const s = raw.replace(/%%/g, "%").trim();
  const metaIdx = s.indexOf("| Grade=");
  return (metaIdx >= 0 ? s.slice(0, metaIdx) : s).trim();
}

function bowToPlan(r: BOWRaw): TradingPlan {
  const entry = pf(r.Entry);
  const tp1 = pf(r.TP1);
  const tp1Pct = entry > 0 ? ((tp1 - entry) / entry) * 100 : pf(r.DistTP1);
  const signals: string[] = (r.OHLCVSignals?.trim() ?? "").split(" ").filter(Boolean);
  return {
    type: "BOW", status: r.Status ?? "HOLD", grade: r.Grade ?? "–",
    entry, entryHigh: pf(r.BuyBreak) || null,
    stopLoss: pf(r.StopLoss), slPct: pf(r.SL_pct),
    tp1, tp2: pf(r.TP2), tp1Pct, rr: pf(r.RR),
    rsi: pf(r.RSI) || null, stochK: pf(r.StochK) || null,
    holdDays: r.Days ?? "", signals: signals.slice(0, 6),
    commentary: stripCommentaryMeta(r.Commentary),
    action: r.Action ?? "", score: pf(r.Score),
    conf: pf(r.Conf), rsPct: pf(r.RS_pct),
    secTrend: r.SecTrend ?? "", setupType: r.Type ?? "",
    holdPl: pf(r.HoldPL_pct),
    glPct: 0, highest: 0, vwapTrend: "", vwap: 0, pctVsVwap: 0,
  };
}

function bosToPlan(r: BOSRaw): TradingPlan {
  const entry = pf(r.Entry);
  const tp1 = pf(r.Target1);
  const slPct = pf(r.SL_pct);
  const tp1Pct = entry > 0 ? ((tp1 - entry) / entry) * 100 : 0;
  const rrCalc = tp1Pct > 0 && slPct > 0 ? tp1Pct / slPct : 0;
  const signals: string[] = [r.Trend, r.ShortTrend].filter(Boolean);
  if (r.VWAP_Filter === "[VWAP OK]") signals.push("VWAP OK");
  const status = (r.Signal ?? "").replace("Signal ", "").toUpperCase() || "HOLD";
  return {
    type: "BOS", status, grade: "–",
    entry, entryHigh: null,
    stopLoss: pf(r.StopLoss), slPct,
    tp1, tp2: pf(r.Target2), tp1Pct, rr: rrCalc,
    rsi: null, stochK: null,
    holdDays: r.Hold ?? "", signals: signals.slice(0, 4),
    commentary: r.Commentary?.replace(/%%/g, "%").trim() ?? "",
    action: r.VWAP_Filter ?? "", score: 0,
    conf: 0, rsPct: 0, secTrend: r.SecTrend ?? "", setupType: "",
    holdPl: 0,
    glPct: pf(r.GL_pct), highest: pf(r.Highest),
    vwapTrend: r.VWAP_Trend ?? "", vwap: pf(r.VWAP), pctVsVwap: pf(r.PctVsVWAP),
  };
}

function computedPlan(q: StockQuote): TradingPlan {
  const entry = q.price;
  const support = q.ma20 > 0 ? q.ma20 * 0.97 : entry * 0.95;
  const sl = support * 0.97;
  const tp1 = q.high52w > entry ? Math.min(q.high52w, entry * 1.08) : entry * 1.07;
  const tp2 = entry * 1.14;
  const slPct = Math.abs(((sl - entry) / entry) * 100);
  const tp1Pct = ((tp1 - entry) / entry) * 100;
  const rr = tp1Pct > 0 && slPct > 0 ? tp1Pct / slPct : 0;
  return {
    type: "COMPUTED", status: q.rsi < 40 ? "BUY" : q.rsi > 65 ? "HOLD" : "WATCH",
    grade: "–", entry, entryHigh: null,
    stopLoss: Math.round(sl), slPct,
    tp1: Math.round(tp1), tp2: Math.round(tp2), tp1Pct, rr,
    rsi: q.rsi, stochK: null,
    holdDays: "", signals: q.strategies.slice(0, 4),
    commentary: q.commentary,
    action: q.rsi < 40 ? "Potensi Rebound" : "Pantau Support",
    score: q.totalScore * 15,
    conf: 0, rsPct: q.rs > 1 ? (q.rs - 1) * 100 : (q.rs - 1) * 100,
    secTrend: "", setupType: "", holdPl: 0,
    glPct: 0, highest: 0, vwapTrend: "", vwap: 0, pctVsVwap: 0,
  };
}

// ─── Verdict computation ──────────────────────────────────────

export interface Verdict {
  label: string;
  sub: string;
  color: string;
  emoji: string;
  score: number;
  action: string;
}

export function computeVerdict(plan: TradingPlan | null, quote: StockQuote | null): Verdict {
  const rsi = plan?.rsi ?? quote?.rsi ?? 50;
  const status = (plan?.status ?? "").toUpperCase();
  const isBuy = status.includes("BUY");
  const isSell = status.includes("SELL") || status.includes("SOLD");
  const isBOS = plan?.type === "BOS";
  const strategies = quote?.strategies ?? [];
  const hasAccum = strategies.some(s => s.includes("Support") || s.includes("Higher Low"));

  if (isBOS) {
    return { label: "BUY ON STRENGTH", sub: "Momentum breakout — tren naik terkonfirmasi", color: "#a78bfa", emoji: "🚀", score: 80, action: "Entry saat pullback ringan atau current price" };
  }
  if (isBuy && rsi < 35 && hasAccum) {
    return { label: "STRONG BUY", sub: "RSI oversold + akumulasi terdeteksi", color: "#34d399", emoji: "💎", score: 92, action: "Segera akumulasi di zona entry" };
  }
  if (isBuy && rsi < 40) {
    return { label: "BUY ON WEAKNESS", sub: "RSI oversold — peluang beli murah", color: "#34d399", emoji: "✅", score: 78, action: "Akumulasi bertahap di support zone" };
  }
  if (isBuy) {
    return { label: "BUY", sub: "Sinyal teknikal positif", color: "#34d399", emoji: "📈", score: 65, action: "Entry di zona support dengan konfirmasi volume" };
  }
  if (isSell) {
    return { label: "AVOID / SELL", sub: "Tekanan jual dominan saat ini", color: "#f87171", emoji: "⚠️", score: 60, action: "Tunggu reversal — jangan beli" };
  }
  if (rsi < 35 && hasAccum) {
    return { label: "ACCUMULATE", sub: "Oversold + akumulasi — potensi breakout", color: "#34d399", emoji: "⚡", score: 72, action: "Entry bertahap, konfirmasi volume" };
  }
  return { label: "WAIT & WATCH", sub: "Belum ada sinyal kuat — pantau dulu", color: "#fbbf24", emoji: "👀", score: 45, action: "Pasang alert di support, tunggu konfirmasi" };
}

// ─── Main fetcher ─────────────────────────────────────────────

export async function fetchStockDetail(ticker: string): Promise<StockDetail> {
  const tickerUpper = ticker.toUpperCase();

  const [screener, broker1dAll, bow, bos, smartMoney, masterStock, radar] = await Promise.all([
    fetchJson<ScreenerRaw[]>("STOCKTOOLS_SCREENER"),
    fetchJson<BrokerRow[]>("broksum_data_1d"),
    fetchJson<BOWRaw[]>("BuyOnWeakness_Signal"),
    fetchJson<BOSRaw[]>("BuyOnStrenght_Signal"),
    fetchSmartMoneyForTicker(tickerUpper).catch(() => null),
    fetchMasterStockBySymbol(tickerUpper).catch(() => null),
    fetchRadarBySymbol(tickerUpper).catch(() => null),
  ]);

  // Quote from screener (prefer master data for price if screener missing)
  const screenerRow = screener.find(r => r.Ticker === tickerUpper);
  const quote = screenerRow ? parseScreenerRow(screenerRow) : null;

  // 1D broker
  const broker1dRow = broker1dAll.find(r => r.ticker === tickerUpper);
  const broker1d = broker1dRow ? parse1dBroker(broker1dRow) : null;

  // Trading plan: prefer BOW, then BOS, then computed
  const bowRow = bow.find(r => r.Ticker === tickerUpper);
  const bosRow = bos.find(r => r.Ticker === tickerUpper);
  let plan: TradingPlan | null = null;
  if (bowRow) plan = bowToPlan(bowRow);
  else if (bosRow) plan = bosToPlan(bosRow);
  else if (quote) plan = computedPlan(quote);

  return { ticker: tickerUpper, quote, plan, broker1d, smartMoney, masterStock, radar };
}
