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
    ? `meskipun IHSG ${ihsgPct >= 0 ? "masih bertahan" : "tertekan"} ${ihsgPct >= 0 ? "+" : ""}${ihsgPct?.toFixed(2)}%`
    : "";
  const fearZone =
    s.fearLabel === "EXTREME_FEAR" ? "Extreme Fear" :
    s.fearLabel === "FEAR"         ? "Fear" :
    s.fearLabel === "GREED"        ? "Greed" :
    s.fearLabel === "EXTREME_GREED" ? "Extreme Greed" : "Neutral";

  paragraphs.push(
    `VIX ${s.vix?.toFixed(1) ?? "—"} berada di zona ${fearZone} — sentimen global ${s.fearLabel.includes("FEAR") ? "defensif" : "risk-on"}` +
    (ihsgStr ? `, ${ihsgStr}.` : ".")
  );

  // 2. USD/IDR + DXY
  const rupiahStr =
    (s.usdIdr ?? 0) >= 16_500 ? "melemah" :
    (s.usdIdr ?? 0) >= 16_000 ? "stabil" : "menguat";
  const dxyDir = s.dxyBias.includes("WEAK") ? "melemah" :
                 s.dxyBias.includes("STRONG") ? "menguat" : "stabil";
  const emImpact = s.dxyBias.includes("WEAK")
    ? "menjadi tailwind bagi pasar EM termasuk IDX"
    : "memberikan tekanan pada arus modal EM";

  paragraphs.push(
    `Di sisi nilai tukar, Rupiah ${rupiahStr} ke ${s.usdIdr?.toLocaleString("id-ID") ?? "—"} — ` +
    `memberikan tekanan pada emiten berutang valas seperti GOTO, TLKM, dan ISAT; ` +
    `DXY ${s.dxyValue?.toFixed(1) ?? "—"} ${dxyDir}, ${emImpact}.`
  );

  // 3. Minyak
  if (wti?.value) {
    const oilDir =
      (wti.changePct ?? 0) < -5 ? "melemah signifikan" :
      (wti.changePct ?? 0) < 0  ? "melemah" : "menguat";
    const oilPct = wti.changePct != null
      ? ` (${wti.changePct >= 0 ? "+" : ""}${wti.changePct?.toFixed(1)}%)`
      : "";
    const brentStr = brent?.value ? ` (Brent $${brent.value?.toFixed(1)})` : "";
    const oilImpact = (wti.changePct ?? 0) < 0
      ? "memberikan tekanan pada saham energi (MEDC, ELSA), namun positif untuk sektor transportasi dan manufaktur yang margin-nya terbantu biaya bahan bakar lebih rendah"
      : "menguntungkan saham energi dan tambang (MEDC, ELSA, ADRO), namun menekan margin sektor transportasi dan manufaktur";

    paragraphs.push(
      `Harga minyak ${oilDir} — WTI $${wti.value?.toFixed(1)}${oilPct}${brentStr} ${oilImpact}.`
    );
  }

  // 4. Kesimpulan
  const conclusion =
    s.fearLabel.includes("FEAR") || s.globalBias === "RISK_OFF"
      ? "Secara keseluruhan, kondisi masih menantang — selektif pada saham dengan fundamental kuat, valuasi wajar, dan struktur teknikal yang bersih."
      : s.fearLabel === "NEUTRAL" || s.globalBias === "MIXED"
      ? "Secara keseluruhan, pasar dalam kondisi campuran — pertahankan posisi yang sudah untung, hindari FOMO pada saham spekulatif."
      : "Secara keseluruhan, sentimen mendukung — fokus pada momentum kuat di sektor perbankan, konsumer, dan teknologi.";

  paragraphs.push(conclusion);
  return paragraphs.join("\n\n");
}

// ─── Fear label display helpers ────────────────────────────────

export function fearLabelDisplay(label: string): { text: string; color: string; bg: string; icon: string } {
  switch (label) {
    case "EXTREME_FEAR": return { text: "Extreme Fear",  color: "#ef4444", bg: "#2d0a0a", icon: "😱" };
    case "FEAR":         return { text: "Fear",          color: "#f87171", bg: "#2d1010", icon: "😨" };
    case "NEUTRAL":      return { text: "Neutral",       color: "#fbbf24", bg: "#1c1500", icon: "😐" };
    case "GREED":        return { text: "Greed",         color: "#34d399", bg: "#052e16", icon: "😊" };
    case "EXTREME_GREED":return { text: "Extreme Greed", color: "#10b981", bg: "#042016", icon: "🤑" };
    default:             return { text: "Neutral",       color: "#94a3b8", bg: "#1e2433", icon: "😐" };
  }
}
