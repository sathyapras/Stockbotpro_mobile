export interface BrokerFlowAggregate {
  date: string | null;
  total: number;
  totalNetBn: number;
  netStr: string;
  netDir: "INFLOW" | "OUTFLOW";
  accCount: number;
  distCount: number;
  unknownCount: number;
  accPct: number;
  distPct: number;
  inflowCount: number;
  outflowCount: number;
  totalBuyBrokers: number;
  totalSellBrokers: number;
  brokerBuyDominance: number;
}

import { API_BASE } from "../config/api";

function getApiBase(): string {
  return API_BASE;
}

export async function fetchBrokerFlowAggregate(): Promise<BrokerFlowAggregate> {
  const res = await fetch(`${getApiBase()}/broker-summary/market-aggregate`);
  if (!res.ok) throw new Error(`Broker aggregate error: ${res.status}`);
  return res.json() as Promise<BrokerFlowAggregate>;
}
