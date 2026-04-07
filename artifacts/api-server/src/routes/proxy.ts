import { Router, type Request, type Response } from "express";
import http from "http";

const router = Router();

interface CacheEntry {
  data: unknown;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_TTL_LONG_MS = 60 * 60 * 1000; // 1 hour (for daily-upload data)

const UPSTREAM: Record<string, { host: string; path: string; ttl?: number }> = {
  broksum_data_1d:         { host: "103.190.28.45",  path: "/broksum_data_1d.json" },
  broksum_data_history15d: { host: "103.190.28.45",  path: "/broksum_data_history15d.json" },
  BuyOnStrenght_Signal:    { host: "103.190.28.248", path: "/stockbotprodata/BuyOnStrenght_Signal" },
  BuyOnWeakness_Signal:    { host: "103.190.28.248", path: "/stockbotprodata/BuyOnWeakness_Signal" },
  STOCKTOOLS_SCREENER:     { host: "103.190.28.248", path: "/stockbotprodata/STOCKTOOLS_SCREENER" },
  MASTER_STOCK_DB:         { host: "103.190.28.248", path: "/stockbotprodata/MASTER_STOCK_DB", ttl: CACHE_TTL_LONG_MS },
};

function fetchUpstream(cfg: { host: string; path: string }): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: cfg.host, port: 80, path: cfg.path, method: "GET", timeout: 30_000 },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
          catch (e) { reject(e); }
        });
      },
    );
    req.on("timeout", () => { req.destroy(); reject(new Error("Upstream timeout")); });
    req.on("error", reject);
    req.end();
  });
}

// Pre-warm cache on startup (non-blocking)
async function prewarm() {
  for (const [name, cfg] of Object.entries(UPSTREAM)) {
    fetchUpstream(cfg)
      .then((data) => {
        cache.set(name, { data, cachedAt: Date.now() });
        console.log(`[proxy] cached ${name} (${JSON.stringify(data).length} bytes)`);
      })
      .catch((err) => console.warn(`[proxy] prewarm failed for ${name}: ${err.message}`));
  }
}

// Start pre-warming in background
prewarm();

router.get("/proxy/:name", async (req: Request, res: Response) => {
  const name = req.params.name;
  const cfg = UPSTREAM[name];
  if (!cfg) {
    res.status(404).json({ error: "Unknown endpoint" });
    return;
  }

  const entry = cache.get(name);
  const now = Date.now();
  const ttl = cfg.ttl ?? CACHE_TTL_MS;

  if (entry && now - entry.cachedAt < ttl) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=900");
    res.setHeader("X-Cache", "HIT");
    res.json(entry.data);
    return;
  }

  try {
    const data = await fetchUpstream(cfg);
    cache.set(name, { data, cachedAt: now });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=900");
    res.setHeader("X-Cache", "MISS");
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (entry) {
      // Serve stale cache on error
      res.setHeader("X-Cache", "STALE");
      res.json(entry.data);
    } else {
      res.status(502).json({ error: "Upstream error", detail: msg });
    }
  }
});

export default router;
