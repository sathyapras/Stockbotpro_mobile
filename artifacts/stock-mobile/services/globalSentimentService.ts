import { Platform } from "react-native";

// ─── API base URL ─────────────────────────────────────────────

function apiBaseUrl(): string {
  if (Platform.OS === "web") {
    const d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
    return `https://${d}/api`;
  }
  return "http://localhost:8080/api";
}

// ─── Types ────────────────────────────────────────────────────

export interface QuoteItem {
  name: string;
  symbol: string;
  value: number | null;
  change: number | null;
  changePct: number | null;
}

export interface GlobalSentiment {
  vix: number | null;
  fearLabel: string;
  usdIdr: number | null;
  dxyValue: number | null;
  dxyBias: string;
  globalBias: string;
}

export interface GlobalSentimentData {
  updatedAt: string;
  stale?: boolean;
  sentiment: GlobalSentiment;
  indices: QuoteItem[];
  domestic: QuoteItem[];
  commodities: QuoteItem[];
  currencies: QuoteItem[];
}

// ─── Fetch ─────────────────────────────────────────────────────

export async function fetchGlobalSentiment(): Promise<GlobalSentimentData> {
  const res = await fetch(`${apiBaseUrl()}/global-sentiment`);
  if (!res.ok) throw new Error("Failed to fetch global sentiment");
  return res.json() as Promise<GlobalSentimentData>;
}

// ─── Narrative generator ───────────────────────────────────────

export function generateNarrative(data: GlobalSentimentData): string {
  const s      = data.sentiment;
  const ihsg   = data.domestic?.find(d => d.name === "IHSG");
  const wti    = data.commodities?.find(d => d.name === "WTI Crude Oil");
  const brent  = data.commodities?.find(d => d.name === "Brent Crude Oil");

  const paragraphs: string[] = [];

  // 1. VIX + IHSG
  const ihsgPct = ihsg?.changePct;
  const ihsgStr = ihsgPct != null
    ? `while IHSG ${ihsgPct >= 0 ? "holds" : "is under pressure"} ${ihsgPct >= 0 ? "+" : ""}${ihsgPct?.toFixed(2)}%`
    : "";
  const fearZone =
    s.fearLabel === "EXTREME_FEAR" ? "Extreme Fear" :
    s.fearLabel === "FEAR"         ? "Fear" :
    s.fearLabel === "GREED"        ? "Greed" :
    s.fearLabel === "EXTREME_GREED" ? "Extreme Greed" : "Neutral";

  paragraphs.push(
    `VIX ${s.vix?.toFixed(1) ?? "—"} is in the ${fearZone} zone — global sentiment is ${s.fearLabel.includes("FEAR") ? "defensive" : "risk-on"}` +
    (ihsgStr ? `, ${ihsgStr}.` : ".")
  );

  // 2. USD/IDR + DXY
  const rupiahStr =
    (s.usdIdr ?? 0) >= 16_500 ? "weakening" :
    (s.usdIdr ?? 0) >= 16_000 ? "stable" : "strengthening";
  const dxyDir = s.dxyBias.includes("WEAK") ? "weakening" :
                 s.dxyBias.includes("STRONG") ? "strengthening" : "stable";
  const emImpact = s.dxyBias.includes("WEAK")
    ? "acting as a tailwind for EM markets including IDX"
    : "putting pressure on EM capital flows";

  paragraphs.push(
    `On the FX side, the Rupiah is ${rupiahStr} at ${s.usdIdr?.toLocaleString("id-ID") ?? "—"} — ` +
    `pressuring FX-indebted issuers such as GOTO, TLKM, and ISAT; ` +
    `DXY ${s.dxyValue?.toFixed(1) ?? "—"} is ${dxyDir}, ${emImpact}.`
  );

  // 3. Oil
  if (wti?.value) {
    const oilDir =
      (wti.changePct ?? 0) < -5 ? "dropped sharply" :
      (wti.changePct ?? 0) < 0  ? "weakened" : "strengthened";
    const oilPct = wti.changePct != null
      ? ` (${wti.changePct >= 0 ? "+" : ""}${wti.changePct?.toFixed(1)}%)`
      : "";
    const brentStr = brent?.value ? ` (Brent $${brent.value?.toFixed(1)})` : "";
    const oilImpact = (wti.changePct ?? 0) < 0
      ? "pressuring energy stocks (MEDC, ELSA), but positive for transportation & manufacturing as lower fuel costs ease margins"
      : "benefiting energy & mining stocks (MEDC, ELSA, ADRO), but compressing margins in transportation & manufacturing";

    paragraphs.push(
      `Oil prices ${oilDir} — WTI $${wti.value?.toFixed(1)}${oilPct}${brentStr} ${oilImpact}.`
    );
  }

  // 4. Conclusion
  const conclusion =
    s.fearLabel.includes("FEAR") || s.globalBias === "RISK_OFF"
      ? "Overall, conditions remain challenging — stay selective: focus on stocks with strong fundamentals, fair valuations, and clean technical setups."
      : s.fearLabel === "NEUTRAL" || s.globalBias === "MIXED"
      ? "Overall, the market is mixed — hold onto profitable positions and avoid FOMO on speculative stocks."
      : "Overall, sentiment is supportive — focus on strong momentum in banking, consumer, and technology sectors.";

  paragraphs.push(conclusion);
  return paragraphs.join("\n\n");
}

// ─── Fear label display helpers ────────────────────────────────

export function fearLabelDisplay(label: string): {
  text: string; color: string; bg: string; icon: string;
  status: string; range: string; note: string;
} {
  switch (label) {
    case "EXTREME_FEAR": return {
      text: "Extreme Fear",  color: "#ef4444", bg: "#2d0a0a", icon: "😱",
      status: "Panic Selling", range: "VIX > 30",
      note: '"Buy the Fear" opportunity for long-term investors.',
    };
    case "FEAR": return {
      text: "Fear",          color: "#f87171", bg: "#2d1010", icon: "😨",
      status: "Risk-Off", range: "VIX 23 – 30",
      note: "Selling pressure building — foreign outflows likely.",
    };
    case "NEUTRAL": return {
      text: "Neutral",       color: "#fbbf24", bg: "#1c1500", icon: "😐",
      status: "Consolidation", range: "VIX 15 – 22",
      note: "Normal volatility — market waiting for a catalyst.",
    };
    case "GREED": return {
      text: "Greed",         color: "#34d399", bg: "#052e16", icon: "😊",
      status: "Risk-On", range: "VIX 12 – 15",
      note: "Ideal conditions for stock accumulation.",
    };
    case "EXTREME_GREED": return {
      text: "Extreme Greed", color: "#10b981", bg: "#042016", icon: "🤑",
      status: "Very Calm", range: "VIX < 12",
      note: "Caution: market may be too complacent.",
    };
    default: return {
      text: "Neutral",       color: "#94a3b8", bg: "#1e2433", icon: "😐",
      status: "Consolidation", range: "VIX 15 – 22",
      note: "Normal volatility — market waiting for a catalyst.",
    };
  }
}
