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
  { key: "1mo", label: "1 Bln",  days: 30  },
  { key: "3mo", label: "3 Bln",  days: 90  },
  { key: "6mo", label: "6 Bln",  days: 180 },
  { key: "1y",  label: "1 Thn",  days: 365 },
];

// ─── API URL ───────────────────────────────────────────────────

import { API_BASE } from "../config/api";

function apiBaseUrl(): string {
  return API_BASE;
}

// ─── Fetch (all data, filter client-side) ──────────────────────

export async function fetchHistorical(symbol: string): Promise<Candle[]> {
  const url = `${apiBaseUrl()}/historical/${encodeURIComponent(symbol)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  // API returns numeric fields as strings — parse them
  return (data as any[]).map(r => ({
    date:   r.date,
    open:   parseFloat(r.open),
    high:   parseFloat(r.high),
    low:    parseFloat(r.low),
    close:  parseFloat(r.close),
    volume: parseFloat(r.volume),
  })) as Candle[];
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
