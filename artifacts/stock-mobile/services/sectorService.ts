import { type MasterStock } from "./masterStockService";
import { type RadarMarket } from "./radarMarketService";

// ─── Types ────────────────────────────────────────────────────

export interface SectorStock {
  symbol: string;
  bandarScore: number;
  trendScore: number;
  flowState: string;
  isAccum: boolean;
}

export interface SectorData {
  sector:          string;
  phase:           "Leading" | "Improving" | "Weakening" | "Lagging";
  avgBandarScore:  number;
  avgTrendScore:   number;
  accPct:          number;
  accCount:        number;
  totalCount:      number;
  radarCount:      number;
  rsChange2w:      number;
  topStocks:       SectorStock[];
}

// ─── Phase config ─────────────────────────────────────────────

export const PHASE_CONFIG: Record<
  "Leading" | "Improving" | "Weakening" | "Lagging",
  { color: string; bg: string; emoji: string; action: string }
> = {
  Leading:   { color: "#34d399", bg: "#052e16", emoji: "🟢", action: "Masuk" },
  Improving: { color: "#60a5fa", bg: "#0c1629", emoji: "🔵", action: "Antisipasi" },
  Weakening: { color: "#f97316", bg: "#1c0e05", emoji: "🟠", action: "Waspada" },
  Lagging:   { color: "#f87171", bg: "#2d0a0a", emoji: "🔴", action: "Hindari" },
};

export const PHASE_ORDER: Record<string, number> = {
  Leading: 0, Improving: 1, Weakening: 2, Lagging: 3,
};

export const PHASE_HINTS: Record<string, string> = {
  Leading:   "RS kuat & momentum positif — sektor terbaik untuk entry",
  Improving: "Momentum mulai membaik — antisipasi rotasi masuk",
  Weakening: "RS masih kuat tapi melambat — mulai waspada",
  Lagging:   "RS lemah & momentum turun — hindari atau exit",
};

// ─── Derivation ───────────────────────────────────────────────

function derivePhase(
  avgBandarScore: number,
  avgRsMom: number,
): "Leading" | "Improving" | "Weakening" | "Lagging" {
  const strongScore = avgBandarScore >= 52;
  const momentumUp  = avgRsMom >= 0;

  if (strongScore  && momentumUp)  return "Leading";
  if (!strongScore && momentumUp)  return "Improving";
  if (strongScore  && !momentumUp) return "Weakening";
  return "Lagging";
}

// ─── Build sector stats from MASTER_STOCK_DB + RADAR_MARKET ───

export function buildSectorStats(
  stocks: MasterStock[],
  radar: RadarMarket[],
): SectorData[] {
  // Build radar lookup by ticker
  const radarMap = new Map(radar.map(r => [r.ticker, r]));

  // Group master stocks by sector
  const sectorMap = new Map<string, MasterStock[]>();
  for (const s of stocks) {
    const sec = s.sector?.trim() || "Lainnya";
    if (!sec || sec === "-" || sec === "") continue;
    const arr = sectorMap.get(sec) ?? [];
    arr.push(s);
    sectorMap.set(sec, arr);
  }

  const result: SectorData[] = [];

  for (const [sector, sectorStocks] of sectorMap) {
    if (sectorStocks.length < 2) continue; // skip micro-sectors

    // Match radar data
    const radarStocks = sectorStocks
      .map(s => radarMap.get(s.symbol))
      .filter((r): r is RadarMarket => r !== undefined);

    if (radarStocks.length === 0) continue;

    // Compute averages
    const avgBandarScore = radarStocks.reduce((s, r) => s + r.bandarScore, 0) / radarStocks.length;
    const avgTrendScore  = radarStocks.reduce((s, r) => s + r.trendScore, 0)  / radarStocks.length;
    const avgRsMom       = radarStocks.reduce((s, r) => s + r.rsMom, 0)       / radarStocks.length;

    // Accumulation count
    const accStocks = radarStocks.filter(r => {
      const fs = (r.flowState ?? "").toUpperCase();
      return fs.includes("ACCUMULATION");
    });
    const accCount = accStocks.length;
    const accPct   = (accCount / radarStocks.length) * 100;

    // Phase
    const phase = derivePhase(avgBandarScore, avgRsMom);

    // Top 3 stocks by bandarScore
    const topStocks: SectorStock[] = radarStocks
      .sort((a, b) => b.bandarScore - a.bandarScore)
      .slice(0, 3)
      .map(r => ({
        symbol:      r.ticker,
        bandarScore: Math.round(r.bandarScore),
        trendScore:  Math.round(r.trendScore),
        flowState:   r.flowState,
        isAccum:     (r.flowState ?? "").toUpperCase().includes("ACCUMULATION"),
      }));

    result.push({
      sector,
      phase,
      avgBandarScore: Math.round(avgBandarScore * 10) / 10,
      avgTrendScore:  Math.round(avgTrendScore  * 10) / 10,
      accPct:         Math.round(accPct * 10) / 10,
      accCount,
      totalCount:     sectorStocks.length,
      radarCount:     radarStocks.length,
      rsChange2w:     Math.round(avgRsMom * 10) / 10,
      topStocks,
    });
  }

  // Sort by avgBandarScore desc by default
  return result.sort((a, b) => b.avgBandarScore - a.avgBandarScore);
}
