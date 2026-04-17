import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "sbp_auth_token";

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function clearAuthToken(): Promise<void> {
  return AsyncStorage.removeItem(TOKEN_KEY);
}

import { API_BASE } from "../config/api";

function apiBase(): string {
  return API_BASE;
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

export async function loginUser(identifier: string, password: string): Promise<string> {
  const res  = await fetch(`${apiBase()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Login gagal.");
  return json.token as string;
}

export async function registerUser(data: {
  name: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<string> {
  const res  = await fetch(`${apiBase()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, agreedToDisclaimer: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Gagal mendaftar.");
  return json.token as string;
}

export async function saveAuthToken(token: string): Promise<void> {
  return AsyncStorage.setItem(TOKEN_KEY, token.trim());
}
