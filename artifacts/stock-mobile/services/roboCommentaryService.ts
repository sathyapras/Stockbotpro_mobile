import { Platform } from "react-native";

export interface RoboCommentaryItem {
  Ticker: string;
  Date: string;
  Commentary: string;
}

export type RoboCommentaryMap = Record<string, RoboCommentaryItem>;

import { PROXY_BASE } from "../config/api";

function roboCommentaryUrl(): string {
  return `${PROXY_BASE}/RoboCommentary`;
}

export async function fetchRoboCommentary(): Promise<RoboCommentaryMap> {
  const res = await fetch(roboCommentaryUrl());
  if (!res.ok) throw new Error(`RoboCommentary fetch failed: ${res.status}`);
  const arr: RoboCommentaryItem[] = await res.json();
  const map: RoboCommentaryMap = {};
  for (const item of arr) {
    if (item.Ticker) map[item.Ticker.toUpperCase()] = item;
  }
  return map;
}

export function getCommentaryText(map: RoboCommentaryMap, ticker: string): string {
  const item = map[ticker?.toUpperCase()];
  if (!item?.Commentary) return "";
  return item.Commentary.replace(/%%/g, "%").trim();
}
