import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';

export async function GET(req: NextRequest) {
  const apiKey = process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '';
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address') ?? '';

  if (!address) {
    return NextResponse.json({ error: 'address required' }, { status: 400 });
  }

  const headers: HeadersInit = {
    'X-API-KEY': apiKey,
    'x-chain': 'solana',
    'accept': 'application/json',
  };

  const res = await fetch(`${BASE_URL}/defi/token_overview?address=${address}`, {
    headers,
    next: { revalidate: 120 },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[token-overview] ${address} API error ${res.status}:`, body);
    return NextResponse.json({ error: `API error ${res.status}` }, { status: 502 });
  }

  const json = await res.json();
  if (!json?.success) {
    console.error(`[token-overview] ${address} success=false:`, json?.message ?? JSON.stringify(json));
    return NextResponse.json({ error: json?.message ?? 'Birdeye error' }, { status: 502 });
  }

  return NextResponse.json(json, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' },
  });
}
