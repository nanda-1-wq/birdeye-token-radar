import { NextResponse } from 'next/server';

const BASE_URL = 'https://public-api.birdeye.so';

const TOKENS = [
  { address: 'So11111111111111111111111111111111111111112',     symbol: 'SOL'    },
  { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',   symbol: 'JUP'    },
  { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',  symbol: 'BONK'   },
  { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',  symbol: 'WIF'    },
  { address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',  symbol: 'POPCAT' },
  { address: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',   symbol: 'MEW'    },
  { address: 'A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump',  symbol: 'FWOG'   },
  { address: 'Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jjpj',  symbol: 'ORCA'   },
  { address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',  symbol: 'mSOL'   },
  { address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', symbol: 'RAY'    },
];

// Use max(base_usd, quote_usd) — the API places tokens on either side
// depending on the pool, so we compute both and take the larger value.
const MIN_USD = 100;

function usdOf(side: Record<string, unknown> | undefined): number {
  if (!side) return 0;
  return Math.abs(Number(side.uiAmount ?? 0)) * Number(side.price ?? 0);
}

function timeAgo(unixTime: number): string {
  const secs = Math.floor(Date.now() / 1000) - unixTime;
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export async function GET() {
  const apiKey = process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '';
  const headers = {
    'X-API-KEY': apiKey,
    'x-chain': 'solana',
    'accept': 'application/json',
  };

  const results = await Promise.allSettled(
    TOKENS.map(({ address, symbol }) => {
      const params = new URLSearchParams({
        address,
        tx_type: 'swap',
        sort_type: 'desc',
        offset: '0',
        limit: '50',
      });
      return fetch(`${BASE_URL}/defi/txs/token?${params}`, {
        headers,
        next: { revalidate: 120 },
      })
        .then(async r => {
          if (!r.ok) {
            console.error(`[whales] ${symbol} status ${r.status}:`, await r.text());
            return Promise.reject(r.status);
          }
          return r.json();
        })
        .then(json => {
          if (!json?.success) {
            console.error(`[whales] ${symbol} success=false:`, json?.message ?? JSON.stringify(json));
            return [] as Record<string, unknown>[];
          }
          const items: Record<string, unknown>[] = json?.data?.items ?? [];
          return items.map(item => ({ ...item, _trackedSymbol: symbol, _trackedAddress: address }));
        })
        .catch(err => {
          console.error(`[whales] ${symbol} failed:`, err);
          return [] as Record<string, unknown>[];
        });
    })
  );

  const all: Record<string, unknown>[] = results.flatMap(r =>
    r.status === 'fulfilled' ? r.value : []
  );

  type Side = Record<string, unknown> | undefined;

  const whales = all
    .filter(item => {
      const b = item.base  as Side;
      const q = item.quote as Side;
      return Math.max(usdOf(b), usdOf(q)) >= MIN_USD;
    })
    .sort((a, b) => Number(b.blockUnixTime ?? 0) - Number(a.blockUnixTime ?? 0))
    .slice(0, 20)
    .map(item => {
      const b = item.base  as Side;
      const q = item.quote as Side;
      const baseUsd  = usdOf(b);
      const quoteUsd = usdOf(q);
      // Show the non-SOL/non-stable side as the token symbol when possible
      const amountUsd = Math.max(baseUsd, quoteUsd);
      // Determine which side is the "interesting" token vs the payment leg
      const isSolBase = (b?.symbol as string | undefined)?.toUpperCase() === 'SOL';
      const tokenSide  = isSolBase ? q : b;
      const counterSide = isSolBase ? b : q;
      return {
        txHash:        String(item.txHash ?? ''),
        side:          String(item.side   ?? 'buy'),
        tokenSymbol:   String(tokenSide?.symbol  ?? item._trackedSymbol ?? ''),
        tokenAddress:  String(tokenSide?.address ?? item._trackedAddress ?? ''),
        counterSymbol: String(counterSide?.symbol ?? ''),
        amountUsd,
        walletAddress: String(item.owner  ?? ''),
        timeAgo:       timeAgo(Number(item.blockUnixTime ?? 0)),
        dex:           String(item.source ?? ''),
      };
    });

  return NextResponse.json({ whales }, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' },
  });
}
