# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### API Server (`artifacts/api-server`)
- Express 5 + TypeScript, port 8080
- Routes: `/api/healthz`, `/api/proxy/:name`
- **Proxy with in-memory cache (15 min TTL)**: serves broker summary data from upstream AFL servers
  - `broksum_data_1d` → `http://103.190.28.45/broksum_data_1d.json`
  - `broksum_data_history15d` → `http://103.190.28.45/broksum_data_history15d.json`
  - `BuyOnStrenght_Signal` → `http://103.190.28.248/stockbotprodata/BuyOnStrenght_Signal`
  - `BuyOnWeakness_Signal` → `http://103.190.28.248/stockbotprodata/BuyOnWeakness_Signal`
- Pre-warms cache on startup for all 4 endpoints

### Stock Insight Mobile (`artifacts/stock-mobile`)
- Expo React Native app (iOS, Android, Web)
- **4 Tabs**: Market, Watchlist, Bandar Detector, Screener
- **Bandar Detector** (`app/(tabs)/bandar.tsx`):
  - Fetches 15D broker history via API server proxy (bypasses mixed-content on web)
  - Implements Smart Money Engine locally (`services/smartMoneyEngine.ts`):
    - Computes avg3d/5d/15d, momentum, phase (6 phases), flowScore (0-100), sparkline
  - 4 filter tabs: Top Akumulasi / Entry Peluang / Peringatan / Strong Trend
  - Sparkline bar chart via react-native-svg (`components/Sparkline.tsx`)
- **STOCKTOOLS_SCREENER** proxy added — 289 IDX stocks with RSI, MA, BB, RS, strategies
- **Stock Detail Screen** (`app/stock/[code].tsx`) rebuilt with 4 tabs:
  - Trading Plan: BOW/BOS real data or derived plan, TP/SL boxes, RR bar, signal checklist, commentary
  - Financials: RSI slider, BB%, volume ratio, MA status, RS, active strategies, 1D broker
  - Smart Money: Phase ring, sparkline 15D, key metrics, broker bar, consistency
  - Price Levels: Visual horizontal bar chart of price vs MA20/MA50/52W High + distance table
- **stockDetailService.ts**: Aggregates all 5 AFL endpoints per ticker; computeVerdict() helper
- **Tab deep-linking**: pass `?tab=plan|financials|smartmoney|levels` to open specific tab
  - Bandar tab → Stock Detail opens Smart Money tab
  - Screener tool results → Stock Detail opens Financials tab
  - Stockpick/BOW/BOS → Stock Detail opens Trading Plan tab (default)
- **Data sources**: See `.local/stockbot-docs/data-sources.md` for full reference

## Data Reference
Full API + data source docs at `.local/stockbot-docs/data-sources.md`
