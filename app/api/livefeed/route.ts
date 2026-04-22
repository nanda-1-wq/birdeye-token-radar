import { NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';
const SOL_ADDR = 'So11111111111111111111111111111111111111112';

const HOT_TOKENS = [
  { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',            symbol: 'BONK'   },
  { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',            symbol: 'WIF'    },
  { address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',            symbol: 'POPCAT' },
  { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',             symbol: 'JUP'    },
  { address: SOL_ADDR,                                                   symbol: 'SOL'    },
];

function headers(apiKey: string): HeadersInit {
  return {
    'X-API-KEY': apiKey,
    'x-chain': 'solana',
    'accept': 'application/json',
  };
}

export async function GET() {
  const apiKey = process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '';

  const results = await Promise.allSettled(
    HOT_TOKENS.map(async ({ address, symbol }) => {
      const params = new URLSearchParams({
        address,
        tx_type: 'swap',
        sort_type: 'desc',
        offset: '0',
        limit: '10',
      });
      const res = await fetch(`${BASE_URL}/defi/txs/token?${params}`, {
        headers: headers(apiKey),
        next: { revalidate: 120 },
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`[livefeed] ${symbol} API error ${res.status}:`, body);
        return [];
      }
      const json = await res.json();
      if (!json?.success) {
        console.error(`[livefeed] ${symbol} success=false:`, json?.message ?? JSON.stringify(json));
        return [];
      }
      const items: Record<string, unknown>[] = json?.data?.items ?? json?.data ?? [];

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

        // Amount: try multiple price sources, take the max of all non-zero values
        const tokenPrice   = Number(item.tokenPrice ?? 0);
        const baseUiAmount = Number(fromObj.uiAmount ?? fromObj.amount ?? 0);
        const fromPrice    = Number(fromObj.price ?? 0);
        const quoteUiAmt   = Number(toObj.uiAmount ?? toObj.amount ?? 0);
        const toPrice      = Number(toObj.price ?? 0);
        const toNearLiq    = Number(toObj.nearLiquidityPrice ?? 0);

        const candidates = [
          tokenPrice   > 0 && baseUiAmount > 0 ? tokenPrice * baseUiAmount   : 0,
          toNearLiq    > 0 && quoteUiAmt    > 0 ? toNearLiq * quoteUiAmt      : 0,
          fromPrice    > 0 && baseUiAmount  > 0 ? fromPrice * baseUiAmount    : 0,
          toPrice      > 0 && quoteUiAmt    > 0 ? toPrice   * quoteUiAmt      : 0,
        ];
        const amountUsd = Math.max(...candidates);

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
    .filter(a => Number(a.amountUsd) >= 1)
    .sort((a, b) => Number(b.blockUnixTime) - Number(a.blockUnixTime))
    .slice(0, 30);

  return NextResponse.json({ swaps: sorted }, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' },
  });
}
