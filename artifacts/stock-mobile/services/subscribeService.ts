import { Platform } from "react-native";
import { getAuthToken } from "./affiliateService";

// ─── API base URL ─────────────────────────────────────────────

export function apiBase(): string {
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

export interface Plan {
  id: number;
  planName: string;
  monthlyPrice: number;
  description: string;
}

export interface SnapResult {
  snapToken: string;
  clientKey: string;
  isProduction: boolean;
  orderId: string;
  amount: number;
}

// ─── API calls ────────────────────────────────────────────────

export async function fetchPlans(): Promise<Plan[]> {
  const res = await fetch(`${apiBase()}/affiliate/plans`);
  if (!res.ok) throw new Error("Gagal memuat daftar paket");
  const json = await res.json();
  return json.plans ?? [];
}

export async function fetchPrice(packagePlan: string, months: number): Promise<number> {
  const res = await fetch(
    `${apiBase()}/payments/midtrans/price?packagePlan=${packagePlan}&months=${months}`
  );
  if (!res.ok) throw new Error("Gagal menghitung harga");
  const json = await res.json();
  return json.amount as number;
}

export async function createSnapTransaction(
  packagePlan: string,
  months: number
): Promise<SnapResult> {
  const res = await fetchAuth("/payments/midtrans/snap", {
    method: "POST",
    body: JSON.stringify({ packagePlan, months }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Gagal membuat transaksi");
  return json as SnapResult;
}

export async function checkPaymentStatus(orderId: string) {
  const res = await fetchAuth(`/payments/midtrans/status/${orderId}`);
  if (!res.ok) throw new Error("Gagal mengecek status");
  return res.json();
}
