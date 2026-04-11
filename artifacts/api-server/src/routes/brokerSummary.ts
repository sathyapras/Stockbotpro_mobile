import { Router, type Request, type Response } from "express";
import http from "http";

const router = Router();

// ─── Upstream fetchers ────────────────────────────────────────

let brokerCache: BrokerRow[] | null = null;
let brokerCachedAt = 0;
const BROKER_TTL = 30 * 60 * 1000; // 30 min

let broker1dCache: BrokerRow[] | null = null;
let broker1dCachedAt = 0;
const BROKER_1D_TTL = 30 * 60 * 1000;

interface BrokerRow {
  ticker: string;
  date: string;
  top1_rpb: string | null;
  top3_rpb: string | null;
  top5_rpb: string | null;
  average_rpbn: string | null;
  net_value_rpb: string | null;
  vwap: number | null;
  broker_buy: number | null;
  broker_sell: number | null;
  acc_dist: string | null;
}

function fetchUpstream(path: string): Promise<BrokerRow[]> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "103.190.28.45", port: 80, path, method: "GET", timeout: 30_000 },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as BrokerRow[]);
          } catch (e) { reject(e); }
        });
      },
    );
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.on("error", reject);
    req.end();
  });
}

async function getBrokerData(): Promise<BrokerRow[]> {
  if (brokerCache && Date.now() - brokerCachedAt < BROKER_TTL) return brokerCache;
  const data = await fetchUpstream("/broksum_data_history15d.json");
  brokerCache = data;
  brokerCachedAt = Date.now();
  return data;
}

async function getBroker1dData(): Promise<BrokerRow[]> {
  if (broker1dCache && Date.now() - broker1dCachedAt < BROKER_1D_TTL) return broker1dCache;
  const data = await fetchUpstream("/broksum_data_1d.json");
  broker1dCache = data;
  broker1dCachedAt = Date.now();
  return data;
}

// ─── Parse helpers ────────────────────────────────────────────

function parseNetValue(val: string | null): number {
  if (!val) return 0;
  const m = val.match(/([-\d.]+)\s*bn/i);
  return m ? parseFloat(m[1]) : 0;
}

// ─── Helpers ──────────────────────────────────────────────────

function parseRpbn(val: string | null): number {
  if (!val) return 0;
  const m = val.match(/([-\d.]+)\s*bn/i);
  return m ? parseFloat(m[1]) : 0;
}

function parseTop1Value(val: string | null): number {
  if (!val) return 0;
  const parts = val.split("|");
  if (parts.length < 2) return 0;
  return parseFloat(parts[1].trim()) || 0;
}

function parseTopLabel(val: string | null): string {
  if (!val) return "—";
  return val.split("|")[0].trim();
}

type Phase = "IGNITION" | "EARLY_ACC" | "STRONG_TREND" | "EXHAUSTION" | "DISTRIBUTION" | "CHURNING";
type FlowTrend = "GROWING" | "SHRINKING" | "TURNING_ACC" | "TURNING_DIST" | "STABLE";
type AccDist = "Acc" | "Dist" | null;

function derivePhase(
  avg3d: number,
  avg5d: number,
  accDays: number,
  distDays: number,
  top1Label: string,
): Phase {
  const mom3d = avg3d - avg5d;
  const isBigAcc  = top1Label.toLowerCase().includes("big acc");
  const isBigDist = top1Label.toLowerCase().includes("big dist");

  if (isBigAcc && avg3d > 0 && accDays >= 3)          return "IGNITION";
  if (avg3d > 0 && accDays > distDays && mom3d > 0)   return "EARLY_ACC";
  if (avg3d > 0 && accDays > distDays && mom3d <= 0)  return "STRONG_TREND";
  if (avg3d > 0 && accDays > 0 && mom3d < -2)         return "EXHAUSTION";
  if (isBigDist || (distDays > accDays && avg3d < 0)) return "DISTRIBUTION";
  return "CHURNING";
}

function calcFlowScore(avg3d: number, accDays: number, distDays: number, mom3d: number): number {
  const base   = Math.min(40, Math.abs(avg3d) * 2);
  const dBonus = Math.min(30, accDays * 2);
  const mBonus = Math.min(20, Math.max(0, mom3d * 3));
  const dPenal = Math.min(20, distDays * 2);
  return Math.min(100, Math.max(0, Math.round(base + dBonus + mBonus - dPenal + 10)));
}

function deriveFlowTrend(
  latestAccDist: AccDist,
  prevAccDist: AccDist,
  mom3d: number,
): FlowTrend {
  if (latestAccDist === "Acc" && prevAccDist === "Dist") return "TURNING_ACC";
  if (latestAccDist === "Dist" && prevAccDist === "Acc") return "TURNING_DIST";
  if (mom3d > 0.5)  return "GROWING";
  if (mom3d < -0.5) return "SHRINKING";
  return "STABLE";
}

function normalizeAccDist(raw: string | null): AccDist {
  const v = (raw ?? "").toLowerCase().trim();
  if (v === "acc") return "Acc";
  if (v === "dist") return "Dist";
  return null;
}

// ─── Core computation (shared by list + single-ticker) ─────────

function computeTicker(ticker: string, history: BrokerRow[]): SmartMoneyItem {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const withData = sorted.filter(r => r.average_rpbn !== null);

  const latest = withData[0];
  const prev   = withData[1] ?? null;
  const latestDate = latest.date;

  const last3  = withData.slice(0, 3).map(r => parseRpbn(r.average_rpbn));
  const last5  = withData.slice(0, 5).map(r => parseRpbn(r.average_rpbn));
  const lastAll = withData.map(r => parseRpbn(r.average_rpbn));
  const avg3d  = last3.reduce((s, v) => s + v, 0) / (last3.length || 1);
  const avg5d  = last5.reduce((s, v) => s + v, 0) / (last5.length || 1);
  const avg15d = lastAll.reduce((s, v) => s + v, 0) / (lastAll.length || 1);
  const mom3d  = avg3d - avg5d;
  const mom5d  = avg5d - avg15d;

  let accDays  = 0;
  let distDays = 0;
  for (const r of withData) {
    const ad = normalizeAccDist(r.acc_dist);
    if (ad === "Acc") accDays++;
    else if (ad === "Dist") distDays++;
  }

  const sparkline = withData.slice(0, 15)
    .map(r => parseRpbn(r.average_rpbn))
    .reverse();

  const latestAccDist = normalizeAccDist(latest.acc_dist);
  const prevAccDist   = prev ? normalizeAccDist(prev.acc_dist) : null;
  const latestVwap    = latest.vwap ?? 0;

  const top1Label = parseTopLabel(latest.top1_rpb);
  const top3Label = parseTopLabel(latest.top3_rpb);
  const top5Label = parseTopLabel(latest.top5_rpb);
  const top1Val   = parseTop1Value(latest.top1_rpb) * (latestAccDist === "Acc" ? 1 : -1);
  const top3Val   = parseTop1Value(latest.top3_rpb) * (latestAccDist === "Acc" ? 1 : -1);

  const bb  = latest.broker_buy  ?? 0;
  const bs  = latest.broker_sell ?? 0;
  const dom = bb + bs > 0 ? bb / (bb + bs) : 0.5;
  const dominanceLabel =
    dom > 0.65 ? "High Concentration"
    : dom > 0.45 ? "Mid Concentration"
    : "Low Concentration";

  const netValBn = parseRpbn(latest.net_value_rpb);
  const fuel     = parseTop1Value(latest.top5_rpb);

  const phase     = derivePhase(avg3d, avg5d, accDays, distDays, top1Label);
  const flowScore = calcFlowScore(avg3d, accDays, distDays, mom3d);
  const flowTrend = deriveFlowTrend(latestAccDist, prevAccDist, mom3d);

  return {
    ticker,
    name:            ticker,
    sector:          "",
    indexCategory:   "",
    date:            latestDate,
    phase,
    flowScore,
    avg3d:           parseFloat(avg3d.toFixed(2)),
    avg5d:           parseFloat(avg5d.toFixed(2)),
    avg15d:          parseFloat(avg15d.toFixed(2)),
    mom3d:           parseFloat(mom3d.toFixed(2)),
    mom5d:           parseFloat(mom5d.toFixed(2)),
    brokerNet:       parseFloat(netValBn.toFixed(2)),
    netValBn:        parseFloat(netValBn.toFixed(2)),
    dominance:       parseFloat(dom.toFixed(3)),
    dominanceLabel,
    fuel:            parseFloat(fuel.toFixed(2)),
    accDays,
    distDays,
    sparkline,
    flowTrend,
    top1Label,
    top3Label,
    top5Label,
    top1Val:         parseFloat(top1Val.toFixed(2)),
    top3Val:         parseFloat(top3Val.toFixed(2)),
    brokerBuy:       bb,
    brokerSell:      bs,
    latestAccDist,
    latestVwap,
    deltaNetVal:     parseFloat(parseRpbn(latest.top1_rpb).toFixed(2)),
    latestAvgPrice:  latestVwap,
  };
}

// ─── Aggregate endpoint ───────────────────────────────────────
// GET /api/broker-summary/market-aggregate → daily broker net flow summary

router.get("/broker-summary/market-aggregate", async (_req: Request, res: Response) => {
  try {
    const rows = await getBroker1dData();
    const valid = rows.filter(r => r.ticker && r.ticker.trim() !== "");

    let totalNetBn = 0;
    let accCount = 0, distCount = 0, unknownCount = 0;
    let totalBuyBrokers = 0, totalSellBrokers = 0;
    let inflowCount = 0, outflowCount = 0;

    for (const r of valid) {
      const net = parseNetValue(r.net_value_rpb);
      totalNetBn += net;
      if (net > 0) inflowCount++;
      else if (net < 0) outflowCount++;

      totalBuyBrokers  += r.broker_buy  ?? 0;
      totalSellBrokers += r.broker_sell ?? 0;

      const ad = (r.acc_dist ?? "").toLowerCase().trim();
      if (ad === "acc")  accCount++;
      else if (ad === "dist") distCount++;
      else unknownCount++;
    }

    const total = valid.length;
    const accPct  = Math.round((accCount  / total) * 100);
    const distPct = Math.round((distCount / total) * 100);

    const netDir   = totalNetBn >= 0 ? "INFLOW" : "OUTFLOW";
    const absNetBn = Math.abs(totalNetBn);
    const netStr   = absNetBn >= 1000
      ? `${totalNetBn >= 0 ? "+" : "-"}${(absNetBn / 1000).toFixed(2)}T`
      : `${totalNetBn >= 0 ? "+" : "-"}${absNetBn.toFixed(0)}B`;

    const brokerBuyDominance = totalBuyBrokers + totalSellBrokers > 0
      ? Math.round((totalBuyBrokers / (totalBuyBrokers + totalSellBrokers)) * 100)
      : 50;

    const date = valid[0]?.date ?? null;

    res.setHeader("Cache-Control", "public, max-age=1800");
    res.json({
      date,
      total,
      totalNetBn:       parseFloat(totalNetBn.toFixed(2)),
      netStr,
      netDir,
      accCount,
      distCount,
      unknownCount,
      accPct,
      distPct,
      inflowCount,
      outflowCount,
      totalBuyBrokers,
      totalSellBrokers,
      brokerBuyDominance,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: "Failed to aggregate broker flow", detail: msg });
  }
});

// ─── Main endpoint ────────────────────────────────────────────
// GET /api/broker-summary/smart-money          → all tickers
// GET /api/broker-summary/smart-money?ticker=X → single ticker

router.get("/broker-summary/smart-money", async (req: Request, res: Response) => {
  try {
    const rows = await getBrokerData();
    const tickerFilter = (req.query.ticker as string | undefined)?.toUpperCase() ?? null;

    // Group by ticker
    const byTicker = new Map<string, BrokerRow[]>();
    for (const row of rows) {
      if (!row.ticker) continue;
      if (tickerFilter && row.ticker.toUpperCase() !== tickerFilter) continue;
      if (!byTicker.has(row.ticker)) byTicker.set(row.ticker, []);
      byTicker.get(row.ticker)!.push(row);
    }

    const PRIORITY: Record<Phase, number> = {
      IGNITION: 1, EARLY_ACC: 2, STRONG_TREND: 3,
      EXHAUSTION: 4, DISTRIBUTION: 5, CHURNING: 6,
    };

    // Single-ticker mode
    if (tickerFilter) {
      const history = byTicker.get(tickerFilter);
      if (!history || history.length === 0) {
        return res.status(404).json({ error: `Ticker ${tickerFilter} not found` });
      }
      const withData = history.filter(r => r.average_rpbn !== null);
      if (withData.length === 0) {
        return res.status(404).json({ error: `No data for ${tickerFilter}` });
      }
      const item = computeTicker(tickerFilter, history);
      res.setHeader("Cache-Control", "public, max-age=900");
      return res.json({ data: item });
    }

    // All-tickers mode
    const result: SmartMoneyItem[] = [];
    for (const [ticker, history] of byTicker.entries()) {
      const withData = history.filter(r => r.average_rpbn !== null);
      if (withData.length < 1) continue;
      result.push(computeTicker(ticker, history));
    }

    result.sort((a, b) => {
      const pd = (PRIORITY[a.phase as Phase] ?? 6) - (PRIORITY[b.phase as Phase] ?? 6);
      return pd !== 0 ? pd : b.flowScore - a.flowScore;
    });

    res.setHeader("Cache-Control", "public, max-age=1800");
    res.json({ data: result, total: result.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: "Failed to compute Smart Money Flow", detail: msg });
  }
});

interface SmartMoneyItem {
  ticker: string;
  name: string;
  sector: string;
  indexCategory: string;
  date: string;
  phase: string;
  flowScore: number;
  avg3d: number;
  avg5d: number;
  avg15d: number;
  mom3d: number;
  mom5d: number;
  brokerNet: number;
  netValBn: number;
  dominance: number;
  dominanceLabel: string;
  fuel: number;
  accDays: number;
  distDays: number;
  sparkline: number[];
  flowTrend: string;
  top1Label: string;
  top3Label: string;
  top5Label: string;
  top1Val: number;
  top3Val: number;
  brokerBuy: number;
  brokerSell: number;
  latestAccDist: "Acc" | "Dist" | null;
  latestVwap: number;
  deltaNetVal: number;
  latestAvgPrice: number;
}

export default router;
