export interface Stock {
  code: string;
  name: string;
  sector: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changeValue: number;
}

export interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BrokerFlow {
  code: string;
  netBuy: number;
  totalBuy: number;
  totalSell: number;
  topBuyers: { broker: string; value: number }[];
  topSellers: { broker: string; value: number }[];
}

export interface HakaHaki {
  code: string;
  foreignBuy: number;
  foreignSell: number;
  foreignNet: number;
  localBuy: number;
  localSell: number;
  localNet: number;
}

export interface Indicators {
  code: string;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  sma20: number;
  sma50: number;
  sma200: number;
  bollingerUpper: number;
  bollingerLower: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
}

interface StockDef {
  code: string;
  name: string;
  sector: string;
  basePrice: number;
  volatility: number;
}

const STOCK_DEFS: StockDef[] = [
  { code: 'BBCA', name: 'Bank Central Asia', sector: 'Finance', basePrice: 9875, volatility: 0.012 },
  { code: 'BBRI', name: 'Bank Rakyat Indonesia', sector: 'Finance', basePrice: 4250, volatility: 0.014 },
  { code: 'TLKM', name: 'Telekomunikasi Indonesia', sector: 'Telecom', basePrice: 2850, volatility: 0.013 },
  { code: 'ASII', name: 'Astra International', sector: 'Automotive', basePrice: 4900, volatility: 0.015 },
  { code: 'BMRI', name: 'Bank Mandiri', sector: 'Finance', basePrice: 6500, volatility: 0.013 },
  { code: 'UNVR', name: 'Unilever Indonesia', sector: 'Consumer', basePrice: 2300, volatility: 0.011 },
  { code: 'BBNI', name: 'Bank Negara Indonesia', sector: 'Finance', basePrice: 5350, volatility: 0.015 },
  { code: 'ICBP', name: 'Indofood CBP', sector: 'Consumer', basePrice: 10750, volatility: 0.010 },
  { code: 'INDF', name: 'Indofood Sukses Makmur', sector: 'Consumer', basePrice: 6950, volatility: 0.013 },
  { code: 'KLBF', name: 'Kalbe Farma', sector: 'Healthcare', basePrice: 1620, volatility: 0.012 },
  { code: 'ANTM', name: 'Aneka Tambang', sector: 'Mining', basePrice: 1650, volatility: 0.025 },
  { code: 'INCO', name: 'Vale Indonesia', sector: 'Mining', basePrice: 3800, volatility: 0.022 },
  { code: 'PTBA', name: 'Bukit Asam', sector: 'Mining', basePrice: 2900, volatility: 0.020 },
  { code: 'ADRO', name: 'Alamtri Resources Indonesia', sector: 'Mining', basePrice: 3200, volatility: 0.021 },
  { code: 'SMGR', name: 'Semen Indonesia', sector: 'Industrial', basePrice: 3800, volatility: 0.016 },
  { code: 'BSDE', name: 'Bumi Serpong Damai', sector: 'Property', basePrice: 1150, volatility: 0.018 },
  { code: 'PGAS', name: 'Perusahaan Gas Negara', sector: 'Energy', basePrice: 1580, volatility: 0.017 },
  { code: 'MDKA', name: 'Merdeka Copper Gold', sector: 'Mining', basePrice: 3050, volatility: 0.028 },
  { code: 'EMTK', name: 'Elang Mahkota Teknologi', sector: 'Tech', basePrice: 620, volatility: 0.020 },
  { code: 'GOTO', name: 'GoTo Gojek Tokopedia', sector: 'Tech', basePrice: 68, volatility: 0.035 },
];

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strToSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateOHLCVData(code: string, basePrice: number, volatility: number, days: number = 252): OHLCVBar[] {
  const rng = mulberry32(strToSeed(code));
  const drift = 0.0003;

  let price = 1.0;
  const raw: { open: number; high: number; low: number; close: number; volume: number }[] = [];

  for (let i = 0; i < days; i++) {
    const dailyReturn = drift + (rng() - 0.5) * 2 * volatility;
    const open = price;
    const close = price * (1 + dailyReturn);
    const range = Math.abs(close - open);
    const high = Math.max(open, close) + rng() * range * 0.8;
    const low = Math.min(open, close) - rng() * range * 0.8;
    const volume = Math.floor(800000 + rng() * 25000000);
    raw.push({ open, high, low, close, volume });
    price = close;
  }

  const scale = basePrice / price;

  const dates: string[] = [];
  const endDate = new Date();
  const d = new Date(endDate);
  d.setDate(d.getDate() - 1);

  while (dates.length < days) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      dates.unshift(d.toISOString().split('T')[0] ?? '');
    }
    d.setDate(d.getDate() - 1);
  }

  return raw.map((bar, i) => ({
    date: dates[i] ?? '',
    open: Math.round(bar.open * scale),
    high: Math.round(bar.high * scale),
    low: Math.round(bar.low * scale),
    close: Math.round(bar.close * scale),
    volume: bar.volume,
  }));
}

const ohlcvCache = new Map<string, OHLCVBar[]>();

function getCachedOHLCV(code: string): OHLCVBar[] {
  if (!ohlcvCache.has(code)) {
    const def = STOCK_DEFS.find(s => s.code === code);
    if (!def) return [];
    ohlcvCache.set(code, generateOHLCVData(code, def.basePrice, def.volatility));
  }
  return ohlcvCache.get(code) ?? [];
}

let stocksCache: Stock[] | null = null;

export function getAllStocks(): Stock[] {
  if (stocksCache) return stocksCache;

  stocksCache = STOCK_DEFS.map(def => {
    const ohlcv = getCachedOHLCV(def.code);
    if (ohlcv.length < 2) return null;
    const today = ohlcv[ohlcv.length - 1]!;
    const yesterday = ohlcv[ohlcv.length - 2]!;
    const change = ((today.close - yesterday.close) / yesterday.close) * 100;
    return {
      code: def.code,
      name: def.name,
      sector: def.sector,
      price: today.close,
      open: today.open,
      high: today.high,
      low: today.low,
      volume: today.volume,
      change: parseFloat(change.toFixed(2)),
      changeValue: today.close - yesterday.close,
    };
  }).filter(Boolean) as Stock[];

  return stocksCache;
}

export function getStock(code: string): Stock | undefined {
  return getAllStocks().find(s => s.code === code);
}

export function getOHLCV(code: string, period: '1W' | '1M' | '3M' | '6M' | '1Y'): OHLCVBar[] {
  const all = getCachedOHLCV(code);
  const map: Record<string, number> = { '1W': 5, '1M': 22, '3M': 66, '6M': 132, '1Y': 252 };
  return all.slice(-(map[period] ?? 22));
}

function computeEMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] ?? 0;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    ema = (values[i]! * k) + (ema * (1 - k));
  }
  return ema;
}

function computeSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] ?? 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function computeRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  const recent = closes.slice(-period - 1);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < recent.length; i++) {
    const diff = (recent[i] ?? 0) - (recent[i - 1] ?? 0);
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function computeSTD(values: number[], period: number): number {
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  return Math.sqrt(variance);
}

const indicatorsCache = new Map<string, Indicators>();

export function getIndicators(code: string): Indicators {
  if (indicatorsCache.has(code)) return indicatorsCache.get(code)!;

  const ohlcv = getCachedOHLCV(code);
  const closes = ohlcv.map(b => b.close);

  const rsi = computeRSI(closes);
  const ema12 = computeEMA(closes, 12);
  const ema26 = computeEMA(closes, 26);
  const macd = ema12 - ema26;

  const macdValues: number[] = [];
  for (let i = 26; i <= closes.length; i++) {
    const e12 = computeEMA(closes.slice(0, i), 12);
    const e26 = computeEMA(closes.slice(0, i), 26);
    macdValues.push(e12 - e26);
  }
  const macdSignal = computeEMA(macdValues, 9);
  const macdHist = macd - macdSignal;

  const sma20 = computeSMA(closes, 20);
  const sma50 = computeSMA(closes, 50);
  const sma200 = computeSMA(closes, 200);

  const std20 = computeSTD(closes, 20);
  const bollingerUpper = sma20 + 2 * std20;
  const bollingerLower = sma20 - 2 * std20;

  const lastClose = closes[closes.length - 1] ?? 0;
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (rsi < 45 && macd > macdSignal && lastClose > sma20) signal = 'BUY';
  else if (rsi > 60 && macd < macdSignal && lastClose < sma20) signal = 'SELL';

  const result: Indicators = {
    code,
    rsi: parseFloat(rsi.toFixed(2)),
    macd: parseFloat(macd.toFixed(2)),
    macdSignal: parseFloat(macdSignal.toFixed(2)),
    macdHist: parseFloat(macdHist.toFixed(2)),
    sma20: Math.round(sma20),
    sma50: Math.round(sma50),
    sma200: Math.round(sma200),
    bollingerUpper: Math.round(bollingerUpper),
    bollingerLower: Math.round(bollingerLower),
    signal,
  };

  indicatorsCache.set(code, result);
  return result;
}

const BROKER_CODES = ['BK', 'DH', 'YU', 'ML', 'AI', 'ZP', 'GW', 'RX', 'LS', 'XA', 'DR', 'CC'];

export function getBrokerFlow(code: string): BrokerFlow {
  const rng = mulberry32(strToSeed(code + '_broker'));
  const stock = getStock(code);
  const baseValue = ((stock?.volume ?? 5000000) * (stock?.price ?? 1000)) / 1_000_000;

  const totalBuy = baseValue * (0.35 + rng() * 0.3);
  const totalSell = baseValue * (0.35 + rng() * 0.3);

  const shuffled = [...BROKER_CODES].sort(() => rng() - 0.5);

  const topBuyers = shuffled.slice(0, 3).map(broker => ({
    broker,
    value: parseFloat((totalBuy * (0.15 + rng() * 0.25)).toFixed(1)),
  })).sort((a, b) => b.value - a.value);

  const topSellers = shuffled.slice(3, 6).map(broker => ({
    broker,
    value: parseFloat((totalSell * (0.15 + rng() * 0.25)).toFixed(1)),
  })).sort((a, b) => b.value - a.value);

  return {
    code,
    netBuy: parseFloat((totalBuy - totalSell).toFixed(1)),
    totalBuy: parseFloat(totalBuy.toFixed(1)),
    totalSell: parseFloat(totalSell.toFixed(1)),
    topBuyers,
    topSellers,
  };
}

export function getHakaHaki(code: string): HakaHaki {
  const rng = mulberry32(strToSeed(code + '_haka'));
  const stock = getStock(code);
  const baseValue = ((stock?.volume ?? 5000000) * (stock?.price ?? 1000)) / 1_000_000;

  const foreignBuy = parseFloat((baseValue * (0.1 + rng() * 0.4)).toFixed(1));
  const foreignSell = parseFloat((baseValue * (0.1 + rng() * 0.4)).toFixed(1));
  const localBuy = parseFloat((baseValue * (0.2 + rng() * 0.5)).toFixed(1));
  const localSell = parseFloat((baseValue * (0.2 + rng() * 0.5)).toFixed(1));

  return {
    code,
    foreignBuy,
    foreignSell,
    foreignNet: parseFloat((foreignBuy - foreignSell).toFixed(1)),
    localBuy,
    localSell,
    localNet: parseFloat((localBuy - localSell).toFixed(1)),
  };
}

export function getMarketBreadth() {
  const stocks = getAllStocks();
  const advance = stocks.filter(s => s.change > 0).length;
  const decline = stocks.filter(s => s.change < 0).length;
  const unchanged = stocks.filter(s => s.change === 0).length;
  return { advance, decline, unchanged, total: stocks.length };
}

export function getTopGainers(n: number = 5): Stock[] {
  return [...getAllStocks()].sort((a, b) => b.change - a.change).slice(0, n);
}

export function getTopLosers(n: number = 5): Stock[] {
  return [...getAllStocks()].sort((a, b) => a.change - b.change).slice(0, n);
}

export function screenStocks(
  signal?: 'BUY' | 'SELL' | 'NEUTRAL',
  rsiFilter?: 'oversold' | 'normal' | 'overbought'
): Stock[] {
  return getAllStocks().filter(stock => {
    const ind = getIndicators(stock.code);
    if (signal && ind.signal !== signal) return false;
    if (rsiFilter === 'oversold' && ind.rsi >= 40) return false;
    if (rsiFilter === 'overbought' && ind.rsi <= 65) return false;
    if (rsiFilter === 'normal' && (ind.rsi < 40 || ind.rsi > 65)) return false;
    return true;
  });
}

export function formatPrice(price: number): string {
  return price.toLocaleString('id-ID');
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(1)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
  return volume.toString();
}

export function formatMoney(million: number): string {
  const abs = Math.abs(million);
  const sign = million >= 0 ? '+' : '-';
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}B`;
  return `${sign}${abs.toFixed(1)}M`;
}
