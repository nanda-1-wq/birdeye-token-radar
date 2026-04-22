import { NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';

export async function GET() {
  const apiKey = process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '';
  const params = new URLSearchParams({
    sort_by: 'mc',
    sort_type: 'desc',
    limit: '20',
    min_liquidity: '10000',
  });
  const res = await fetch(`${BASE_URL}/defi/tokenlist?${params}`, {
    headers: {
      'X-API-KEY': apiKey,
      'x-chain': 'solana',
      'accept': 'application/json',
    },
    next: { revalidate: 120 },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[listings] API error ${res.status}:`, body);
    return NextResponse.json({ data: { tokens: [] } });
  }
  const json = await res.json();
  if (!json?.success) {
    console.error(`[listings] Birdeye success=false:`, json?.message ?? JSON.stringify(json));
    return NextResponse.json({ data: { tokens: [] } });
  }
  return NextResponse.json(json, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' },
  });
}
