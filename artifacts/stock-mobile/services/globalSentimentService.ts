import { Platform } from "react-native";

// ─── API base URL ─────────────────────────────────────────────

import { API_BASE } from "../config/api";

function apiBaseUrl(): string {
  return API_BASE;
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

  // 4. VIX + DXY Combined Signal
  const vix = s.vix ?? 0;
  const dxy = s.dxyValue ?? 0;
  const isDangerZone = vix > 25 && dxy > 103;
  const isGoldilocks  = vix < 15 && s.dxyBias === "WEAK_USD";

  const vixDxySignal = isDangerZone
    ? `⚠️ SINYAL BAHAYA: VIX ${vix.toFixed(1)} (>25) dan DXY ${dxy.toFixed(1)} (>103) menyala bersamaan — ini tanda "pintu keluar" bagi pasar Indonesia. Investor asing kemungkinan besar sedang melakukan massive outflow. Prioritaskan cash, hindari averaging down, dan tunggu stabilisasi sebelum re-entry.`
    : isGoldilocks
    ? `✅ SINYAL GOLDILOCKS: VIX ${vix.toFixed(1)} (<15) dan DXY ${dxy.toFixed(1)} melemah — kombinasi terbaik untuk pasar EM. Kondisi ini secara historis mendukung IHSG untuk rally, dengan asing cenderung Net Buy dan Rupiah menguat. Manfaatkan momentum akumulasi.`
    : vix > 25
    ? `⚡ WASPADA VIX: VIX ${vix.toFixed(1)} tinggi namun DXY ${dxy.toFixed(1)} belum di level ekstrem. Pantau pergerakan Dollar — jika DXY menembus >103, risiko outflow asing akan meningkat signifikan.`
    : dxy > 103
    ? `⚡ WASPADA DXY: Dollar menguat ke ${dxy.toFixed(1)} meski VIX ${vix.toFixed(1)} masih terkendali. Tekanan Rupiah berpotensi berlanjut — cermati saham-saham dengan utang valas besar dan sektor yang sensitif terhadap kurs.`
    : `📊 VIX ${vix.toFixed(1)} dan DXY ${dxy.toFixed(1)} dalam kondisi normal — belum ada sinyal bahaya kombinasi. Tetap pantau jika salah satu mulai bergerak ekstrem.`;

  paragraphs.push(vixDxySignal);

  // 5. VIX Interpretation & Action Guide
  const vixAction =
    s.fearLabel === "EXTREME_FEAR"
      ? "VIX menembus level ekstrem (>30) — area jenuh jual (peak panic). Sejarah mencatat ini sebagai momen terbaik untuk mulai mencicil saham-saham undervalued secara bertahap. Pertimbangkan parkir sebagian dana di Emas atau Reksadana Pasar Uang sambil menunggu volatilitas mereda."
      : s.fearLabel === "FEAR"
      ? "VIX di zona Fear (23–30): sinyal waspada. Rupiah biasanya ikut tertekan dan IHSG berpotensi koreksi lanjutan. Prioritaskan cash, pantau area support kuat pada Blue Chip perbankan (BBCA, BBRI, BMRI, ASII), dan hindari Average Down terlalu dini di tengah volatilitas."
      : s.fearLabel === "NEUTRAL"
      ? "VIX di zona Neutral (15–22): pasar EM dalam mode konsolidasi. Pantau apakah VIX cenderung naik atau turun — jika merangkak naik, mulai siapkan strategi defensif. Jaga porsi kas yang cukup sebagai peluru untuk aksi beli saat peluang muncul."
      : s.fearLabel === "GREED"
      ? "VIX di zona Risk-On (12–15): kondisi ideal untuk akumulasi. Dana asing biasanya Net Buy, IHSG cenderung bullish, dan saham Blue Chip seperti perbankan besar biasanya memimpin penguatan. Manfaatkan momentum, namun tetap disiplin pada level entry."
      : "VIX di level sangat rendah (<12) — pasar terlalu nyaman (complacent). Ingat pepatah: 'When the VIX is low, look out below.' Kurangi eksposur ke saham spekulatif dan perketat manajemen risiko.";

  paragraphs.push(vixAction);

  // 5. Conclusion
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
      note: 'Momen "Buy the Fear" bagi investor jangka panjang.',
    };
    case "FEAR": return {
      text: "Fear",          color: "#f87171", bg: "#2d1010", icon: "😨",
      status: "Risk-Off", range: "VIX 23 – 30",
      note: "Tekanan jual mulai terasa, asing biasanya outflow.",
    };
    case "NEUTRAL": return {
      text: "Neutral",       color: "#fbbf24", bg: "#1c1500", icon: "😐",
      status: "Consolidation", range: "VIX 15 – 22",
      note: "Volatilitas normal, pasar menunggu katalis.",
    };
    case "GREED": return {
      text: "Greed",         color: "#34d399", bg: "#052e16", icon: "😊",
      status: "Risk-On", range: "VIX 12 – 15",
      note: "Kondisi ideal untuk akumulasi saham.",
    };
    case "EXTREME_GREED": return {
      text: "Extreme Greed", color: "#10b981", bg: "#042016", icon: "🤑",
      status: "Very Calm", range: "VIX < 12",
      note: "Hati-hati, pasar sudah terlalu nyaman (Complacent).",
    };
    default: return {
      text: "Neutral",       color: "#94a3b8", bg: "#1e2433", icon: "😐",
      status: "Consolidation", range: "VIX 15 – 22",
      note: "Volatilitas normal, pasar menunggu katalis.",
    };
  }
}
