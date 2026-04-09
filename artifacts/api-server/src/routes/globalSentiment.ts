import { Router, type Request, type Response } from "express";
import https from "https";

const router = Router();

// ─── Cache ─────────────────────────────────────────────────────

let _cache: GlobalSentimentResponse | null = null;
let _cachedAt = 0;
const TTL = 10 * 60 * 1000; // 10 minutes

// ─── Types ─────────────────────────────────────────────────────

interface QuoteItem {
  name: string;
  symbol: string;
  value: number | null;
  change: number | null;
  changePct: number | null;
}

interface GlobalSentimentResponse {
  updatedAt: string;
  stale?: boolean;
  sentiment: {
    vix: number | null;
    fearLabel: string;
    usdIdr: number | null;
    dxyValue: number | null;
    dxyBias: string;
    globalBias: string;
  };
  indices: QuoteItem[];
  domestic: QuoteItem[];
  commodities: QuoteItem[];
  currencies: QuoteItem[];
}

// ─── Yahoo Finance fetcher ─────────────────────────────────────

function fetchYahoo(symbol: string): Promise<{
  value: number | null;
  change: number | null;
  changePct: number | null;
}> {
  return new Promise((resolve) => {
    const encoded = encodeURIComponent(symbol);
    const options = {
      hostname: "query1.finance.yahoo.com",
      path: `/v8/finance/chart/${encoded}?interval=1d&range=5d`,
      method: "GET",
      timeout: 12_000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StockBot/1.0)",
        Accept: "application/json",
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          const meta = json?.chart?.result?.[0]?.meta;
          if (!meta) {
            resolve({ value: null, change: null, changePct: null });
            return;
          }
          const value = meta.regularMarketPrice ?? null;
          const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
          const change = value != null && prev != null ? value - prev : null;
          const changePct =
            change != null && prev != null && prev !== 0
              ? (change / prev) * 100
              : null;
          resolve({ value, change, changePct });
        } catch {
          resolve({ value: null, change: null, changePct: null });
        }
      });
    });

    req.on("error", () => resolve({ value: null, change: null, changePct: null }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ value: null, change: null, changePct: null });
    });
    req.end();
  });
}

// ─── Sentiment classifiers ─────────────────────────────────────

function classifyVix(vix: number | null): string {
  if (vix == null) return "NEUTRAL";
  if (vix > 30)  return "EXTREME_FEAR";
  if (vix >= 23) return "FEAR";
  if (vix >= 15) return "NEUTRAL";
  if (vix >= 12) return "GREED";
  return "EXTREME_GREED";
}

function classifyDxy(dxy: number | null): string {
  if (dxy == null) return "NEUTRAL_USD";
  if (dxy > 105) return "STRONG_USD";
  if (dxy < 98) return "WEAK_USD";
  return "NEUTRAL_USD";
}

function classifyBias(vix: number | null, ihsgPct: number | null): string {
  const fear = classifyVix(vix);
  if (fear === "EXTREME_FEAR" || fear === "FEAR") return "RISK_OFF";
  if (fear === "EXTREME_GREED" || fear === "GREED") return "RISK_ON";
  if (ihsgPct != null && ihsgPct < -1) return "RISK_OFF";
  if (ihsgPct != null && ihsgPct > 1) return "RISK_ON";
  return "MIXED";
}

// ─── Build response ────────────────────────────────────────────

async function buildSentiment(): Promise<GlobalSentimentResponse> {
  const [vixQ, spQ, nasdaqQ, nikkeiQ, hsiQ, ihsgQ, usdIdrQ, dxyQ, wtiQ, brentQ, goldQ] =
    await Promise.all([
      fetchYahoo("^VIX"),
      fetchYahoo("^GSPC"),
      fetchYahoo("^IXIC"),
      fetchYahoo("^N225"),
      fetchYahoo("^HSI"),
      fetchYahoo("^JKSE"),
      fetchYahoo("USDIDR=X"),
      fetchYahoo("DX-Y.NYB"),
      fetchYahoo("CL=F"),
      fetchYahoo("BZ=F"),
      fetchYahoo("GC=F"),
    ]);

  return {
    updatedAt: new Date().toISOString(),
    sentiment: {
      vix:        vixQ.value,
      fearLabel:  classifyVix(vixQ.value),
      usdIdr:     usdIdrQ.value,
      dxyValue:   dxyQ.value,
      dxyBias:    classifyDxy(dxyQ.value),
      globalBias: classifyBias(vixQ.value, ihsgQ.changePct),
    },
    indices: [
      { name: "S&P 500",    symbol: "^GSPC",  ...spQ     },
      { name: "NASDAQ",     symbol: "^IXIC",  ...nasdaqQ },
      { name: "Nikkei 225", symbol: "^N225",  ...nikkeiQ },
      { name: "Hang Seng",  symbol: "^HSI",   ...hsiQ    },
    ],
    domestic: [
      { name: "IHSG", symbol: "^JKSE", ...ihsgQ },
    ],
    commodities: [
      { name: "WTI Crude Oil",   symbol: "CL=F",     ...wtiQ   },
      { name: "Brent Crude Oil", symbol: "BZ=F",     ...brentQ },
      { name: "Gold",            symbol: "GC=F",     ...goldQ  },
    ],
    currencies: [
      { name: "USD/IDR", symbol: "USDIDR=X",  ...usdIdrQ },
      { name: "DXY",     symbol: "DX-Y.NYB",  ...dxyQ    },
    ],
  };
}

// ─── Route ─────────────────────────────────────────────────────

router.get("/global-sentiment", async (_req: Request, res: Response) => {
  if (_cache && Date.now() - _cachedAt < TTL) {
    return res.json(_cache);
  }
  try {
    const data = await buildSentiment();
    _cache = data;
    _cachedAt = Date.now();
    return res.json(data);
  } catch {
    if (_cache) return res.json({ ..._cache, stale: true });
    return res.status(502).json({ error: "Gagal mengambil data sentimen global" });
  }
});

export default router;
