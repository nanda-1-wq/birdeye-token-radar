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
  const addrList = addresses.split(',').map(a => a.trim()).filter(Boolean);

  const results = await Promise.allSettled(
    addrList.map(async (address) => {
      const res = await fetch(`${BASE_URL}/defi/price?address=${address}`, {
        headers: headers(apiKey),
        next: { revalidate: 15 },
      });
      if (!res.ok) return { address, price: 0, change24h: 0 };
      const json = await res.json();
      const entry = json?.data ?? {};
      return {
        address,
        price:     Number(entry.value ?? entry.price ?? 0),
        change24h: Number(entry.priceChange24hPercent ?? entry.priceChange24h ?? 0),
      };
    }),
  );

  const normalized: Record<string, { price: number; change24h: number }> = {};
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { address, price, change24h } = result.value;
      normalized[address] = { price, change24h };
    }
  }

  return NextResponse.json({ data: normalized });
}
