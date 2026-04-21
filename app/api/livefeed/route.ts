import { NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';

interface NormalizedToken {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24hPercent: number;
  volume24hUSD: number;
  liquidity: number;
  marketcap: number;
}

function headers(apiKey: string): HeadersInit {
  return {
    'X-API-KEY': apiKey,
    'x-chain': 'solana',
    'accept': 'application/json',
  };
}

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY ?? '';

  const [trendingRes, tokenlistRes] = await Promise.allSettled([
    fetch(`${BASE_URL}/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=20`, {
      headers: headers(apiKey),
      next: { revalidate: 15 },
    }),
    fetch(`${BASE_URL}/defi/tokenlist?sort_by=v24hChangePercent&sort_type=desc&offset=0&limit=20`, {
      headers: headers(apiKey),
      next: { revalidate: 15 },
    }),
  ]);

  const combined = new Map<string, NormalizedToken>();

  if (trendingRes.status === 'fulfilled' && trendingRes.value.ok) {
    const json = await trendingRes.value.json();
    const items: Record<string, unknown>[] = json?.data?.tokens ?? json?.data?.items ?? [];
    for (const item of items) {
      const address = String(item.address ?? '');
      if (!address) continue;
      combined.set(address, {
        address,
        symbol: String(item.symbol ?? ''),
        name: String(item.name ?? ''),
        price: Number(item.price ?? 0),
        priceChange24hPercent: Number(item.price24hChangePercent ?? item.priceChange24hPercent ?? 0),
        volume24hUSD: Number(item.volume24hUSD ?? 0),
        liquidity: Number(item.liquidity ?? 0),
        marketcap: Number(item.marketcap ?? item.mc ?? 0),
      });
    }
  }

  if (tokenlistRes.status === 'fulfilled' && tokenlistRes.value.ok) {
    const json = await tokenlistRes.value.json();
    const items: Record<string, unknown>[] = json?.data?.tokens ?? json?.data?.items ?? [];
    for (const item of items) {
      const address = String(item.address ?? '');
      if (!address || combined.has(address)) continue;
      combined.set(address, {
        address,
        symbol: String(item.symbol ?? ''),
        name: String(item.name ?? ''),
        price: Number(item.price ?? 0),
        priceChange24hPercent: Number(item.v24hChangePercent ?? item.priceChange24hPercent ?? 0),
        volume24hUSD: Number(item.v24hUSD ?? item.volume24hUSD ?? 0),
        liquidity: Number(item.liquidity ?? 0),
        marketcap: Number(item.mc ?? item.marketcap ?? 0),
      });
    }
  }

  if (combined.size === 0) {
    return NextResponse.json({ error: 'Both upstream calls failed' }, { status: 502 });
  }

  const tokens = Array.from(combined.values())
    .sort((a, b) => Math.abs(b.priceChange24hPercent) - Math.abs(a.priceChange24hPercent))
    .slice(0, 20);

  return NextResponse.json({ data: { tokens } }, {
    headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=10' },
  });
}
