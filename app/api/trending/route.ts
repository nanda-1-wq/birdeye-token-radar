import { NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';

export async function GET() {
  const apiKey = process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '';
  console.log(`[trending] apiKey present=${!!apiKey} length=${apiKey.length}`);

  const params = new URLSearchParams({
    sort_by: 'rank',
    sort_type: 'asc',
    offset: '0',
    limit: '20',
  });
  const url = `${BASE_URL}/defi/token_trending?${params}`;
  console.log(`[trending] fetching ${url}`);

  const res = await fetch(url, {
    headers: {
      'X-API-KEY': apiKey,
      'x-chain': 'solana',
      'accept': 'application/json',
    },
    next: { revalidate: 120 },
  });
  console.log(`[trending] response status=${res.status} ok=${res.ok}`);

  if (!res.ok) {
    const body = await res.text();
    console.error(`[trending] API error ${res.status}:`, body);
    return NextResponse.json({ error: `Birdeye error: ${res.status}` }, { status: res.status });
  }
  const json = await res.json();
  console.log(`[trending] success=${json?.success} token count=${json?.data?.tokens?.length ?? json?.data?.items?.length ?? 'n/a'}`);
  if (json?.message) console.log(`[trending] message:`, json.message);

  if (!json?.success) {
    console.error(`[trending] Birdeye success=false:`, json?.message ?? JSON.stringify(json).slice(0, 200));
    return NextResponse.json({ error: json?.message ?? 'Birdeye error' }, { status: 502 });
  }
  return NextResponse.json(json, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' },
  });
}
