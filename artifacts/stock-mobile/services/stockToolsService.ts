import { Platform } from "react-native";

function proxyUrl(name: string): string {
  if (Platform.OS === "web") {
    const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
    return `https://${domain}/api/proxy/${name}`;
  }
  return `http://103.190.28.248/stockbotprodata/${name}`;
}

// ─── Raw AFL row ─────────────────────────────────────────────

export interface ScreenerRaw {
  Ticker: string;
  Close: string;
  Vol_K: string;
  VolAvg50_K: string;
  Chg_Pct: string;
  Swing_Pct: string;
  MA20: string;
  MA50: string;
  High52W: string;
  RSI10: string;
  BB_Pct: string;
  RS: string;
  RS_MA: string;
  // Strategy flags (0 or 1 as string)
  Swing: string;
  Darvas: string;
  BBSq: string;
  HL: string;
  Div: string;
  Retest: string;
  Vol: string;
  Support: string;
  WH52: string;
  Break: string;
  SEPA: string;
  VCP_Setup: string;
  VCP_BO: string;
  // Score fields
  Sc_Swing: string;
  Sc_Darvas: string;
  Sc_BBSq: string;
  Sc_HL: string;
  Sc_Div: string;
  Sc_Retest: string;
  Sc_Vol: string;
  Sc_Support: string;
  Sc_52WH: string;
  Sc_Break: string;
  Sc_SEPA: string;
  Sc_Trend: string;
  Sc_VCP: string;
  Score: string;
  Commentary: string;
}

// ─── Normalised stock result ─────────────────────────────────

export interface ScreenerStock {
  ticker: string;
  close: number;
  chgPct: number;
  volK: number;
  volAvg50K: number;
  volRatio: number;   // Vol_K / VolAvg50_K
  ma20: number;
  ma50: number;
  high52w: number;
  rsi: number;
  bbPct: number;
  rs: number;
  rsMa: number;
  score: number;
  commentary: string;
  // Tool flags
  swing: boolean;
  darvas: boolean;
  bbSq: boolean;
  hl: boolean;
  div: boolean;
  retest: boolean;
  volSpike: boolean;
  support: boolean;
  near52wHigh: boolean;
  breakout: boolean;
  sepa: boolean;
  vcpSetup: boolean;
  vcpBo: boolean;
  nbs: boolean;        // RS > 1.1 (outperforming market)
  volUp3d: boolean;    // VolUp in commentary
  // Tool scores
  scSwing: number;
  scDarvas: number;
  scBbSq: number;
  scHl: number;
  scDiv: number;
  scRetest: number;
  scVol: number;
  scSupport: number;
  sc52wh: number;
  scBreak: number;
  scSepa: number;
  scTrend: number;
  scVcp: number;
}

function pf(s: string): number {
  return parseFloat(s) || 0;
}

function flag(s: string): boolean {
  return s === "1";
}

function parseRow(r: ScreenerRaw): ScreenerStock {
  const volK = pf(r.Vol_K);
  const volAvg50K = pf(r.VolAvg50_K);
  const volRatio = volAvg50K > 0 ? volK / volAvg50K : 0;
  const rs = pf(r.RS);
  const commentary = r.Commentary?.trim() ?? "";

  return {
    ticker: r.Ticker,
    close: pf(r.Close),
    chgPct: pf(r.Chg_Pct),
    volK,
    volAvg50K,
    volRatio,
    ma20: pf(r.MA20),
    ma50: pf(r.MA50),
    high52w: pf(r.High52W),
    rsi: pf(r.RSI10),
    bbPct: pf(r.BB_Pct),
    rs,
    rsMa: pf(r.RS_MA),
    score: pf(r.Score),
    commentary,
    swing: flag(r.Swing),
    darvas: flag(r.Darvas),
    bbSq: flag(r.BBSq),
    hl: flag(r.HL),
    div: flag(r.Div),
    retest: flag(r.Retest),
    volSpike: volRatio >= 2.0,
    support: flag(r.Support),
    near52wHigh: flag(r.WH52),
    breakout: flag(r.Break),
    sepa: flag(r.SEPA),
    vcpSetup: flag(r.VCP_Setup),
    vcpBo: flag(r.VCP_BO),
    nbs: rs > 1.1 && commentary.includes("RS"),
    volUp3d: commentary.includes("VolUp"),
    scSwing: pf(r.Sc_Swing),
    scDarvas: pf(r.Sc_Darvas),
    scBbSq: pf(r.Sc_BBSq),
    scHl: pf(r.Sc_HL),
    scDiv: pf(r.Sc_Div),
    scRetest: pf(r.Sc_Retest),
    scVol: pf(r.Sc_Vol),
    scSupport: pf(r.Sc_Support),
    sc52wh: pf(r.Sc_52WH),
    scBreak: pf(r.Sc_Break),
    scSepa: pf(r.Sc_SEPA),
    scTrend: pf(r.Sc_Trend),
    scVcp: pf(r.Sc_VCP),
  };
}

// ─── Tool definitions ─────────────────────────────────────────

export type ToolId =
  | "buy-on-strength" | "swing-up" | "near-52w-high" | "volume-spike"
  | "buy-on-weakness" | "near-support-bounce" | "hl-higher-low" | "bullish-divergence"
  | "price-vol-breakout" | "darvas-box" | "bb-squeeze" | "buy-on-retest"
  | "nbs-multi-tf" | "volume-increasing-3d" | "rsi-divergence"
  | "sepa" | "vcp-setup" | "vcp-breakout";

export interface ToolDef {
  id: ToolId;
  name: string;
  desc: string;
  color: string;
  scField: keyof ScreenerStock | null;  // which score field to use for strength
  filterFn: (s: ScreenerStock) => boolean;
  fromStockpick?: "BOW" | "BOS";  // use stockpick endpoint instead
}

export interface CategoryDef {
  id: string;
  tagline: string;
  color: string;
  tools: ToolDef[];
}

export const TOOL_CATEGORIES: CategoryDef[] = [
  {
    id: "Momentum",
    tagline: "Saham dengan tenaga naik kuat",
    color: "#f5a623",
    tools: [
      {
        id: "buy-on-strength",
        name: "Buy on Strength",
        desc: "Momentum kuat · Close di atas VWAP",
        color: "#34d399",
        scField: null,
        filterFn: () => false,
        fromStockpick: "BOS",
      },
      {
        id: "swing-up",
        name: "Swing Up",
        desc: "Lonjakan >5% dalam sehari · volume konfirmasi",
        color: "#fbbf24",
        scField: "scSwing",
        filterFn: (s) => s.swing,
      },
      {
        id: "near-52w-high",
        name: "Near 52W High",
        desc: "Mendekati harga tertinggi 52 minggu",
        color: "#fb923c",
        scField: "sc52wh",
        filterFn: (s) => s.near52wHigh,
      },
      {
        id: "volume-spike",
        name: "Volume Spike",
        desc: "Volume meledak >200% avg50D",
        color: "#f59e0b",
        scField: "scVol",
        filterFn: (s) => s.volSpike,
      },
    ],
  },
  {
    id: "Reversal",
    tagline: "Saham siap berbalik arah naik",
    color: "#34d399",
    tools: [
      {
        id: "buy-on-weakness",
        name: "Buy on Weakness",
        desc: "Turun >1% — potensi rebound",
        color: "#60a5fa",
        scField: null,
        filterFn: () => false,
        fromStockpick: "BOW",
      },
      {
        id: "near-support-bounce",
        name: "Near Support",
        desc: "Close dekat support — buy saat bounce",
        color: "#22d3ee",
        scField: "scSupport",
        filterFn: (s) => s.support,
      },
      {
        id: "hl-higher-low",
        name: "HL Higher Low",
        desc: "Higher low 3 hari — trend reversal",
        color: "#38bdf8",
        scField: "scHl",
        filterFn: (s) => s.hl,
      },
      {
        id: "bullish-divergence",
        name: "RSI Divergence",
        desc: "Harga LL, RSI HL — reversal bullish",
        color: "#818cf8",
        scField: "scDiv",
        filterFn: (s) => s.div,
      },
    ],
  },
  {
    id: "Breakout",
    tagline: "Saham siap menembus level kunci",
    color: "#a78bfa",
    tools: [
      {
        id: "price-vol-breakout",
        name: "Price-Vol Breakout",
        desc: "Breakout harga + volume — konfirmasi kuat",
        color: "#a78bfa",
        scField: "scBreak",
        filterFn: (s) => s.breakout,
      },
      {
        id: "darvas-box",
        name: "Darvas Box",
        desc: "Breakout box Darvas — setup klasik",
        color: "#e879f9",
        scField: "scDarvas",
        filterFn: (s) => s.darvas,
      },
      {
        id: "bb-squeeze",
        name: "BB Squeeze",
        desc: "Bollinger Band sempit — siap meledak",
        color: "#f472b6",
        scField: "scBbSq",
        filterFn: (s) => s.bbSq,
      },
      {
        id: "buy-on-retest",
        name: "Buy on Retest",
        desc: "Retest level breakout — konfirmasi ulang",
        color: "#fb7185",
        scField: "scRetest",
        filterFn: (s) => s.retest,
      },
    ],
  },
  {
    id: "Smart Money",
    tagline: "Jejak akumulasi institusi & bandar",
    color: "#38bdf8",
    tools: [
      {
        id: "nbs-multi-tf",
        name: "NBS Multi-TF",
        desc: "Net Buy RS outperform — multi timeframe",
        color: "#38bdf8",
        scField: "scTrend",
        filterFn: (s) => s.nbs,
      },
      {
        id: "volume-increasing-3d",
        name: "Volume 3D",
        desc: "Volume naik 3 hari — akumulasi bersih",
        color: "#2dd4bf",
        scField: "scVol",
        filterFn: (s) => s.volUp3d,
      },
      {
        id: "rsi-divergence",
        name: "RSI Hidden Div",
        desc: "Divergence RSI tersembunyi — momentum kuat",
        color: "#22d3ee",
        scField: "scDiv",
        filterFn: (s) => s.div,
      },
    ],
  },
  {
    id: "Advanced",
    tagline: "SEPA & VCP — setup kelas institusi",
    color: "#c084fc",
    tools: [
      {
        id: "sepa",
        name: "SEPA Setup",
        desc: "Stage 2 Trend + RS Strong + Breakout — Minervini",
        color: "#fde68a",
        scField: "scSepa",
        filterFn: (s) => s.sepa,
      },
      {
        id: "vcp-setup",
        name: "VCP Setup",
        desc: "Volatility Contraction — range kecil, volume dry",
        color: "#c084fc",
        scField: "scVcp",
        filterFn: (s) => s.vcpSetup,
      },
      {
        id: "vcp-breakout",
        name: "VCP Breakout",
        desc: "VCP trigger — breakout dengan volume konfirmasi",
        color: "#a855f7",
        scField: "scVcp",
        filterFn: (s) => s.vcpBo,
      },
    ],
  },
];

// Flat map for easy lookup
export const ALL_TOOLS: ToolDef[] = TOOL_CATEGORIES.flatMap((c) => c.tools);
export function getToolDef(id: string): ToolDef | undefined {
  return ALL_TOOLS.find((t) => t.id === id);
}

// ─── Helpers ─────────────────────────────────────────────────

export function formatVol(k: number): string {
  const v = k * 1000;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export function getStrength(stock: ScreenerStock, tool: ToolDef): number {
  // Map score field to 0-100 range
  if (!tool.scField) return Math.min(100, stock.score * 20);
  const rawScore = stock[tool.scField] as number;
  // Scores are typically 0-5 per tool, normalize to 0-100
  return Math.min(100, rawScore * 20 + stock.score * 8);
}

export function computeCounts(data: ScreenerStock[]): Record<ToolId, number> {
  const counts = {} as Record<ToolId, number>;
  for (const tool of ALL_TOOLS) {
    counts[tool.id] = tool.fromStockpick ? 0 : data.filter(tool.filterFn).length;
  }
  return counts;
}

export function getToolResults(data: ScreenerStock[], toolId: ToolId): ScreenerStock[] {
  const tool = getToolDef(toolId);
  if (!tool || tool.fromStockpick) return [];
  return data
    .filter(tool.filterFn)
    .sort((a, b) => getStrength(b, tool) - getStrength(a, tool));
}

// ─── Fetcher ─────────────────────────────────────────────────

export async function fetchScreener(): Promise<ScreenerStock[]> {
  const res = await fetch(proxyUrl("STOCKTOOLS_SCREENER"));
  if (!res.ok) throw new Error("Failed to fetch screener data");
  const raw: ScreenerRaw[] = await res.json();
  return raw.map(parseRow);
}
