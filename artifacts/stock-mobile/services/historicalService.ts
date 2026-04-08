import { Platform } from "react-native";

// ─── Types ─────────────────────────────────────────────────────

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PeriodKey = "1mo" | "3mo" | "6mo" | "1y";

export const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: "1mo", label: "1B",  days: 30  },
  { key: "3mo", label: "3B",  days: 90  },
  { key: "6mo", label: "6B",  days: 180 },
  { key: "1y",  label: "1T",  days: 365 },
];

// ─── API URL ───────────────────────────────────────────────────

function apiBaseUrl(): string {
  if (Platform.OS === "web") {
    const d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
    return `https://${d}/api`;
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost";
  return `https://${domain}/api`;
}

// ─── Fetch (all data, filter client-side) ──────────────────────

export async function fetchHistorical(symbol: string): Promise<Candle[]> {
  const url = `${apiBaseUrl()}/historical/${encodeURIComponent(symbol)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data as Candle[];
}

// ─── Filter by period ──────────────────────────────────────────

export function filterByPeriod(candles: Candle[], days: number): Candle[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return candles.filter(c => new Date(c.date) >= cutoff);
}

// ─── Format short date label ───────────────────────────────────

export function shortDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
