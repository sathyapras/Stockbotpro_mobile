import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "sbp_auth_token";

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function clearAuthToken(): Promise<void> {
  return AsyncStorage.removeItem(TOKEN_KEY);
}

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

export interface UserProfile {
  id: number;
  username: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  subscriptionPlan: "free" | "pro" | "elite" | "enterprise";
  planExpiresAt: string | null;
  emailVerified: boolean;
  trialDaysRemaining: number;
  isTrialActive: boolean;
  hasPremiumAccess: boolean;
  createdAt: string;
}

// ─── API calls ────────────────────────────────────────────────

export async function fetchMe(): Promise<UserProfile> {
  const res = await fetchAuth("/auth/me");
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("Gagal memuat profil.");
  return res.json();
}

export async function patchProfile(data: {
  name: string;
  phone?: string;
}): Promise<UserProfile> {
  const res = await fetchAuth("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan profil.");
  return json;
}

export async function forgotPassword(email: string): Promise<void> {
  await fetch(`${apiBase()}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email }),
  });
}
