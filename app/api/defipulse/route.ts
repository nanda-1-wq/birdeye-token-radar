import { NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY ?? '';

  const params = new URLSearchParams({
    sort_by: 'liquidity',
    sort_type: 'desc',
    offset: '0',
    limit: '20',
    min_liquidity: '1000000',
  });

  const res = await fetch(`${BASE_URL}/defi/tokenlist?${params}`, {
    headers: {
      'X-API-KEY': apiKey,
      'x-chain': 'solana',
      'accept': 'application/json',
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Birdeye error: ${res.status}` }, { status: res.status });
  }

  const json = await res.json();
  const items: Record<string, unknown>[] = json?.data?.tokens ?? json?.data?.items ?? [];

  const tokens = items.map((item) => ({
    address:               String(item.address ?? ''),
    symbol:                String(item.symbol ?? ''),
    name:                  String(item.name ?? ''),
    price:                 Number(item.price ?? 0),
    priceChange24hPercent: Number(item.v24hChangePercent ?? item.priceChange24hPercent ?? 0),
    volume24hUSD:          Number(item.v24hUSD ?? item.volume24hUSD ?? 0),
    liquidity:             Number(item.liquidity ?? 0),
    marketcap:             Number(item.mc ?? item.marketcap ?? 0),
  }));

  return NextResponse.json({ data: { tokens } }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
  });
}
