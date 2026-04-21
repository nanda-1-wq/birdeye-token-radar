import { NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY ?? '';

  const params = new URLSearchParams({
    sort_by: 'v24hChangePercent',
    sort_type: 'desc',
    offset: '0',
    limit: '50',
    min_liquidity: '1000',
    max_liquidity: '500000',
  });

  const res = await fetch(`${BASE_URL}/defi/tokenlist?${params}`, {
    headers: {
      'X-API-KEY': apiKey,
      'x-chain': 'solana',
      'accept': 'application/json',
    },
    next: { revalidate: 20 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Birdeye error: ${res.status}` }, { status: res.status });
  }

  const json = await res.json();
  const items: Record<string, unknown>[] = json?.data?.tokens ?? json?.data?.items ?? [];

  const filtered = items
    .map((item) => ({
      address: String(item.address ?? ''),
      symbol: String(item.symbol ?? ''),
      name: String(item.name ?? ''),
      price: Number(item.price ?? 0),
      priceChange24hPercent: Number(item.v24hChangePercent ?? item.priceChange24hPercent ?? 0),
      volume24hUSD: Number(item.v24hUSD ?? item.volume24hUSD ?? 0),
      liquidity: Number(item.liquidity ?? 0),
      marketcap: Number(item.mc ?? item.marketcap ?? 0),
    }))
    .filter(
      (t) =>
        t.priceChange24hPercent > 20 &&
        t.liquidity < 500_000 &&
        t.price < 0.01 &&
        t.address,
    )
    .slice(0, 20);

  return NextResponse.json({ data: { tokens: filtered } }, {
    headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=15' },
  });
}
