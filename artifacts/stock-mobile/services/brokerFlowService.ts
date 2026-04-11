import { getApiBaseUrl } from "./stockData";

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

export async function fetchBrokerFlowAggregate(): Promise<BrokerFlowAggregate> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/broker-summary/market-aggregate`);
  if (!res.ok) throw new Error(`Broker aggregate error: ${res.status}`);
  return res.json() as Promise<BrokerFlowAggregate>;
}
