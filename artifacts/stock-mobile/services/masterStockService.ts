import { Platform } from "react-native";
import { type Stock } from "./stockData";

// ─── Proxy URL helper ─────────────────────────────────────────

function proxyUrl(name: string): string {
  if (Platform.OS === "web") {
    const { PROXY_BASE } = require("../config/api");
    return `${PROXY_BASE}/${name}`;
  }
  return `http://103.190.28.248/stockbotprodata/${name}`;
}

// ─── Master Stock type ────────────────────────────────────────

export interface MasterStock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  indexCategory: string;   // "LQ45,KOMPAS100" | "LQ45" | "JII30" | ""
  date: string;
  // OHLCV
  open: number;
  high: number;
  low: number;
  close: number;           // gunakan sebagai harga
  volume: number;
  value: number;           // nilai transaksi dalam Miliar Rp
  changePoint: number;     // perubahan harga dalam Rp
  changePercent: number;   // perubahan dalam %
  vol50dPct: number;       // volume hari ini vs avg 50d (%)
  // Fundamental
  marketCap: number;       // dalam Miliar Rp
  beta: number;
  per: number;             // P/E Ratio
  pbv: number;             // P/B Value
  peg: number;
  eps: number;
  roe: number;             // %
  dyPct: number;           // Dividend Yield %
  // Technical levels
  support: number;
  resistance: number;
  vwap: number;
  high52w: number;
  low52w: number;
  // Returns
  ytdReturn: number;       // %
  return10d: number;       // %
  return30d: number;       // %
}

// ─── Breadth result ───────────────────────────────────────────

export interface MarketBreadth {
  advancers: number;
  decliners: number;
  unchanged: number;
  total: number;
  totalValueT: string;    // nilai total transaksi dalam Triliun ("8.75T")
  advancerPct: number;
  declinerPct: number;
  unchangedPct: number;
}

// ─── Filter / Sort types ──────────────────────────────────────

export interface StockFilter {
  search?: string;
  index?: "" | "LQ45" | "KOMPAS100" | "JII30";
  sector?: string;
  onlyUp?: boolean;
  volumeSpike?: boolean;
}

export type SortKey =
  | "change_desc"
  | "change_asc"
  | "volume_desc"
  | "value_desc"
  | "cap_desc"
  | "ret10d"
  | "alpha";

// ─── Numeric parser ───────────────────────────────────────────

function n(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/[%%,\s]/g, "")) || 0;
}

// ─── Raw response parser (handles both camelCase + AFL PascalCase) ────

function parseMasterStock(raw: any): MasterStock[] {
  const arr = Array.isArray(raw) ? raw : (raw?.data ?? []);
  return arr
    .filter((r: any) => r && (r.symbol || r.Ticker || r.ticker))
    .map((r: any): MasterStock => ({
      symbol:        r.symbol        ?? r.Ticker     ?? r.ticker     ?? "",
      name:          r.name          ?? r.Name       ?? r.CompName   ?? r.symbol ?? r.Ticker ?? "",
      sector:        (r.sector && r.sector !== "undefined" && r.sector !== "null" ? r.sector : null) ?? (r.Sector && r.Sector !== "undefined" ? r.Sector : null) ?? "",
      industry:      r.industry      ?? r.Industry   ?? "",
      indexCategory: r.indexCategory ?? r.IndexCat   ?? r.IndexCategory ?? r.Index ?? "",
      date:          r.date          ?? r.Date       ?? "",
      open:          n(r.open        ?? r.Open),
      high:          n(r.high        ?? r.High),
      low:           n(r.low         ?? r.Low),
      close:         n(r.close       ?? r.Close),
      volume:        n(r.volume      ?? r.Volume     ?? r.Vol),
      value:         n(r.value       ?? r.Val_B      ?? r.ValueBn   ?? r.Value),
      changePoint:   n(r.changePoint ?? r.ChgPt      ?? r.ChangePoint ?? r.Change),
      changePercent: n(r.changePercent ?? r.Chg_Pct  ?? r.ChgPct   ?? r.ChangePercent),
      vol50dPct:     n(r.vol50dPct   ?? r.Vol50d_Pct ?? r.VolAvg50_Pct ?? r.Vol50dPct),
      marketCap:     n(r.marketCap   ?? r.MarketCap  ?? r.MktCap),
      beta:          n(r.beta        ?? r.Beta),
      per:           n(r.per         ?? r.PER        ?? r.PE),
      pbv:           n(r.pbv         ?? r.PBV        ?? r.PB),
      peg:           n(r.peg         ?? r.PEG),
      eps:           n(r.eps         ?? r.EPS),
      roe:           n(r.roe         ?? r.ROE),
      dyPct:         n(r.dyPct       ?? r.DY         ?? r.DividendYield ?? 0),
      support:       n(r.support     ?? r.Support),
      resistance:    n(r.resistance  ?? r.Resistance),
      vwap:          n(r.vwap        ?? r.VWAP),
      high52w:       n(r.high52w     ?? r.High52W    ?? r.High52w),
      low52w:        n(r.low52w      ?? r.Low52W     ?? r.Low52w),
      ytdReturn:     n(r.ytdReturn   ?? r.YTD        ?? r.YtdReturn),
      return10d:     n(r.return10d   ?? r.Ret10d     ?? r.Return10d),
      return30d:     n(r.return30d   ?? r.Ret30d     ?? r.Return30d),
    }));
}

// ─── In-memory cache ──────────────────────────────────────────

let _cache: MasterStock[] | null = null;
let _cacheTime = 0;
const TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchMasterStock(): Promise<MasterStock[]> {
  if (_cache && Date.now() - _cacheTime < TTL_MS) return _cache;
  const url = proxyUrl("MASTER_STOCK_DB");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MASTER_STOCK_DB fetch failed: ${res.status}`);
  const raw = await res.json();
  const stocks = parseMasterStock(raw);
  _cache = stocks;
  _cacheTime = Date.now();
  return stocks;
}

// Lookup single stock (uses cache if available)
export async function fetchMasterStockBySymbol(symbol: string): Promise<MasterStock | null> {
  const stocks = await fetchMasterStock();
  return stocks.find(s => s.symbol === symbol.toUpperCase()) ?? null;
}

// ─── Market breadth ───────────────────────────────────────────

export function calcBreadth(stocks: MasterStock[]): MarketBreadth {
  let adv = 0, dec = 0, unch = 0, totalValue = 0;
  for (const s of stocks) {
    const chg = s.changePercent;
    if (chg > 0.05) adv++;
    else if (chg < -0.05) dec++;
    else unch++;
    totalValue += s.value; // in Billion Rp
  }
  const total = adv + dec + unch || 1;
  return {
    advancers: adv, decliners: dec, unchanged: unch, total,
    totalValueT: (totalValue / 1000).toFixed(2),  // Bn → T (Trillion)
    advancerPct: Math.round((adv / total) * 100),
    declinerPct: Math.round((dec / total) * 100),
    unchangedPct: Math.round((unch / total) * 100),
  };
}

// ─── Top gainers / losers ─────────────────────────────────────

export function getTopGainersList(stocks: MasterStock[], n = 10): MasterStock[] {
  return [...stocks]
    .filter(s => s.changePercent > 0 && s.close > 0 && s.volume > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, n);
}

export function getTopLosersList(stocks: MasterStock[], n = 10): MasterStock[] {
  return [...stocks]
    .filter(s => s.changePercent < 0 && s.close > 0 && s.volume > 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, n);
}

export function getTopVolumeList(stocks: MasterStock[], n = 10): MasterStock[] {
  return [...stocks]
    .filter(s => s.close > 0)
    .sort((a, b) => b.vol50dPct - a.vol50dPct)
    .slice(0, n);
}

// ─── Filter + Sort ────────────────────────────────────────────

export function filterStocks(stocks: MasterStock[], filters: StockFilter): MasterStock[] {
  let r = stocks;
  if (filters.index) {
    const idx = filters.index.toUpperCase();
    r = r.filter(s => (s.indexCategory ?? "").toUpperCase().includes(idx));
  }
  if (filters.sector) {
    const sec = filters.sector.toLowerCase();
    r = r.filter(s => (s.sector ?? "").toLowerCase().includes(sec));
  }
  if (filters.search) {
    const q = filters.search.toUpperCase();
    r = r.filter(s => s.symbol.includes(q) || (s.name ?? "").toUpperCase().includes(q));
  }
  if (filters.onlyUp) r = r.filter(s => s.changePercent > 0);
  if (filters.volumeSpike) r = r.filter(s => s.vol50dPct >= 200);
  return r;
}

export function sortStocks(stocks: MasterStock[], by: SortKey): MasterStock[] {
  const s = [...stocks];
  switch (by) {
    case "change_desc": return s.sort((a, b) => b.changePercent - a.changePercent);
    case "change_asc":  return s.sort((a, b) => a.changePercent - b.changePercent);
    case "volume_desc": return s.sort((a, b) => b.volume - a.volume);
    case "value_desc":  return s.sort((a, b) => b.value - a.value);
    case "cap_desc":    return s.sort((a, b) => b.marketCap - a.marketCap);
    case "ret10d":      return s.sort((a, b) => b.return10d - a.return10d);
    case "alpha":       return s.sort((a, b) => a.symbol.localeCompare(b.symbol));
    default:            return s;
  }
}

// ─── Stock map for O(1) lookup ────────────────────────────────

export function buildStockMap(stocks: MasterStock[]): Map<string, MasterStock> {
  return new Map(stocks.map(s => [s.symbol, s]));
}

// ─── Index badge helper ───────────────────────────────────────

export function getIndexBadges(indexCategory: string): { label: string; color: string }[] {
  const cat = (indexCategory ?? "").toUpperCase();
  const badges: { label: string; color: string }[] = [];
  if (cat.includes("LQ45"))    badges.push({ label: "LQ45", color: "#60a5fa" });
  if (cat.includes("KOMPAS"))  badges.push({ label: "K100", color: "#a78bfa" });
  if (cat.includes("JII"))     badges.push({ label: "JII",  color: "#34d399" });
  return badges;
}

// ─── Format helpers ───────────────────────────────────────────

export function fmtMktCap(bn: number): string {
  if (bn >= 1000) return `${(bn / 1000).toFixed(1)}T`;
  if (bn >= 1)    return `${bn.toFixed(0)}B`;
  return "–";
}

export function fmtValueBn(bn: number): string {
  if (bn >= 1000) return `${(bn / 1000).toFixed(2)}T`;
  if (bn >= 1)    return `${bn.toFixed(1)}B`;
  return "–";
}

// ─── Adapter: MasterStock → legacy Stock (for StockRow) ───────

export function masterToStock(ms: MasterStock): Stock {
  return {
    code: ms.symbol,
    name: ms.name || ms.symbol,
    sector: ms.sector,
    price: ms.close,
    open: ms.open,
    high: ms.high,
    low: ms.low,
    volume: ms.volume,
    change: ms.changePercent,
    changeValue: ms.changePoint,
  };
}

// ─── Unique sectors list ──────────────────────────────────────

export function getUniqueSectors(stocks: MasterStock[]): string[] {
  const set = new Set(stocks.map(s => s.sector).filter(Boolean));
  return ["", ...Array.from(set).sort()];
}
