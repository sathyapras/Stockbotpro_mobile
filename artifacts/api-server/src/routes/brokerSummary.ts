import { Router, type Request, type Response } from "express";
import http from "http";

const router = Router();

// ─── Upstream fetcher ─────────────────────────────────────────

let brokerCache: BrokerRow[] | null = null;
let brokerCachedAt = 0;
const BROKER_TTL = 30 * 60 * 1000; // 30 min

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

function fetchBrokerHistory(): Promise<BrokerRow[]> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "103.190.28.45",
        port: 80,
        path: "/broksum_data_history15d.json",
        method: "GET",
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as BrokerRow[]);
          } catch (e) {
            reject(e);
          }
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
  const data = await fetchBrokerHistory();
  brokerCache = data;
  brokerCachedAt = Date.now();
  return data;
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

function parseTop1Label(val: string | null): string {
  if (!val) return "—";
  return val.split("|")[0].trim();
}

type Phase = "IGNITION" | "EARLY_ACC" | "STRONG_TREND" | "EXHAUSTION" | "DISTRIBUTION" | "CHURNING";

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

// ─── Main endpoint ────────────────────────────────────────────

router.get("/broker-summary/smart-money", async (_req: Request, res: Response) => {
  try {
    const rows = await getBrokerData();

    // Group by ticker
    const byTicker = new Map<string, BrokerRow[]>();
    for (const row of rows) {
      if (!row.ticker) continue;
      if (!byTicker.has(row.ticker)) byTicker.set(row.ticker, []);
      byTicker.get(row.ticker)!.push(row);
    }

    const result: SmartMoneyItem[] = [];

    for (const [ticker, history] of byTicker.entries()) {
      // Sort by date descending (most recent first)
      const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));

      // Need at least 3 recent rows with data
      const withData = sorted.filter(r => r.average_rpbn !== null);
      if (withData.length < 1) continue;

      const latestDate = withData[0].date;
      const latest     = withData[0];

      // avg3d — average net for last 3 days
      const last3  = withData.slice(0, 3).map(r => parseRpbn(r.average_rpbn));
      const last5  = withData.slice(0, 5).map(r => parseRpbn(r.average_rpbn));
      const avg3d  = last3.reduce((s, v) => s + v, 0) / (last3.length || 1);
      const avg5d  = last5.reduce((s, v) => s + v, 0) / (last5.length || 1);
      const mom3d  = avg3d - avg5d;

      // accDays / distDays from history
      let accDays  = 0;
      let distDays = 0;
      for (const r of withData) {
        const ad = (r.acc_dist ?? "").toLowerCase();
        if (ad === "acc") accDays++;
        else if (ad === "dist") distDays++;
      }

      // sparkline — last 5 daily values
      const sparkline = withData.slice(0, 5)
        .map(r => parseRpbn(r.average_rpbn))
        .reverse();

      // flowTrend
      const flowTrend = mom3d > 0.5 ? "up" : mom3d < -0.5 ? "down" : "flat";

      // top1Label
      const top1Label = parseTop1Label(latest.top1_rpb);
      const top3Label = [
        parseTop1Label(latest.top1_rpb),
        parseTop1Label(latest.top3_rpb),
        parseTop1Label(latest.top5_rpb),
      ].filter(s => s !== "—").join(",");

      // dominance proxy from broker_buy/(broker_buy+broker_sell)
      const bb  = latest.broker_buy  ?? 0;
      const bs  = latest.broker_sell ?? 0;
      const dom = bb + bs > 0 ? bb / (bb + bs) : 0.5;
      const dominanceLabel =
        dom > 0.65 ? "High Concentration"
        : dom > 0.45 ? "Mid Concentration"
        : "Low Concentration";

      const fuel = parseTop1Value(latest.top5_rpb);

      const phase     = derivePhase(avg3d, avg5d, accDays, distDays, top1Label);
      const flowScore = calcFlowScore(avg3d, accDays, distDays, mom3d);

      result.push({
        ticker,
        name:           ticker,
        sector:         "",
        indexCategory:  "",
        date:           latestDate,
        phase,
        flowScore,
        avg3d:          parseFloat(avg3d.toFixed(2)),
        avg5d:          parseFloat(avg5d.toFixed(2)),
        mom3d:          parseFloat(mom3d.toFixed(2)),
        brokerNet:      parseFloat(parseRpbn(latest.net_value_rpb).toFixed(2)),
        dominance:      parseFloat(dom.toFixed(3)),
        dominanceLabel,
        fuel:           parseFloat(fuel.toFixed(2)),
        accDays,
        distDays,
        sparkline,
        flowTrend,
        deltaNetVal:    parseFloat(parseRpbn(latest.top1_rpb).toFixed(2)),
        top1Label,
        top3Label,
        latestAccDist:  parseFloat(avg3d.toFixed(2)),
        latestAvgPrice: latest.vwap ?? 0,
      });
    }

    // Sort by priority: IGNITION first, then by flowScore desc
    const PRIORITY: Record<Phase, number> = {
      IGNITION: 1, EARLY_ACC: 2, STRONG_TREND: 3,
      EXHAUSTION: 4, DISTRIBUTION: 5, CHURNING: 6,
    };
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
  mom3d: number;
  brokerNet: number;
  dominance: number;
  dominanceLabel: string;
  fuel: number;
  accDays: number;
  distDays: number;
  sparkline: number[];
  flowTrend: string;
  deltaNetVal: number;
  top1Label: string;
  top3Label: string;
  latestAccDist: number;
  latestAvgPrice: number;
}

export default router;
