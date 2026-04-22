import { NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';

export async function GET() {
  const apiKey = process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '';
  const params = new URLSearchParams({
    sort_by: 'rank',
    sort_type: 'asc',
    offset: '0',
    limit: '20',
  });
  const res = await fetch(`${BASE_URL}/defi/token_trending?${params}`, {
    headers: {
      'X-API-KEY': apiKey,
      'x-chain': 'solana',
      'accept': 'application/json',
    },
    next: { revalidate: 120 },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[trending] API error ${res.status}:`, body);
    return NextResponse.json({ error: `Birdeye error: ${res.status}` }, { status: res.status });
  }
  const json = await res.json();
  if (!json?.success) {
    console.error(`[trending] Birdeye success=false:`, json?.message ?? JSON.stringify(json));
    return NextResponse.json({ error: json?.message ?? 'Birdeye error' }, { status: 502 });
  }
  return NextResponse.json(json, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' },
  });
}
