import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

const BASE_URL = "https://stockbotpro.replit.app/api";

// ─── Types ────────────────────────────────────────────────────

export type SignalType  = "BOW" | "BOS";
export type TradeStatus = "OPEN" | "CLOSED";

export interface TradingLogEntry {
  id:          number;
  deviceId:    string;
  ticker:      string;
  signalType:  SignalType;
  entryPrice:  string;
  slPrice:     string;
  tp1Price:    string;
  tp2Price:    string;
  entryDate:   string;
  exitPrice:   string | null;
  exitDate:    string | null;
  status:      TradeStatus;
  notes:       string | null;
  createdAt:   string;
}

export interface TradingSummary {
  ok:            boolean;
  totalTrades:   number;
  winRate:       number;
  totalPnl:      number;
  avgHoldDays:   number;
  openPositions: number;
}

// ─── Device ID ────────────────────────────────────────────────

const DEVICE_KEY = "sbp_device_id";

export async function getOrCreateDeviceId(): Promise<string> {
  if (Platform.OS === "web") {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }
  let id = await SecureStore.getItemAsync(DEVICE_KEY);
  if (!id) {
    id = uuidv4();
    await SecureStore.setItemAsync(DEVICE_KEY, id);
  }
  return id;
}

// ─── API Functions ────────────────────────────────────────────

export async function getTrades(deviceId: string): Promise<TradingLogEntry[]> {
  const res = await fetch(`${BASE_URL}/trading-log?device_id=${deviceId}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Gagal mengambil data");
  return json.data;
}

export async function addTrade(deviceId: string, trade: {
  ticker:      string;
  signal_type: SignalType;
  entry_price: number;
  sl_price:    number;
  tp1_price:   number;
  tp2_price:   number;
  entry_date:  string;
  notes?:      string;
}): Promise<TradingLogEntry> {
  const res = await fetch(`${BASE_URL}/trading-log`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ device_id: deviceId, ...trade }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Gagal menambah trade");
  return json.data;
}

export async function closeTrade(deviceId: string, tradeId: number, data: {
  exit_price: number;
  exit_date:  string;
  notes?:     string;
}): Promise<TradingLogEntry> {
  const res = await fetch(
    `${BASE_URL}/trading-log/${tradeId}/close?device_id=${deviceId}`,
    {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    }
  );
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Gagal menutup posisi");
  return json.data;
}

export async function deleteTrade(deviceId: string, tradeId: number): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/trading-log/${tradeId}?device_id=${deviceId}`,
    { method: "DELETE" }
  );
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Gagal menghapus trade");
}

export async function getTradingSummary(deviceId: string): Promise<TradingSummary> {
  const res = await fetch(`${BASE_URL}/trading-log/summary?device_id=${deviceId}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Gagal mengambil summary");
  return json;
}

// ─── Helpers ──────────────────────────────────────────────────

export function calcPnlPct(entryPrice: number, exitPrice: number): number {
  return ((exitPrice - entryPrice) / entryPrice) * 100;
}

export function pnlColor(pnl: number): string {
  return pnl > 0 ? "#22c55e" : pnl < 0 ? "#ef4444" : "#94a3b8";
}

export function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function holdDays(entryDate: string, exitDate: string | null): number {
  const a = new Date(entryDate).getTime();
  const b = exitDate ? new Date(exitDate).getTime() : Date.now();
  return Math.round((b - a) / 86400000);
}
