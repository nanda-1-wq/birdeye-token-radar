import { NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';

export async function GET() {
  const apiKey = process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '';
  console.log(`[listings] apiKey present=${!!apiKey} length=${apiKey.length}`);

  const params = new URLSearchParams({
    sort_by: 'mc',
    sort_type: 'desc',
    limit: '20',
    min_liquidity: '10000',
  });
  const url = `${BASE_URL}/defi/tokenlist?${params}`;
  console.log(`[listings] fetching ${url}`);

  const res = await fetch(url, {
    headers: {
      'X-API-KEY': apiKey,
      'x-chain': 'solana',
      'accept': 'application/json',
    },
    next: { revalidate: 120 },
  });
  console.log(`[listings] response status=${res.status} ok=${res.ok}`);

  if (!res.ok) {
    const body = await res.text();
    console.error(`[listings] API error ${res.status}:`, body);
    // Return error status so client-side fallback triggers
    return NextResponse.json({ error: `Birdeye error: ${res.status}` }, { status: res.status });
  }
  const json = await res.json();
  console.log(`[listings] success=${json?.success} token count=${json?.data?.tokens?.length ?? 'n/a'}`);
  if (json?.message) console.log(`[listings] message:`, json.message);

  if (!json?.success) {
    console.error(`[listings] Birdeye success=false:`, json?.message ?? JSON.stringify(json).slice(0, 200));
    // Return error status so client-side fallback triggers
    return NextResponse.json({ error: json?.message ?? 'Birdeye error' }, { status: 502 });
  }
  return NextResponse.json(json, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' },
  });
}
