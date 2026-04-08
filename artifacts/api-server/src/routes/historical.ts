import { Router, type Request, type Response } from "express";

const router = Router();

const BASE_URL = "https://stockbotpro.replit.app";

// Simple in-memory cache: symbol → { data, cachedAt }
const _cache = new Map<string, { data: unknown; cachedAt: number }>();
const TTL = 10 * 60 * 1000; // 10 minutes

router.get("/historical/:symbol", async (req: Request, res: Response) => {
  const symbol = (req.params.symbol ?? "").toUpperCase().trim();
  if (!symbol) {
    res.status(400).json({ error: "Missing symbol" });
    return;
  }

  const cached = _cache.get(symbol);
  if (cached && Date.now() - cached.cachedAt < TTL) {
    res.json(cached.data);
    return;
  }

  try {
    const upstream = await fetch(`${BASE_URL}/api/historical/${symbol}`, {
      headers: { Accept: "application/json" },
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error(`[historical] upstream ${upstream.status} for ${symbol}: ${text}`);
      // Return empty array rather than error so client shows empty state
      res.json([]);
      return;
    }

    const data = await upstream.json();
    _cache.set(symbol, { data, cachedAt: Date.now() });
    res.json(data);
  } catch (err) {
    console.error("[historical] fetch error:", err);
    res.json([]);
  }
});

export default router;
