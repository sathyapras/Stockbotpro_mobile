import AsyncStorage from "@react-native-async-storage/async-storage";
import { type StockPickItem } from "./stockpickService";
import { type SmartMoneyItem } from "./smartMoneyService";
import { type RadarMarket } from "./radarMarketService";

// ─── Types ────────────────────────────────────────────────────

export type NotifCategory =
  | "BOW_BUY"     // Sinyal BOW Grade A/B baru
  | "BOS_BUY"     // Sinyal BOS baru
  | "ACCUMULATION"// Smart Money — akumulasi diam
  | "FLOW_SURGE"  // Radar NBS positif kuat
  | "MARKET"      // Kondisi pasar
  | "ALERT"       // Warning / perhatian

export interface AppNotification {
  id: string;
  category: NotifCategory;
  title: string;
  body: string;
  ticker?: string;
  grade?: string;
  score?: number;
  color: string;
  icon: string;
  timestamp: number;    // epoch ms
  read: boolean;
}

// ─── Storage keys ─────────────────────────────────────────────

const STORAGE_KEY = "sbp_notifications_v2";
const READ_KEY    = "sbp_notif_read_ids_v2";

// ─── Category config ──────────────────────────────────────────

export const NOTIF_CATEGORY: Record<NotifCategory, { label: string; color: string; icon: string }> = {
  BOW_BUY:     { label: "Sinyal BOW",      color: "#34d399", icon: "🎯" },
  BOS_BUY:     { label: "Sinyal BOS",      color: "#60a5fa", icon: "📈" },
  ACCUMULATION:{ label: "Smart Money",     color: "#a78bfa", icon: "💎" },
  FLOW_SURGE:  { label: "Flow Surge",      color: "#fbbf24", icon: "⚡" },
  MARKET:      { label: "Update Pasar",    color: "#38BDF8", icon: "🌐" },
  ALERT:       { label: "Perhatian",       color: "#f87171", icon: "⚠️" },
};

// ─── Generator ────────────────────────────────────────────────

function makeId(prefix: string, ticker: string, date: string): string {
  return `${prefix}_${ticker}_${date}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateNotifications(
  bow: StockPickItem[],
  bos: StockPickItem[],
  smartMoney: SmartMoneyItem[],
  radar: RadarMarket[],
): AppNotification[] {
  const now = Date.now();
  const today = todayStr();
  const notifs: AppNotification[] = [];

  // ── BOW Grade A/B BUY signals ──
  bow
    .filter(s => s.status === "BUY" && (s.grade === "A" || s.grade === "B"))
    .slice(0, 10)
    .forEach(s => {
      const id = makeId("bow", s.ticker, s.date ?? today);
      const gradeColor = s.grade === "A" ? "#34d399" : "#6ee7b7";
      notifs.push({
        id, category: "BOW_BUY",
        title: `🎯 BOW Grade ${s.grade} — ${s.ticker}`,
        body: `Entry ${s.entry?.toLocaleString("id-ID") ?? "–"} · Target ${s.tp1?.toLocaleString("id-ID") ?? "–"} · Score ${s.score ?? 0}`,
        ticker: s.ticker, grade: s.grade, score: s.score ?? 0,
        color: gradeColor, icon: "🎯",
        timestamp: now, read: false,
      });
    });

  // ── BOS BUY signals (Grade A only) ──
  bos
    .filter(s => s.status === "BUY")
    .slice(0, 8)
    .forEach(s => {
      const id = makeId("bos", s.ticker, s.date ?? today);
      notifs.push({
        id, category: "BOS_BUY",
        title: `📈 BOS Breakout — ${s.ticker}`,
        body: `Entry ${s.entry?.toLocaleString("id-ID") ?? "–"} · Target ${s.tp1?.toLocaleString("id-ID") ?? "–"} · R/R ${s.rr?.toFixed(1) ?? "–"}`,
        ticker: s.ticker,
        color: "#60a5fa", icon: "📈",
        timestamp: now - 60_000, read: false,
      });
    });

  // ── Smart Money — IGNITION phase (strongest accumulation) ──
  smartMoney
    .filter(s => s.phase === "IGNITION" && s.flowScore >= 60)
    .slice(0, 6)
    .forEach(s => {
      const id = makeId("sm_ign", s.ticker, s.date ?? today);
      notifs.push({
        id, category: "ACCUMULATION",
        title: `💎 Akumulasi Diam — ${s.ticker}`,
        body: `Flow Score ${s.flowScore} · Avg 3D +${s.avg3d?.toFixed(1) ?? "0"}B · ${s.accDays ?? 0}h akumulasi`,
        ticker: s.ticker, score: s.flowScore,
        color: "#a78bfa", icon: "💎",
        timestamp: now - 120_000, read: false,
      });
    });

  // ── Flow Surge — Radar NBS1D strong positive ──
  radar
    .filter(r =>
      r.ticker !== "COMPOSITE" &&
      !r.ticker.startsWith("IDX") &&
      r.nbs1d > 100 &&
      r.flowState !== "DISTRIBUTION"
    )
    .sort((a, b) => b.nbs1d - a.nbs1d)
    .slice(0, 5)
    .forEach(r => {
      const id = makeId("flow", r.ticker, today);
      notifs.push({
        id, category: "FLOW_SURGE",
        title: `⚡ Net Buy Surge — ${r.ticker}`,
        body: `NBS 1D +${r.nbs1d.toFixed(0)}B · NBS 5D ${r.nbs5d >= 0 ? "+" : ""}${r.nbs5d.toFixed(0)}B · ${r.phase}`,
        ticker: r.ticker,
        color: "#fbbf24", icon: "⚡",
        timestamp: now - 180_000, read: false,
      });
    });

  // Sort by score/grade priority then timestamp
  notifs.sort((a, b) => {
    const priority: Record<NotifCategory, number> = {
      BOW_BUY: 1, ACCUMULATION: 2, BOS_BUY: 3,
      FLOW_SURGE: 4, MARKET: 5, ALERT: 6,
    };
    const pa = priority[a.category] ?? 9;
    const pb = priority[b.category] ?? 9;
    if (pa !== pb) return pa - pb;
    return (b.score ?? 0) - (a.score ?? 0);
  });

  return notifs;
}

// ─── Persistence ──────────────────────────────────────────────

export async function loadReadIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export async function saveReadIds(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {}
}

export async function markAllRead(ids: string[]): Promise<void> {
  const existing = await loadReadIds();
  ids.forEach(id => existing.add(id));
  await saveReadIds(existing);
}

export function applyReadStatus(
  notifs: AppNotification[],
  readIds: Set<string>
): AppNotification[] {
  return notifs.map(n => ({ ...n, read: readIds.has(n.id) }));
}

// ─── Time label ───────────────────────────────────────────────

export function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}
