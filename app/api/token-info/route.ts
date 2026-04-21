import { NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';

function headers(apiKey: string): HeadersInit {
  return {
    'X-API-KEY': apiKey,
    'x-chain': 'solana',
    'accept': 'application/json',
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const addresses = searchParams.get('addresses') ?? '';
  if (!addresses) return NextResponse.json({ data: {} });

  const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY ?? '';

  try {
    const res = await fetch(`${BASE_URL}/defi/multi_price?list_address=${encodeURIComponent(addresses)}`, {
      headers: headers(apiKey),
      next: { revalidate: 15 },
    });
    if (!res.ok) return NextResponse.json({ data: {} });
    const json = await res.json();
    console.log('[token-info] raw multi_price response:', JSON.stringify(json).slice(0, 500));

    // Normalize to { ADDRESS: { price, change24h } } regardless of Birdeye field names
    const raw: Record<string, Record<string, unknown>> = json?.data ?? {};
    const normalized: Record<string, { price: number; change24h: number }> = {};
    for (const [addr, entry] of Object.entries(raw)) {
      normalized[addr] = {
        price:    Number(entry.value ?? entry.price ?? 0),
        change24h: Number(
          entry.priceChange24hPercent ??
          entry.priceChange24h ??
          entry.change24h ??
          0,
        ),
      };
    }
    return NextResponse.json({ data: normalized });
  } catch {
    return NextResponse.json({ data: {} });
  }
}
