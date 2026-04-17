import { Platform } from "react-native";

import { API_BASE } from "../config/api";

function apiBase(): string {
  return API_BASE;
}

export interface AppSettings {
  telegramInviteLink: string;
  whatsappNumber: string;
  trialDays: number;
  showMarketRisk: boolean;
  emitenNews: boolean;
  autoSlide: boolean;
  mitraResmiList: Array<{
    id: string;
    name: string;
    salesCode: string;
    registerUrl: string;
  }>;
  lq45List: string[];
  idx30List: string[];
  kompas100List: string[];
  jii30List: string[];
  bowBosApprovedList: string[];
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch(`${apiBase()}/settings`);
  if (!res.ok) throw new Error("Gagal memuat pengaturan");
  return res.json();
}

export function whatsappUrl(number: string): string {
  const clean = number.replace(/\D/g, "");
  const e164 = clean.startsWith("0") ? `62${clean.slice(1)}` : clean;
  return `https://wa.me/${e164}`;
}
