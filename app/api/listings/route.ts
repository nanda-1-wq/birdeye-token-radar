import { NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY ?? '';
  const params = new URLSearchParams({
    sort_by: 'mc',
    sort_type: 'desc',
    offset: '0',
    limit: '20',
    min_liquidity: '10000',
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
  return NextResponse.json(json, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
  });
}
