/**
 * Passthrough proxy — forwards selected route groups to the upstream
 * StockBot Pro backend (stockbotpro.replit.app) verbatim, including
 * method, body, and Authorization header.
 *
 * Routes forwarded:
 *   /api/affiliate/*
 *   /api/payments/*
 *   /api/auth/*
 *   /api/contact
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import https from "https";

const router = Router();

const UPSTREAM_HOST = "stockbotpro.replit.app";

// ─── Generic forwarder ────────────────────────────────────────

function forward(req: Request, res: Response, upstreamPath: string) {
  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? JSON.stringify(req.body ?? {})
      : undefined;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept":       "application/json",
    "Host":         UPSTREAM_HOST,
  };

  if (req.headers.authorization) {
    headers["Authorization"] = req.headers.authorization;
  }
  if (body) {
    headers["Content-Length"] = Buffer.byteLength(body).toString();
  }

  const options: https.RequestOptions = {
    hostname: UPSTREAM_HOST,
    port:     443,
    path:     upstreamPath,
    method:   req.method,
    headers,
    timeout:  20_000,
  };

  const upstream = https.request(options, (uRes) => {
    const chunks: Buffer[] = [];
    uRes.on("data", (c: Buffer) => chunks.push(c));
    uRes.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      res.status(uRes.statusCode ?? 502);
      const ct = uRes.headers["content-type"];
      if (ct) res.setHeader("Content-Type", ct);
      try { res.json(JSON.parse(raw)); }
      catch { res.send(raw); }
    });
  });

  upstream.on("timeout", () => {
    upstream.destroy();
    if (!res.headersSent) res.status(504).json({ error: "Gateway timeout" });
  });

  upstream.on("error", (err) => {
    if (!res.headersSent) {
      res.status(502).json({ error: "Upstream error", detail: err.message });
    }
  });

  if (body) upstream.write(body);
  upstream.end();
}

// ─── Middleware: forward matching prefixes ────────────────────

const PREFIXES = ["/affiliate", "/payments", "/auth"];

router.use((req: Request, res: Response, next: NextFunction) => {
  const path = req.path;

  // /contact (exact POST)
  if (path === "/contact" && req.method === "POST") {
    forward(req, res, "/api/contact");
    return;
  }

  // /settings (exact GET)
  if (path === "/settings" && req.method === "GET") {
    forward(req, res, "/api/settings");
    return;
  }

  // Prefix-based forwarding
  for (const prefix of PREFIXES) {
    if (path.startsWith(prefix + "/") || path === prefix) {
      // Preserve query string
      const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      forward(req, res, `/api${path}${qs}`);
      return;
    }
  }

  next();
});

export default router;
