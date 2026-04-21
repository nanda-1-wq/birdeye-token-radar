import { NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';
const SOL_ADDR = 'So11111111111111111111111111111111111111112';

const HOT_TOKENS = [
  { address: SOL_ADDR,                                                   symbol: 'SOL'  },
  { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',             symbol: 'JUP'  },
  { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',            symbol: 'BONK' },
];

function headers(apiKey: string): HeadersInit {
  return {
    'X-API-KEY': apiKey,
    'x-chain': 'solana',
    'accept': 'application/json',
  };
}

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY ?? '';

  const results = await Promise.allSettled(
    HOT_TOKENS.map(async ({ address, symbol }) => {
      const params = new URLSearchParams({
        address,
        tx_type: 'swap',
        sort_type: 'desc',
        offset: '0',
        limit: '15',
      });
      const res = await fetch(`${BASE_URL}/defi/txs/token?${params}`, {
        headers: headers(apiKey),
        next: { revalidate: 10 },
      });
      if (!res.ok) return [];
      const json = await res.json();
      const items: Record<string, unknown>[] = json?.data?.items ?? json?.data ?? [];

      // Log first raw item so we can see the real field names from Birdeye
      if (items.length > 0) {
        console.log('[livefeed] raw swap fields:', JSON.stringify(items[0], null, 2));
      }

      return items.map((item) => {
        const fromObj = (item.from as Record<string, unknown>) ?? {};
        const toObj   = (item.to   as Record<string, unknown>) ?? {};

        const fromSymbol = String(fromObj.symbol ?? fromObj.type ?? '');
        const fromAddr   = String(fromObj.address ?? '');
        const toSymbol   = String(toObj.symbol ?? toObj.type ?? '');
        const toAddr     = String(toObj.address ?? '');

        // Determine the interesting (non-SOL) token symbol for the row label
        let tokenSym: string  = symbol;
        let tokenAddr: string = address;
        let counterSym        = 'SOL';

        if (address === SOL_ADDR) {
          // Querying the SOL pool — find the alt-token on the other side
          const isSolFrom =
            fromAddr === SOL_ADDR || fromSymbol === 'SOL' || fromSymbol === 'WSOL';
          if (isSolFrom) {
            tokenSym  = toSymbol   || '???';
            tokenAddr = toAddr     || '';
            counterSym = 'SOL';
          } else {
            tokenSym  = fromSymbol || '???';
            tokenAddr = fromAddr   || '';
            counterSym = 'SOL';
          }
        } else {
          // JUP / BONK — the queried token IS the interesting one
          tokenSym  = symbol;
          tokenAddr = address;
          // Counter is typically SOL; fall back to the other side's symbol
          counterSym =
            toAddr === SOL_ADDR || toSymbol === 'SOL' || toSymbol === 'WSOL'
              ? 'SOL'
              : toSymbol || 'SOL';
        }

        // Amount: tokenPrice × base(from).uiAmount; fallback quote(to).uiAmount × quote.price
        const tokenPrice   = Number(item.tokenPrice ?? 0);
        const baseUiAmount = Number(fromObj.uiAmount ?? fromObj.amount ?? 0);
        const quoteUiAmt   = Number(toObj.uiAmount   ?? toObj.amount   ?? 0);
        const quotePrice   = Number(toObj.price ?? 0);
        const amountUsd =
          tokenPrice > 0 && baseUiAmount > 0
            ? tokenPrice * baseUiAmount
            : quoteUiAmt * quotePrice;

        const walletAddress = String(
          (item.owner as string) ??
          (item.maker as string) ??
          fromObj.owner ??
          fromObj.address ??
          '',
        );

        return {
          txHash:        String(item.txHash ?? ''),
          blockUnixTime: Number(item.blockUnixTime ?? item.blockTime ?? 0),
          side:          String(item.side ?? 'buy'),
          amountUsd,
          tokenSymbol:   tokenSym,
          tokenAddress:  tokenAddr,
          counterSymbol: counterSym,
          walletAddress,
          source: String(item.source ?? item.dex ?? ''),
        };
      });
    }),
  );

  const all: Record<string, unknown>[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  const sorted = all
    .sort((a, b) => Number(b.blockUnixTime) - Number(a.blockUnixTime))
    .slice(0, 30);

  return NextResponse.json({ swaps: sorted }, {
    headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=5' },
  });
}
