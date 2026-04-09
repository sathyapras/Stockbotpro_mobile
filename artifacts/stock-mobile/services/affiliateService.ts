import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ─── Token management ─────────────────────────────────────────

const TOKEN_KEY = "sbp_auth_token";

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function saveAuthToken(token: string): Promise<void> {
  return AsyncStorage.setItem(TOKEN_KEY, token.trim());
}
export async function clearAuthToken(): Promise<void> {
  return AsyncStorage.removeItem(TOKEN_KEY);
}

// ─── API base URL ─────────────────────────────────────────────

function apiBase(): string {
  if (Platform.OS === "web") {
    const d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
    return `https://${d}/api`;
  }
  return "http://localhost:8080/api";
}

async function fetchAuth(path: string, opts?: RequestInit): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts?.headers as Record<string, string> ?? {}),
  };
  return fetch(`${apiBase()}${path}`, { ...opts, headers });
}

// ─── Types ────────────────────────────────────────────────────

export interface AffiliateProfile {
  id: number;
  userId: number;
  code: string;
  status: "pending" | "active";
  commissionType: string;
  commissionRate: number;
  discountPct: number;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  totalEarned: string;
  totalPaid: string;
}

export interface AffiliateReferral {
  id: number;
  commissionEarned: string;
  commissionType: string;
  planName: string;
  months: number;
  createdAt: string;
}

export interface AffiliatePayout {
  id: number;
  amount: string;
  status: string;
  bankName: string;
  bankAccount: string;
  createdAt: string;
}

export interface AffiliateQuality {
  totalUniqueUsers: number;
  activeUsers: number;
  churnedUsers: number;
  retentionRate: number;
  tierProgress: number;
  tierThreshold: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

export interface AffiliateMe {
  hasProfile: boolean;
  profile?: AffiliateProfile;
  referrals?: AffiliateReferral[];
  payouts?: AffiliatePayout[];
  totalReferrals?: number;
  quality?: AffiliateQuality;
}

// ─── API calls ────────────────────────────────────────────────

export async function fetchAffiliateMe(): Promise<AffiliateMe> {
  const res = await fetchAuth("/affiliate/me");
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("Gagal memuat data afiliasi");
  return res.json();
}

export async function applyAffiliate(params: {
  marketReach: string;
  preferredCode?: string;
}): Promise<{ message: string; code: string }> {
  const res = await fetchAuth("/affiliate/apply", {
    method: "POST",
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Gagal mendaftar");
  return json;
}

export async function requestPayout(params: {
  amount: number;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
}): Promise<{ message: string }> {
  const res = await fetchAuth("/affiliate/payout-request", {
    method: "POST",
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Gagal request payout");
  return json;
}
