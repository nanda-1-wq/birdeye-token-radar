import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';

export async function GET(req: NextRequest) {
  const apiKey = process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '';
  const { searchParams } = new URL(req.url);
  const addressParam = searchParams.get('addresses') ?? '';
  const addresses = addressParam.split(',').map(a => a.trim()).filter(Boolean).slice(0, 10);

  if (addresses.length === 0) {
    return NextResponse.json({ data: {} });
  }

  const now = Math.floor(Date.now() / 1000);
  const timeFrom = now - 3600; // 1-hour window

  const headers: HeadersInit = {
    'X-API-KEY': apiKey,
    'x-chain': 'solana',
    'accept': 'application/json',
  };

  const results = await Promise.allSettled(
    addresses.map(async (address) => {
      const params = new URLSearchParams({
        address,
        address_type: 'token',
        type: '15m',
        time_from: String(timeFrom),
        time_to: String(now),
      });
      const res = await fetch(`${BASE_URL}/defi/history_price?${params}`, {
        headers,
        next: { revalidate: 120 },
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`[price-history] ${address} API error ${res.status}:`, body);
        return { address, prices: [] as number[] };
      }
      const json = await res.json();
      if (!json?.success) {
        console.error(`[price-history] ${address} success=false:`, json?.message ?? JSON.stringify(json));
        return { address, prices: [] as number[] };
      }
      const items: { value: number }[] = json?.data?.items ?? [];
      const prices = items.map(i => Number(i.value ?? 0)).filter(v => v > 0);
      return { address, prices };
    })
  );

  const data: Record<string, number[]> = {};
  for (const r of results) {
    if (r.status === 'fulfilled') {
      data[r.value.address] = r.value.prices;
    }
  }

  return NextResponse.json({ data }, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' },
  });
}
