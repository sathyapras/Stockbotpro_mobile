import { Platform } from "react-native";

// ─── API base URL ─────────────────────────────────────────────

function apiBaseUrl(): string {
  const d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
  if (d) return `https://${d}/api`;
  return "http://localhost:8080/api";
}

// ─── Types ────────────────────────────────────────────────────

export type SmartMoneyPhase =
  | "IGNITION"
  | "EARLY_ACC"
  | "STRONG_TREND"
  | "EXHAUSTION"
  | "DISTRIBUTION"
  | "CHURNING";

export interface SmartMoneyItem {
  ticker: string;
  name: string;
  sector: string;
  indexCategory: string;
  date: string;
  phase: SmartMoneyPhase;
  flowScore: number;
  avg3d: number;
  avg5d: number;
  mom3d: number;
  brokerNet: number;
  dominance: number;
  dominanceLabel: string;
  fuel: number;
  accDays: number;
  distDays: number;
  sparkline: number[];
  flowTrend: "up" | "down" | "flat";
  deltaNetVal: number;
  top1Label: string;
  top3Label: string;
  top5Label: string;
  latestAccDist: number;
  latestAvgPrice: number;
}

export interface SmartMoneyResponse {
  data: SmartMoneyItem[];
  total: number;
}

// ─── Phase config ─────────────────────────────────────────────

export const PHASE_CONFIG: Record<SmartMoneyPhase, {
  label: string; display: string; desc: string;
  color: string; bg: string; badge: string;
  badgeColor: string; priority: number; icon: string;
}> = {
  IGNITION: {
    label: "IGNITION", display: "Akumulasi Diam",
    desc: "Bandar beli saat retail jual — setup terbaik",
    color: "#10b981", bg: "#052e16", badge: "ACC",
    badgeColor: "#10b981", priority: 1, icon: "🔥",
  },
  EARLY_ACC: {
    label: "EARLY_ACC", display: "Akumulasi Awal",
    desc: "Akumulasi mulai meluas — konfirmasi mulai ada",
    color: "#34d399", bg: "#0a1f15", badge: "ACC",
    badgeColor: "#34d399", priority: 2, icon: "🌱",
  },
  STRONG_TREND: {
    label: "STRONG_TREND", display: "Trend Kuat",
    desc: "Broker dan momentum selaras — uptrend aktif",
    color: "#60a5fa", bg: "#0c1629", badge: "TREND",
    badgeColor: "#60a5fa", priority: 3, icon: "📈",
  },
  EXHAUSTION: {
    label: "EXHAUSTION", display: "Mulai Jenuh",
    desc: "Momentum melambat — waspadai pembalikan",
    color: "#f97316", bg: "#1c0e05", badge: "LATE",
    badgeColor: "#f97316", priority: 4, icon: "⚠️",
  },
  DISTRIBUTION: {
    label: "DISTRIBUTION", display: "Distribusi",
    desc: "Bandar jual ke retail — hindari masuk",
    color: "#f87171", bg: "#2d0a0a", badge: "DIST",
    badgeColor: "#f87171", priority: 5, icon: "🔴",
  },
  CHURNING: {
    label: "CHURNING", display: "Sideways",
    desc: "Tidak ada sinyal jelas — tunggu konfirmasi",
    color: "#64748b", bg: "#1e2433", badge: "NEU",
    badgeColor: "#64748b", priority: 6, icon: "⬜",
  },
};

// ─── Fetch ────────────────────────────────────────────────────

export async function fetchSmartMoneyFlow(): Promise<SmartMoneyResponse> {
  const res = await fetch(`${apiBaseUrl()}/broker-summary/smart-money`);
  if (!res.ok) throw new Error(`Smart Money fetch failed: ${res.status}`);
  return res.json();
}
