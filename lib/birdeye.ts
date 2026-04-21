const BASE_URL = 'https://public-api.birdeye.so';

function getHeaders(): HeadersInit {
  const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY ?? '';
  return {
    'X-API-KEY': apiKey,
    'x-chain': 'solana',
    'accept': 'application/json',
  };
}

export interface TrendingToken {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24hPercent: number;
  volume24hUSD: number;
  marketcap: number;
  liquidity: number;
  rank: number;
}

export interface NewListingToken {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24hPercent: number;
  marketcap: number;
  liquidity: number;
  volume24hUSD: number;
  lastTradeUnixTime: number;
}

export interface WhaleTx {
  txHash: string;
  blockTime: number;
  side: string;
  volumeInUsd: number;
  from: { address: string };
  to: { address: string };
}

// Confirmed response shape from /defi/token_trending:
// { data: { tokens: [{ address, symbol, name, price, rank, volume24hUSD,
//   price24hChangePercent, marketcap, liquidity, ... }] } }
export async function getTrending(limit = 20): Promise<TrendingToken[]> {
  // Call our server-side proxy to avoid rate limiting from multiple browser tabs
  const res = await fetch(`/api/trending?limit=${limit}`);
  if (!res.ok) throw new Error(`getTrending failed: ${res.status}`);
  const json = await res.json();
  const items: unknown[] = json?.data?.tokens ?? json?.data?.items ?? [];
  return (items as Record<string, unknown>[]).map((item) => ({
    address: String(item.address ?? ''),
    symbol: String(item.symbol ?? ''),
    name: String(item.name ?? ''),
    price: Number(item.price ?? 0),
    priceChange24hPercent: Number(item.price24hChangePercent ?? item.priceChange24hPercent ?? 0),
    volume24hUSD: Number(item.volume24hUSD ?? 0),
    marketcap: Number(item.marketcap ?? item.marketCap ?? 0),
    liquidity: Number(item.liquidity ?? 0),
    rank: Number(item.rank ?? 0),
  }));
}

// /v2/tokens/new_listing requires a higher API tier (returns 301).
// Substitute: /defi/tokenlist sorted by mc asc with a min_liquidity filter
// gives small-cap recently-listed tokens with the same fields we need.
// Confirmed response shape: { data: { tokens: [{ address, symbol, name,
//   price, mc, liquidity, v24hUSD, v24hChangePercent, lastTradeUnixTime }] } }
export async function getNewListings(limit = 20): Promise<NewListingToken[]> {
  // Call our server-side proxy to avoid rate limiting from multiple browser tabs
  const res = await fetch(`/api/listings?limit=${limit}`);
  if (!res.ok) throw new Error(`getNewListings failed: ${res.status}`);
  const json = await res.json();
  const items: unknown[] = json?.data?.tokens ?? json?.data?.items ?? [];
  return (items as Record<string, unknown>[]).map((item) => ({
    address: String(item.address ?? ''),
    symbol: String(item.symbol ?? ''),
    name: String(item.name ?? ''),
    price: Number(item.price ?? 0),
    priceChange24hPercent: Number(item.v24hChangePercent ?? 0),
    marketcap: Number(item.mc ?? 0),
    liquidity: Number(item.liquidity ?? 0),
    volume24hUSD: Number(item.v24hUSD ?? 0),
    lastTradeUnixTime: Number(item.lastTradeUnixTime ?? 0),
  }));
}

export async function getWhaleTxs(address: string): Promise<WhaleTx[]> {
  const params = new URLSearchParams({
    address,
    tx_type: 'swap',
    sort_type: 'desc',
    offset: '0',
    limit: '50',
  });
  const res = await fetch(`${BASE_URL}/defi/txs/token?${params}`, {
    headers: getHeaders(),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`getWhaleTxs failed: ${res.status}`);
  const json = await res.json();
  const items: unknown[] = json?.data?.items ?? json?.data ?? [];
  return (items as Record<string, unknown>[])
    .filter((item) => Number(item.volumeInUsd ?? 0) >= 10000)
    .map((item) => ({
      txHash: String(item.txHash ?? ''),
      blockTime: Number(item.blockTime ?? 0),
      side: String(item.side ?? ''),
      volumeInUsd: Number(item.volumeInUsd ?? 0),
      from: { address: String((item.from as Record<string, unknown>)?.address ?? '') },
      to: { address: String((item.to as Record<string, unknown>)?.address ?? '') },
    }));
}

export type SafetyLabel = 'safe' | 'warn' | 'rug';

export function mapSecurityToSafety(score: number): SafetyLabel {
  if (score >= 70) return 'safe';
  if (score >= 40) return 'warn';
  return 'rug';
}

// /defi/token_security requires a higher API tier (returns 403).
// This computes a proxy safety score (0-100) from on-chain metrics available
// in the trending and tokenlist responses we already have.
export function computeProxyScore(
  liquidity: number,
  marketcap: number,
  priceChange24hPercent: number,
  volume24h = 0,
): number {
  // No mcap data → neutral caution score (avoids false RUG labels)
  if (!marketcap) return 30;

  // Hard floor only when liquidity is truly near-zero
  if (liquidity < 500) return 15;

  const abs = Math.abs(priceChange24hPercent);

  // Micro-cap ($1K–$50K): start at caution but bump to 40 when volume > mcap
  // (active trading despite tiny cap is a positive signal)
  const isMicroCap = marketcap > 0 && marketcap < 50_000;
  if (isMicroCap && volume24h > 0 && volume24h > marketcap) return 40;

  // Start micro-cap memes at caution (35) instead of 50 so the
  // penalties below don't push them to 0 unfairly
  let score = isMicroCap ? 35 : 50;

  // Extreme manipulation signal — but score stays >= 20
  if (abs > 5000) return Math.max(20, score - 20);

  // Liquidity: deeper pools = harder to rug
  if (liquidity >= 500_000)       score += 20;
  else if (liquidity >= 100_000)  score += 12;
  else if (liquidity >= 50_000)   score += 6;
  else if (liquidity >= 10_000)   score += 2;
  else if (liquidity < 1_000)     score -= 8;

  // Market cap: higher = more established; missing mcap is neutral
  if (marketcap >= 5_000_000)      score += 15;
  else if (marketcap >= 1_000_000) score += 10;
  else if (marketcap >= 100_000)   score += 5;
  // micro-cap already starts at 35; no further penalty

  // Extreme price pumps are a rug-pull signal (thresholds raised for memes)
  if (abs > 2000)       score -= 25;
  else if (abs > 1000)  score -= 15;
  else if (abs > 500)   score -= 8;
  else if (abs > 200)   score -= 3;

  return Math.max(0, Math.min(100, score));
}

export function tokenAge(lastTradeUnixTime: number): string {
  if (!lastTradeUnixTime) return 'new';
  const hours = Math.floor((Date.now() - lastTradeUnixTime * 1000) / 3_600_000);
  if (hours < 1) return '<1h ago';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
