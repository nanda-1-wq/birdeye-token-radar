'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  getTrending,
  getNewListings,
  mapSecurityToSafety,
  computeProxyScore,
  tokenAge,
} from '@/lib/birdeye';

type Tab = 'trending' | 'listings' | 'livefeed' | 'whalerader' | 'mememonitor' | 'smartmoney' | 'defipulse' | 'watchlist';
type Safety = 'safe' | 'warn' | 'rug';
type SafetyFilter = 'all' | 'safe' | 'caution' | 'risky';
type SortField = 'safetyScore' | 'mcap' | 'volume24h';
type WhaleSortField = 'amount' | 'time' | 'token';

interface DisplayToken {
  symbol: string;
  name: string;
  address: string;
  price: number;
  change24h: number;
  mcap: number;
  safety: Safety;
  safetyScore: number;
  holders: number;
  age: string;
  volume24h: number;
  liquidity?: number;
  rank?: number;
}

interface LiveSwap {
  txHash: string;
  blockUnixTime: number;
  side: string;
  amountUsd: number;
  tokenSymbol: string;
  tokenAddress: string;
  counterSymbol: string;
  walletAddress: string;
  source: string;
}

type LiveFeedSortField = 'amount' | 'time' | 'token';

const FALLBACK_LISTINGS: DisplayToken[] = [
  { symbol: 'BONKAI', name: 'Bonkai', address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsk', price: 0.000042, change24h: 340, mcap: 420000, safety: 'safe', safetyScore: 87, holders: 1240, age: '2h ago', volume24h: 2400000, liquidity: 85000 },
  { symbol: 'PEPE2', name: 'PepeSol', address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', price: 0.0000091, change24h: 88, mcap: 180000, safety: 'warn', safetyScore: 45, holders: 430, age: '5h ago', volume24h: 320000, liquidity: 42000 },
  { symbol: 'RUGBAIT', name: 'RugBait', address: 'So11111111111111111111111111111111111111112', price: 0.0000001, change24h: 2100, mcap: 9000, safety: 'rug', safetyScore: 8, holders: 12, age: '1h ago', volume24h: 18000 },
  { symbol: 'WIFM', name: 'WifMoon', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', price: 0.00089, change24h: 55, mcap: 890000, safety: 'safe', safetyScore: 82, holders: 3200, age: '8h ago', volume24h: 1100000, liquidity: 220000 },
  { symbol: 'MGDOG', name: 'MegaDog', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', price: 0.00012, change24h: -12, mcap: 120000, safety: 'warn', safetyScore: 51, holders: 680, age: '12h ago', volume24h: 85000, liquidity: 28000 },
];

const FALLBACK_TRENDING: DisplayToken[] = [
  { symbol: 'BONKAI', name: 'Bonkai',    address: 'BnKa111111111111111111111111111111111111111', price: 0.000042,  change24h: 340,  mcap: 420000,  safety: 'safe', safetyScore: 87, holders: 1240, age: '', volume24h: 2400000,  liquidity: 85000,  rank: 1  },
  { symbol: 'WIFM',   name: 'WifMoon',   address: 'WiFm111111111111111111111111111111111111111', price: 0.00089,   change24h: 55,   mcap: 890000,  safety: 'safe', safetyScore: 82, holders: 3200, age: '', volume24h: 1100000,  liquidity: 220000, rank: 2  },
  { symbol: 'SPELPE', name: 'SolPepe',   address: 'SpeLpE11111111111111111111111111111111111111', price: 0.000034,  change24h: 180,  mcap: 340000,  safety: 'warn', safetyScore: 61, holders: 890,  age: '', volume24h: 880000,   liquidity: 65000,  rank: 3  },
  { symbol: 'CIAD',   name: 'CatInADog', address: 'CiAd111111111111111111111111111111111111111', price: 0.00055,   change24h: 42,   mcap: 550000,  safety: 'warn', safetyScore: 55, holders: 1100, age: '', volume24h: 550000,   liquidity: 95000,  rank: 4  },
  { symbol: 'MEMEX',  name: 'MemeX',     address: 'MeMe111111111111111111111111111111111111111', price: 0.0021,    change24h: 28,   mcap: 2100000, safety: 'safe', safetyScore: 70, holders: 4500, age: '', volume24h: 320000,   liquidity: 180000, rank: 5  },
  { symbol: 'DOGNFT', name: 'DogNFT',    address: 'DoGnFt11111111111111111111111111111111111111', price: 0.000018,  change24h: 95,   mcap: 180000,  safety: 'warn', safetyScore: 48, holders: 620,  age: '', volume24h: 420000,   liquidity: 32000,  rank: 6  },
  { symbol: 'RUGZ',   name: 'RugZero',   address: 'RuGz111111111111111111111111111111111111111', price: 0.0000012, change24h: 1200, mcap: 12000,   safety: 'rug',  safetyScore: 18, holders: 88,   age: '', volume24h: 95000,    liquidity: 4200,   rank: 7  },
  { symbol: 'POOCAT', name: 'PooCat',    address: 'PoOcAt11111111111111111111111111111111111111', price: 0.000091,  change24h: 210,  mcap: 910000,  safety: 'warn', safetyScore: 52, holders: 2100, age: '', volume24h: 680000,   liquidity: 78000,  rank: 8  },
  { symbol: 'MOONAI', name: 'Moon AI',   address: 'MoOnAi11111111111111111111111111111111111111', price: 0.0041,    change24h: 18,   mcap: 4100000, safety: 'safe', safetyScore: 75, holders: 8900, age: '', volume24h: 1800000,  liquidity: 340000, rank: 9  },
  { symbol: 'SOLAPE', name: 'Sol Ape',   address: 'SoLaPe11111111111111111111111111111111111111', price: 0.00033,   change24h: 67,   mcap: 330000,  safety: 'warn', safetyScore: 58, holders: 1500, age: '', volume24h: 480000,   liquidity: 55000,  rank: 10 },
];

const _t = Math.floor(Date.now() / 1000);

const FALLBACK_MEMES: DisplayToken[] = [
  { symbol: 'PUMPCAT', name: 'Pump Cat',   address: 'PuMpCaT111111111111111111111111111111111111', price: 0.0000034,  change24h: 420,  mcap: 34000,  safety: 'warn', safetyScore: 38, holders: 340, age: '', volume24h: 89000,  liquidity: 12000 },
  { symbol: 'MOONPUP', name: 'Moon Pup',   address: 'MoOnPuP111111111111111111111111111111111111', price: 0.00000091, change24h: 280,  mcap: 9100,   safety: 'rug',  safetyScore: 22, holders: 88,  age: '', volume24h: 45000,  liquidity: 3200  },
  { symbol: 'SOLRAT',  name: 'Sol Rat',    address: 'SoLrAt1111111111111111111111111111111111111', price: 0.0000012,  change24h: 190,  mcap: 12000,  safety: 'warn', safetyScore: 41, holders: 210, age: '', volume24h: 32000,  liquidity: 8500  },
  { symbol: 'FROGGY',  name: 'Froggy',     address: 'FrOgGy1111111111111111111111111111111111111', price: 0.0000005,  change24h: 155,  mcap: 5000,   safety: 'rug',  safetyScore: 18, holders: 55,  age: '', volume24h: 19000,  liquidity: 1800  },
  { symbol: 'DEGENX',  name: 'Degen X',    address: 'DeGeNx1111111111111111111111111111111111111', price: 0.0000078,  change24h: 88,   mcap: 78000,  safety: 'warn', safetyScore: 44, holders: 560, age: '', volume24h: 67000,  liquidity: 24000 },
  { symbol: 'RATKING', name: 'Rat King',   address: 'RaTkInG111111111111111111111111111111111111', price: 0.0000021,  change24h: 312,  mcap: 21000,  safety: 'rug',  safetyScore: 15, holders: 120, age: '', volume24h: 58000,  liquidity: 5400  },
];

const FALLBACK_SMART_MONEY: DisplayToken[] = [
  { symbol: 'JTO',    name: 'Jito',         address: 'jtojtomepa8berqoembperngkttmbehomswrapsol1', price: 2.84,   change24h: 12.4, mcap: 420000000,  safety: 'safe', safetyScore: 85, holders: 45000,  age: '', volume24h: 18000000,  liquidity: 8200000  },
  { symbol: 'PYTH',   name: 'Pyth Network', address: 'HZ1JovNiVvGqNLQLjnkuWWmxq7yJZnbpJE5m5XWH', price: 0.31,   change24h: 8.7,  mcap: 280000000,  safety: 'safe', safetyScore: 82, holders: 38000,  age: '', volume24h: 12000000,  liquidity: 5600000  },
  { symbol: 'DRIFT',  name: 'Drift',        address: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg', price: 0.62,   change24h: 22.1, mcap: 180000000,  safety: 'safe', safetyScore: 78, holders: 28000,  age: '', volume24h: 22000000,  liquidity: 4800000  },
  { symbol: 'ORCA',   name: 'Orca',         address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1xux', price: 3.41,   change24h: 18.3, mcap: 340000000,  safety: 'safe', safetyScore: 80, holders: 62000,  age: '', volume24h: 31000000,  liquidity: 9100000  },
  { symbol: 'MNGO',   name: 'Mango',        address: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLk', price: 0.018,  change24h: 34.5, mcap: 45000000,   safety: 'warn', safetyScore: 62, holders: 12000,  age: '', volume24h: 8900000,   liquidity: 2100000  },
  { symbol: 'STEP',   name: 'Step Finance', address: 'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Xjdsc1Zx', price: 0.044,  change24h: 28.9, mcap: 22000000,   safety: 'warn', safetyScore: 58, holders: 9400,   age: '', volume24h: 4200000,   liquidity: 1300000  },
];

const FALLBACK_DEFI_PULSE: DisplayToken[] = [
  { symbol: 'SOL',    name: 'Solana',    address: 'So11111111111111111111111111111111111111112',   price: 142.50, change24h: 3.2,  mcap: 65000000000, safety: 'safe', safetyScore: 98, holders: 2800000, age: '', volume24h: 2100000000, liquidity: 890000000 },
  { symbol: 'JUP',    name: 'Jupiter',   address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', price: 0.89,   change24h: 5.1,  mcap: 1200000000,  safety: 'safe', safetyScore: 91, holders: 450000,  age: '', volume24h: 280000000,  liquidity: 95000000  },
  { symbol: 'BONK',   name: 'Bonk',      address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', price: 0.0000218, change24h: 7.8, mcap: 1400000000, safety: 'safe', safetyScore: 88, holders: 680000, age: '', volume24h: 340000000, liquidity: 82000000 },
  { symbol: 'WIF',    name: 'dogwifhat', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', price: 1.24,   change24h: 9.4,  mcap: 1240000000,  safety: 'safe', safetyScore: 86, holders: 320000,  age: '', volume24h: 195000000,  liquidity: 68000000  },
  { symbol: 'POPCAT', name: 'Popcat',    address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', price: 0.48,   change24h: 11.2, mcap: 480000000,   safety: 'safe', safetyScore: 83, holders: 180000,  age: '', volume24h: 120000000,  liquidity: 42000000  },
  { symbol: 'MSOL',   name: 'Marinade',  address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', price: 163.20, change24h: 3.4,  mcap: 890000000,   safety: 'safe', safetyScore: 92, holders: 95000,   age: '', volume24h: 88000000,   liquidity: 55000000  },
];

const FALLBACK_WHALE_TXS: WhaleTx[] = [
  { txHash: 'fb1', side: 'buy',  tokenSymbol: 'WIF',    tokenAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', counterSymbol: 'SOL',  amountUsd: 48200,  walletAddress: 'Wh4Le1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', timeAgo: '2m ago',  dex: 'raydium'  },
  { txHash: 'fb2', side: 'sell', tokenSymbol: 'BONK',   tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',  counterSymbol: 'USDC', amountUsd: 92500,  walletAddress: 'Wh4Le2bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', timeAgo: '5m ago',  dex: 'jupiter'  },
  { txHash: 'fb3', side: 'buy',  tokenSymbol: 'JUP',    tokenAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',   counterSymbol: 'SOL',  amountUsd: 215000, walletAddress: 'Wh4Le3cccccccccccccccccccccccccccccccccccc', timeAgo: '8m ago',  dex: 'orca'     },
  { txHash: 'fb4', side: 'buy',  tokenSymbol: 'POPCAT', tokenAddress: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',  counterSymbol: 'SOL',  amountUsd: 31800,  walletAddress: 'Wh4Le4dddddddddddddddddddddddddddddddddddd', timeAgo: '12m ago', dex: 'raydium'  },
  { txHash: 'fb5', side: 'sell', tokenSymbol: 'SOL',    tokenAddress: 'So11111111111111111111111111111111111111112',     counterSymbol: 'USDC', amountUsd: 540000, walletAddress: 'Wh4Le5eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', timeAgo: '18m ago', dex: 'jupiter'  },
  { txHash: 'fb6', side: 'buy',  tokenSymbol: 'WIF',    tokenAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', counterSymbol: 'SOL',  amountUsd: 78400,  walletAddress: 'Wh4Le6fffffffffffffffffffffffffffffffffffff', timeAgo: '24m ago', dex: 'raydium'  },
];

const FALLBACK_LIVE_SWAPS: LiveSwap[] = [
  { txHash: 'ls1', blockUnixTime: _t - 8,   side: 'buy',  amountUsd: 4820,  tokenSymbol: 'BONK',   tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', counterSymbol: 'SOL',  walletAddress: 'LS1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', source: 'raydium'  },
  { txHash: 'ls2', blockUnixTime: _t - 22,  side: 'sell', amountUsd: 9250,  tokenSymbol: 'WIF',    tokenAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',  counterSymbol: 'USDC', walletAddress: 'LS2bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', source: 'jupiter'  },
  { txHash: 'ls3', blockUnixTime: _t - 41,  side: 'buy',  amountUsd: 1340,  tokenSymbol: 'JUP',    tokenAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',   counterSymbol: 'SOL',  walletAddress: 'LS3cccccccccccccccccccccccccccccccccccccccc', source: 'orca'     },
  { txHash: 'ls4', blockUnixTime: _t - 67,  side: 'buy',  amountUsd: 720,   tokenSymbol: 'POPCAT', tokenAddress: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',  counterSymbol: 'SOL',  walletAddress: 'LS4dddddddddddddddddddddddddddddddddddddddd', source: 'raydium'  },
  { txHash: 'ls5', blockUnixTime: _t - 89,  side: 'sell', amountUsd: 18200, tokenSymbol: 'BONK',   tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', counterSymbol: 'USDC', walletAddress: 'LS5eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', source: 'jupiter'  },
  { txHash: 'ls6', blockUnixTime: _t - 112, side: 'buy',  amountUsd: 5500,  tokenSymbol: 'WIF',    tokenAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',  counterSymbol: 'SOL',  walletAddress: 'LS6ffffffffffffffffffffffffffffffffffffffff', source: 'raydium'  },
  { txHash: 'ls7', blockUnixTime: _t - 145, side: 'sell', amountUsd: 3100,  tokenSymbol: 'JUP',    tokenAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',   counterSymbol: 'USDC', walletAddress: 'LS7gggggggggggggggggggggggggggggggggggggggg', source: 'orca'     },
  { txHash: 'ls8', blockUnixTime: _t - 178, side: 'buy',  amountUsd: 890,   tokenSymbol: 'SOL',    tokenAddress: 'So11111111111111111111111111111111111111112',     counterSymbol: 'USDC', walletAddress: 'LS8hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh', source: 'jupiter'  },
  { txHash: 'ls9', blockUnixTime: _t - 203, side: 'sell', amountUsd: 2240,  tokenSymbol: 'POPCAT', tokenAddress: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',  counterSymbol: 'SOL',  walletAddress: 'LS9iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii', source: 'raydium'  },
  { txHash: 'ls0', blockUnixTime: _t - 251, side: 'buy',  amountUsd: 6700,  tokenSymbol: 'BONK',   tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', counterSymbol: 'SOL',  walletAddress: 'LS0jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj', source: 'jupiter'  },
];

const TABS: { id: Tab; label: string }[] = [
  { id: 'trending',    label: 'Trending' },
  { id: 'listings',   label: 'New Listings' },
  { id: 'livefeed',   label: 'Live Feed' },
  { id: 'whalerader', label: 'Whale Radar' },
  { id: 'mememonitor',label: 'Meme Monitor' },
  { id: 'smartmoney', label: 'Smart Money' },
  { id: 'defipulse',  label: 'DeFi Pulse' },
  { id: 'watchlist',  label: 'Watchlist' },
];

// Tabs that show a coming-soon placeholder
const PLACEHOLDER_TABS: Partial<Record<Tab, string>> = {};

interface WhaleTx {
  txHash: string;
  side: string;
  tokenSymbol: string;
  tokenAddress: string;
  counterSymbol: string;
  amountUsd: number;
  walletAddress: string;
  timeAgo: string;
  dex: string;
}

const SAFETY_CONFIG: Record<Safety, { label: string; color: string; bg: string; border: string; glow: string }> = {
  safe: { label: 'SAFE',     color: '#00ff9d', bg: 'rgba(0,255,157,0.10)',  border: 'rgba(0,255,157,0.40)',  glow: 'rgba(0,255,157,0.13)'  },
  warn: { label: 'CAUTION',  color: '#f5a623', bg: 'rgba(245,166,35,0.10)', border: 'rgba(245,166,35,0.40)', glow: 'rgba(245,166,35,0.13)' },
  rug:  { label: 'RUG RISK', color: '#ff3b6b', bg: 'rgba(255,59,107,0.10)', border: 'rgba(255,59,107,0.40)', glow: 'rgba(255,59,107,0.13)' },
};

function formatChange(pct: number): string {
  const fixed = Math.abs(pct).toFixed(2);
  return (pct >= 0 ? '+' : '-') + fixed + '%';
}

function formatPrice(price: number): string {
  if (price < 0.000001) return price.toExponential(2);
  if (price < 0.001) return price.toFixed(7);
  return price.toFixed(5);
}

function formatNum(val: number): string {
  if (!val) return '—';
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000)     return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000)         return `$${(val / 1_000).toFixed(1)}K`;
  return `$${Math.round(val)}`;
}

const formatMcap   = formatNum;
const formatVolume = formatNum;
const formatUsd    = formatNum;

function formatAddress(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function timeAgoFromUnix(unixTime: number): string {
  if (!unixTime) return '—';
  const secs = Math.floor(Date.now() / 1000) - unixTime;
  if (secs < 60)  return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function formatDex(source: string): string {
  if (!source) return 'Unknown';
  return source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SafetyDonut({ score }: { score: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? '#00ff9d' : score >= 40 ? '#f5a623' : '#ff3b6b';
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
      <circle
        cx="32" cy="32" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${circ}`}
        strokeDashoffset={`${offset}`}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
      />
      <text
        x="32" y="32"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="14"
        fontWeight="700"
        fontFamily="monospace"
      >
        {score}
      </text>
    </svg>
  );
}

function TokenIcon({ symbol }: { symbol: string }) {
  const palette = ['#6366f1', '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#f97316', '#ec4899'];
  const idx = (symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1)) % palette.length;
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: palette[idx],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
      fontFamily: 'var(--font-syne), sans-serif',
    }}>
      {symbol[0]}
    </div>
  );
}

function SafetyBadge({ safety }: { safety: Safety }) {
  const cfg = SAFETY_CONFIG[safety];
  return (
    <span style={{
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
      padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.06em', whiteSpace: 'nowrap', lineHeight: 1.6,
    }}>
      {cfg.label}
    </span>
  );
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-space-mono), monospace' }}>{value}</div>
    </div>
  );
}

function TokenCard({
  token,
  starred,
  onToggleStar,
  sparklinePrices,
  onClickOverview,
}: {
  token: DisplayToken;
  starred: boolean;
  onToggleStar: () => void;
  sparklinePrices?: number[];
  onClickOverview?: () => void;
}) {
  const changePos = token.change24h >= 0;
  const cfg       = SAFETY_CONFIG[token.safety];
  return (
    <div
      className="token-card"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${cfg.border}`,
        borderRadius: 12,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: `0 0 16px ${cfg.glow}`,
      }}
    >
      {/* Top row: icon + symbol/name/badge + donut */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <TokenIcon symbol={token.symbol} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-syne), sans-serif',
              fontWeight: 700, fontSize: 15,
              color: 'var(--text)',
            }}>
              {token.symbol}
            </span>
            <SafetyBadge safety={token.safety} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
            {token.name}
            <span style={{ opacity: 0.5 }}> · {formatAddress(token.address)}</span>
          </div>
        </div>
        <SafetyDonut score={token.safetyScore} />
      </div>

      {/* Price + change + sparkline */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontSize: 20, fontWeight: 700,
            color: 'var(--text)',
            fontFamily: 'var(--font-space-mono), monospace',
          }}>
            ${formatPrice(token.price)}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: changePos ? '#00ff9d' : '#ff3b6b',
          }}>
            {formatChange(token.change24h)}
          </span>
        </div>
        {sparklinePrices && sparklinePrices.length >= 2 && (
          <Sparkline prices={sparklinePrices} color={changePos ? '#00ff9d' : '#ff3b6b'} />
        )}
      </div>

      {/* 2x2 data grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 8px' }}>
        <DataCell label="MARKET CAP" value={formatMcap(token.mcap)} />
        <DataCell label="24H VOLUME" value={formatVolume(token.volume24h)} />
        <DataCell label="LIQUIDITY" value={token.liquidity ? formatVolume(token.liquidity) : '—'} />
        <DataCell label="HOLDERS" value={token.holders > 0 ? token.holders.toLocaleString() : '—'} />
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            onClick={onClickOverview}
            style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.65, cursor: onClickOverview ? 'pointer' : 'default' }}
          >
            Click for full breakdown
          </span>
          <a
            href={`https://birdeye.so/token/${token.address}?chain=solana`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 10,
              color: 'var(--muted)',
              fontFamily: 'var(--font-space-mono), monospace',
              textDecoration: 'none',
              opacity: 0.7,
            }}
            className="birdeye-link"
          >
            View on Birdeye
          </a>
        </div>
        <button
          onClick={onToggleStar}
          className="star-btn"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 18, lineHeight: 1,
            color: starred ? '#f5c518' : 'var(--muted)',
            padding: '2px 4px',
          }}
          aria-label={starred ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {starred ? '★' : '☆'}
        </button>
      </div>
    </div>
  );
}

function Sparkline({ prices, color = '#00ff9d' }: { prices: number[]; color?: string }) {
  if (prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 80, H = 28;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * W;
    const y = H - ((p - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface TokenOverview {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24hPercent: number;
  marketcap: number;
  liquidity: number;
  holder: number;
  supply: number;
  extensions?: {
    website?: string;
    twitter?: string;
    description?: string;
  };
}

function TokenOverviewModal({ address, onClose }: { address: string; onClose: () => void }) {
  const [data, setData] = useState<TokenOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/token-overview?address=${address}`)
      .then(r => r.json())
      .then(json => {
        if (json?.data) setData(json.data as TokenOverview);
        else setError(json?.error ?? 'No data');
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(4,6,10,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(0,255,157,0.25)',
          borderRadius: 14,
          padding: 28,
          width: '100%', maxWidth: 480,
          boxShadow: '0 0 48px rgba(0,255,157,0.08)',
          fontFamily: 'var(--font-space-mono), monospace',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 17, color: 'var(--accent)' }}>
            Token Overview
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {loading && <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>Loading...</div>}
        {error  && <div style={{ color: '#ff3b6b', fontSize: 13, textAlign: 'center', padding: 24 }}>{error}</div>}

        {data && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-syne), sans-serif' }}>
                {data.symbol}
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>{data.name}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, wordBreak: 'break-all' }}>{address}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
              {[
                { label: 'PRICE',     value: `$${formatPrice(data.price)}` },
                { label: '24H CHANGE',value: formatChange(data.priceChange24hPercent), color: data.priceChange24hPercent >= 0 ? '#00ff9d' : '#ff3b6b' },
                { label: 'MARKET CAP',value: formatMcap(data.marketcap)   },
                { label: 'LIQUIDITY', value: formatVolume(data.liquidity) },
                { label: 'HOLDERS',   value: (data.holder ?? 0).toLocaleString() },
                { label: 'SUPPLY',    value: formatVolume(data.supply)    },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, color: color ?? 'var(--text)' }}>{value}</div>
                </div>
              ))}
            </div>

            {data.extensions?.description && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 6 }}>DESCRIPTION</div>
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, opacity: 0.8 }}>
                  {data.extensions.description.slice(0, 240)}{data.extensions.description.length > 240 ? '...' : ''}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
              <a href={`https://birdeye.so/token/${address}?chain=solana`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
                Birdeye ↗
              </a>
              {data.extensions?.website && (
                <a href={data.extensions.website} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}>
                  Website ↗
                </a>
              )}
              {data.extensions?.twitter && (
                <a href={data.extensions.twitter} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: '#1d9bf0', textDecoration: 'none' }}>
                  Twitter ↗
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketOverviewBar({ tokens }: { tokens: DisplayToken[] }) {
  const total = tokens.length;
  if (total === 0) return null;
  const safeN = tokens.filter(t => t.safety === 'safe').length;
  const cautionN = tokens.filter(t => t.safety === 'warn').length;
  const riskyN = tokens.filter(t => t.safety === 'rug').length;
  const safePct = (safeN / total) * 100;
  const cautionPct = (cautionN / total) * 100;
  const riskyPct = (riskyN / total) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
        Market Overview
      </span>
      <div style={{
        flex: 1, height: 6, borderRadius: 3,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.05)',
        display: 'flex',
      }}>
        <div style={{ width: `${safePct}%`, background: '#00ff9d', transition: 'width 0.4s' }} />
        <div style={{ width: `${cautionPct}%`, background: '#f5a623', transition: 'width 0.4s' }} />
        <div style={{ width: `${riskyPct}%`, background: '#ff3b6b', transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
        <span style={{ color: '#00ff9d' }}>{safeN} safe</span>
        <span style={{ color: 'var(--muted)' }}> · </span>
        <span style={{ color: '#f5a623' }}>{cautionN} caution</span>
        <span style={{ color: 'var(--muted)' }}> · </span>
        <span style={{ color: '#ff3b6b' }}>{riskyN} risky</span>
      </span>
    </div>
  );
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-24 rounded-lg"
      style={{ border: '1px dashed rgba(0,255,157,0.15)', background: 'rgba(9,13,18,0.6)' }}
    >
      <p className="text-base font-bold" style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--text)' }}>
        {title}
      </p>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        {description}
      </p>
    </div>
  );
}

// ─── Live Feed components ─────────────────────────────────────────────────────

function LiveFeedRow({ swap, index }: { swap: LiveSwap; index: number }) {
  const isBuy = swap.side === 'buy';
  const sideColor  = isBuy ? '#00ff9d' : '#ff3b6b';
  const sideBg     = isBuy ? 'rgba(0,255,157,0.12)' : 'rgba(255,59,107,0.12)';
  const sideBorder = isBuy ? 'rgba(0,255,157,0.35)' : 'rgba(255,59,107,0.35)';
  const rowBg      = index % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'transparent';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '10px 16px',
      background: rowBg,
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      gap: 12,
      minHeight: 48,
    }}>
      {/* LEFT: badge + symbol + pair */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 220px' }}>
        <span style={{
          color: sideColor, background: sideBg,
          border: `1px solid ${sideBorder}`,
          padding: '2px 8px', borderRadius: 4,
          fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em', flexShrink: 0,
        }}>
          {isBuy ? 'BUY' : 'SELL'}
        </span>
        <span style={{
          fontFamily: 'var(--font-syne), sans-serif',
          fontWeight: 700, fontSize: 14,
          color: 'var(--text)',
        }}>
          {swap.tokenSymbol}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {swap.tokenSymbol}/{swap.counterSymbol}
        </span>
      </div>

      {/* MIDDLE: wallet + DEX */}
      <div style={{ flex: 1, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-space-mono), monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {swap.walletAddress
          ? <>{swap.walletAddress.slice(0, 6)}...{swap.walletAddress.slice(-4)}</>
          : '—'
        }
        {swap.source && (
          <span style={{ opacity: 0.5 }}> · {formatDex(swap.source)}</span>
        )}
      </div>

      {/* RIGHT: USD amount + time */}
      <div style={{ textAlign: 'right', flex: '0 0 auto', minWidth: 100 }}>
        <div style={{
          fontFamily: 'var(--font-space-mono), monospace',
          fontWeight: 700, fontSize: 14,
          color: sideColor,
        }}>
          {swap.amountUsd > 0 ? formatUsd(swap.amountUsd) : '—'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
          {timeAgoFromUnix(swap.blockUnixTime)}
        </div>
      </div>
    </div>
  );
}

// ─── Whale Radar components ───────────────────────────────────────────────────

function WhaleCard({ tx }: { tx: WhaleTx }) {
  const isBuy = tx.side === 'buy';
  const sideColor  = isBuy ? '#00ff9d' : '#ff3b6b';
  const sideBg     = isBuy ? 'rgba(0,255,157,0.10)'  : 'rgba(255,59,107,0.10)';
  const sideBorder = isBuy ? 'rgba(0,255,157,0.40)'  : 'rgba(255,59,107,0.40)';
  const cardGlow   = isBuy ? 'rgba(0,255,157,0.13)'  : 'rgba(255,59,107,0.13)';
  const dexLabel   = tx.dex.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const palette = ['#6366f1','#8b5cf6','#0ea5e9','#f59e0b','#10b981','#ef4444','#f97316','#ec4899'];
  const sym = tx.tokenSymbol || '?';
  const idx = (sym.charCodeAt(0) + sym.charCodeAt(sym.length - 1)) % palette.length;

  return (
    <div
      className="token-card"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${sideBorder}`,
        borderRadius: 12,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: `0 0 16px ${cardGlow}`,
      }}
    >
      {/* Top row: icon + symbol + buy/sell badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: palette[idx],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
          fontFamily: 'var(--font-syne), sans-serif',
        }}>
          {sym[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-syne), sans-serif',
              fontWeight: 700, fontSize: 15, color: 'var(--text)',
            }}>
              {sym}
            </span>
            <span style={{
              color: sideColor, background: sideBg, border: `1px solid ${sideBorder}`,
              padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.06em', whiteSpace: 'nowrap', lineHeight: 1.6,
            }}>
              {isBuy ? 'BUY' : 'SELL'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
            {tx.tokenSymbol}/{tx.counterSymbol}
          </div>
        </div>
      </div>

      {/* Large USD amount */}
      <div style={{
        fontSize: 26, fontWeight: 700,
        color: sideColor,
        fontFamily: 'var(--font-space-mono), monospace',
      }}>
        {formatUsd(tx.amountUsd)}
      </div>

      {/* 2x2 data grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 8px' }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 3 }}>DEX</div>
          <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-space-mono), monospace' }}>{dexLabel || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 3 }}>PAIR</div>
          <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-space-mono), monospace' }}>{tx.tokenSymbol}/{tx.counterSymbol}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 3 }}>WALLET</div>
          <a
            href={`https://solscan.io/account/${tx.walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-space-mono), monospace', textDecoration: 'none' }}
            className="birdeye-link"
          >
            {tx.walletAddress.slice(0, 4)}...{tx.walletAddress.slice(-4)}
          </a>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 3 }}>TIME</div>
          <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-space-mono), monospace' }}>{tx.timeAgo}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('trending');
  const [watchedTokens, setWatchedTokens] = useState<DisplayToken[]>([]);
  const [search, setSearch] = useState('');
  const [safetyFilter, setSafetyFilter] = useState<SafetyFilter>('all');
  const [sortField, setSortField] = useState<SortField>('safetyScore');
  const [whaleSortField, setWhaleSortField] = useState<WhaleSortField>('amount');
  const [liveFeedSortField, setLiveFeedSortField] = useState<LiveFeedSortField>('time');
  const [updateTime, setUpdateTime] = useState('');

  const [trendingTokens, setTrendingTokens] = useState<DisplayToken[]>(FALLBACK_TRENDING);
  const [listingTokens, setListingTokens] = useState<DisplayToken[]>(FALLBACK_LISTINGS);
  const [liveSwaps, setLiveSwaps] = useState<LiveSwap[]>([]);
  const [feedPrices, setFeedPrices] = useState<Record<string, { price: number; change24h: number }>>({});
  const [memeTokens, setMemeTokens] = useState<DisplayToken[]>([]);
  const [smartMoneyTokens, setSmartMoneyTokens] = useState<DisplayToken[]>([]);
  const [defiPulseTokens, setDefiPulseTokens] = useState<DisplayToken[]>([]);
  const [smartMoneyLoading, setSmartMoneyLoading] = useState(false);
  const [defiPulseLoading, setDefiPulseLoading] = useState(false);
  const [livefeedLoading, setLivefeedLoading] = useState(false);
  const [livefeedUpdatedAt, setLivefeedUpdatedAt] = useState('');
  const [memeLoading, setMemeLoading] = useState(false);
  const [whaleTxs, setWhaleTxs] = useState<WhaleTx[]>([]);
  const [whaleLoading, setWhaleLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [apiCallCount, setApiCallCount] = useState(0);
  const apiCallRef = useRef(0);
  const hasFetchedRef = useRef(false);
  const loadedTabsRef = useRef<Set<Tab>>(new Set());
  const sparklinedTabsRef = useRef<Set<Tab>>(new Set());
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [overviewAddress, setOverviewAddress] = useState<string | null>(null);

  function bumpApiCount(n = 1) {
    apiCallRef.current += n;
    setApiCallCount(apiCallRef.current);
  }

  const fetchTrending = useCallback(async () => {
    setTrendingLoading(true);
    const now = new Date();
    setUpdateTime(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`);
    try {
      bumpApiCount(1);
      const result = await getTrending(20);
      const mapped = result.map(t => {
        const score = computeProxyScore(t.liquidity, t.marketcap, t.priceChange24hPercent, t.volume24hUSD);
        return {
          symbol: t.symbol || '???',
          name: t.name || t.symbol || '???',
          address: t.address,
          price: t.price,
          change24h: t.priceChange24hPercent,
          mcap: t.marketcap,
          safety: mapSecurityToSafety(score),
          safetyScore: score,
          holders: 0,
          age: '',
          volume24h: t.volume24hUSD,
          liquidity: t.liquidity,
          rank: t.rank,
        };
      });
      setTrendingTokens(mapped.length > 0 ? mapped : FALLBACK_TRENDING);
    } catch {
      console.error('getTrending failed, using fallback');
      setTrendingTokens(FALLBACK_TRENDING);
    }
    setTrendingLoading(false);
  }, []);

  const fetchListings = useCallback(async () => {
    setListingsLoading(true);
    try {
      bumpApiCount(1);
      const result = await getNewListings(20);
      setListingTokens(result.map(t => {
        const score = computeProxyScore(t.liquidity, t.marketcap, t.priceChange24hPercent, t.volume24hUSD);
        return {
          symbol: t.symbol || '???',
          name: t.name || t.symbol || '???',
          address: t.address,
          price: t.price,
          change24h: t.priceChange24hPercent,
          mcap: t.marketcap,
          safety: mapSecurityToSafety(score),
          safetyScore: score,
          holders: 0,
          age: tokenAge(t.lastTradeUnixTime),
          volume24h: t.volume24hUSD,
          liquidity: t.liquidity,
        };
      }));
    } catch {
      console.error('getNewListings failed, using fallback');
      setListingTokens(FALLBACK_LISTINGS);
    }
    setListingsLoading(false);
  }, []);

  const fetchWhales = useCallback(async () => {
    setWhaleLoading(true);
    bumpApiCount(10); // 10 tokens × 1 call each
    try {
      const res = await fetch('/api/whales');
      if (res.ok) {
        const json = await res.json();
        const whales = json.whales ?? [];
        setWhaleTxs(whales.length > 0 ? whales : FALLBACK_WHALE_TXS);
      } else {
        setWhaleTxs(FALLBACK_WHALE_TXS);
      }
    } catch {
      setWhaleTxs(FALLBACK_WHALE_TXS);
    }
    setWhaleLoading(false);
  }, []);

  const fetchLivefeed = useCallback(async () => {
    setLivefeedLoading(true);
    bumpApiCount(10); // 10 tokens × 1 call each
    try {
      const res = await fetch('/api/livefeed');
      if (res.ok) {
        const json = await res.json();
        const swaps: LiveSwap[] = (json?.swaps ?? []).map((s: Record<string, unknown>) => ({
          txHash:        String(s.txHash ?? ''),
          blockUnixTime: Number(s.blockUnixTime ?? 0),
          side:          String(s.side ?? 'buy'),
          amountUsd:     Number(s.amountUsd ?? 0),
          tokenSymbol:   String(s.tokenSymbol ?? ''),
          tokenAddress:  String(s.tokenAddress ?? ''),
          counterSymbol: String(s.counterSymbol ?? 'SOL'),
          walletAddress: String(s.walletAddress ?? ''),
          source:        String(s.source ?? ''),
        }));
        const liveFeedData = swaps.length > 0 ? swaps : FALLBACK_LIVE_SWAPS;
        setLiveSwaps(liveFeedData);
        const now = new Date();
        setLivefeedUpdatedAt(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`);

        // Fetch prices for unique token addresses in the feed
        const uniqueAddresses = [...new Set(
          swaps
            .map(s => s.tokenAddress)
            .filter(a => a && a.length > 10)
        )].slice(0, 10);
        if (uniqueAddresses.length > 0) {
          try {
            const priceRes = await fetch(`/api/token-info?addresses=${uniqueAddresses.join(',')}`);
            if (priceRes.ok) {
              const priceJson = await priceRes.json();
              setFeedPrices(priceJson.data ?? {});
            }
          } catch {}
        }
      } else {
        setLiveSwaps(FALLBACK_LIVE_SWAPS);
      }
    } catch {
      setLiveSwaps(FALLBACK_LIVE_SWAPS);
    }
    setLivefeedLoading(false);
  }, []);

  const fetchMemes = useCallback(async () => {
    setMemeLoading(true);
    bumpApiCount(1);
    try {
      const res = await fetch('/api/memes');
      if (res.ok) {
        const json = await res.json();
        const items: Record<string, unknown>[] = json?.data?.tokens ?? [];
        const mapped = items.map((t) => {
          const score = computeProxyScore(
            Number(t.liquidity ?? 0),
            Number(t.marketcap ?? 0),
            Number(t.priceChange24hPercent ?? 0),
            Number(t.volume24hUSD ?? 0),
          );
          return {
            symbol: String(t.symbol || '???'),
            name: String(t.name || t.symbol || '???'),
            address: String(t.address ?? ''),
            price: Number(t.price ?? 0),
            change24h: Number(t.priceChange24hPercent ?? 0),
            mcap: Number(t.marketcap ?? 0),
            safety: mapSecurityToSafety(score),
            safetyScore: score,
            holders: 0,
            age: '',
            volume24h: Number(t.volume24hUSD ?? 0),
            liquidity: Number(t.liquidity ?? 0),
          };
        });
        setMemeTokens(mapped.length > 0 ? mapped : FALLBACK_MEMES);
      } else {
        setMemeTokens(FALLBACK_MEMES);
      }
    } catch {
      setMemeTokens(FALLBACK_MEMES);
    }
    setMemeLoading(false);
  }, []);

  const fetchSmartMoney = useCallback(async () => {
    setSmartMoneyLoading(true);
    bumpApiCount(1);
    try {
      const res = await fetch('/api/smartmoney');
      if (res.ok) {
        const json = await res.json();
        const items: Record<string, unknown>[] = json?.data?.tokens ?? [];
        const mapped = items.map((t) => {
          const score = computeProxyScore(
            Number(t.liquidity ?? 0),
            Number(t.marketcap ?? 0),
            Number(t.priceChange24hPercent ?? 0),
            Number(t.volume24hUSD ?? 0),
          );
          return {
            symbol:      String(t.symbol || '???'),
            name:        String(t.name || t.symbol || '???'),
            address:     String(t.address ?? ''),
            price:       Number(t.price ?? 0),
            change24h:   Number(t.priceChange24hPercent ?? 0),
            mcap:        Number(t.marketcap ?? 0),
            safety:      mapSecurityToSafety(score),
            safetyScore: score,
            holders:     0,
            age:         '',
            volume24h:   Number(t.volume24hUSD ?? 0),
            liquidity:   Number(t.liquidity ?? 0),
          };
        });
        setSmartMoneyTokens(mapped.length > 0 ? mapped : FALLBACK_SMART_MONEY);
      } else {
        setSmartMoneyTokens(FALLBACK_SMART_MONEY);
      }
    } catch {
      setSmartMoneyTokens(FALLBACK_SMART_MONEY);
    }
    setSmartMoneyLoading(false);
  }, []);

  const fetchDefiPulse = useCallback(async () => {
    setDefiPulseLoading(true);
    bumpApiCount(1);
    try {
      const res = await fetch('/api/defipulse');
      if (res.ok) {
        const json = await res.json();
        const items: Record<string, unknown>[] = json?.data?.tokens ?? [];
        const mapped = items.map((t) => {
          const score = computeProxyScore(
            Number(t.liquidity ?? 0),
            Number(t.marketcap ?? 0),
            Number(t.priceChange24hPercent ?? 0),
            Number(t.volume24hUSD ?? 0),
          );
          return {
            symbol:      String(t.symbol || '???'),
            name:        String(t.name || t.symbol || '???'),
            address:     String(t.address ?? ''),
            price:       Number(t.price ?? 0),
            change24h:   Number(t.priceChange24hPercent ?? 0),
            mcap:        Number(t.marketcap ?? 0),
            safety:      mapSecurityToSafety(score),
            safetyScore: score,
            holders:     0,
            age:         '',
            volume24h:   Number(t.volume24hUSD ?? 0),
            liquidity:   Number(t.liquidity ?? 0),
          };
        });
        setDefiPulseTokens(mapped.length > 0 ? mapped : FALLBACK_DEFI_PULSE);
      } else {
        setDefiPulseTokens(FALLBACK_DEFI_PULSE);
      }
    } catch {
      setDefiPulseTokens(FALLBACK_DEFI_PULSE);
    }
    setDefiPulseLoading(false);
  }, []);

  const fetchSparklines = useCallback(async (tokens: DisplayToken[]) => {
    const addresses = tokens.map(t => t.address).filter(Boolean).slice(0, 5);
    if (addresses.length === 0) return;
    bumpApiCount(addresses.length); // 1 call per address
    try {
      const res = await fetch(`/api/price-history?addresses=${addresses.join(',')}`);
      if (res.ok) {
        const json = await res.json();
        setSparklines(prev => ({ ...prev, ...(json.data ?? {}) }));
      }
    } catch {}
  }, []);

  const handleTabClick = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (loadedTabsRef.current.has(tab)) return;
    loadedTabsRef.current.add(tab);
    if (tab === 'listings')    fetchListings();
    if (tab === 'livefeed')    fetchLivefeed();
    if (tab === 'whalerader')  fetchWhales();
    if (tab === 'mememonitor') fetchMemes();
    if (tab === 'smartmoney')  fetchSmartMoney();
    if (tab === 'defipulse')   fetchDefiPulse();
  }, [fetchListings, fetchLivefeed, fetchWhales, fetchMemes, fetchSmartMoney, fetchDefiPulse]);

  const refreshCurrentTab = useCallback((tab: Tab) => {
    if (tab === 'trending')    fetchTrending();
    if (tab === 'listings')    fetchListings();
    if (tab === 'livefeed')    fetchLivefeed();
    if (tab === 'whalerader')  fetchWhales();
    if (tab === 'mememonitor') fetchMemes();
    if (tab === 'smartmoney')  fetchSmartMoney();
    if (tab === 'defipulse')   fetchDefiPulse();
  }, [fetchTrending, fetchListings, fetchLivefeed, fetchWhales, fetchMemes, fetchSmartMoney, fetchDefiPulse]);

  useEffect(() => {
    // Load watchlist (full token objects) from localStorage
    const loadWatchlist = () => {
      try {
        const stored = localStorage.getItem('birdeye-watchlist');
        if (stored) setWatchedTokens(JSON.parse(stored));
      } catch {}
    };
    loadWatchlist();

    // Sync watchlist when another tab/window changes it
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'birdeye-watchlist') loadWatchlist();
    };
    window.addEventListener('storage', onStorage);

    const now = new Date();
    setUpdateTime(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`);

    // Guard against React StrictMode double-invoke
    if (hasFetchedRef.current) return () => window.removeEventListener('storage', onStorage);
    hasFetchedRef.current = true;

    // On mount: only fetch Trending (lazy load all other tabs on click)
    loadedTabsRef.current.add('trending');
    fetchTrending();

    return () => window.removeEventListener('storage', onStorage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch sparklines for current tab's tokens — once per tab, max 5 calls.
  // Runs when any token list updates; we guard with sparklinedTabsRef.
  useEffect(() => {
    if (sparklinedTabsRef.current.has(activeTab)) return;
    let tokens: DisplayToken[] = [];
    if (activeTab === 'trending')    tokens = trendingTokens;
    if (activeTab === 'listings')    tokens = listingTokens;
    if (activeTab === 'mememonitor') tokens = memeTokens;
    if (activeTab === 'smartmoney')  tokens = smartMoneyTokens;
    if (activeTab === 'defipulse')   tokens = defiPulseTokens;
    if (activeTab === 'watchlist')   tokens = watchedTokens;
    const real = tokens.filter(t => t.address && t.address.length >= 32).slice(0, 5);
    if (real.length === 0) return;
    sparklinedTabsRef.current.add(activeTab);
    fetchSparklines(real);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, trendingTokens, listingTokens, memeTokens, smartMoneyTokens, defiPulseTokens, watchedTokens]);

  // Reset filters on tab switch
  useEffect(() => {
    setSearch('');
    setSafetyFilter('all');
  }, [activeTab]);

  function toggleWatchlist(token: DisplayToken) {
    setWatchedTokens(prev => {
      const isWatched = prev.some(t => t.address === token.address);
      const next = isWatched
        ? prev.filter(t => t.address !== token.address)
        : [...prev, token];
      try { localStorage.setItem('birdeye-watchlist', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // Starred addresses set — used for O(1) "is this token starred?" checks
  const watchlistAddresses = useMemo(
    () => new Set(watchedTokens.map(t => t.address)),
    [watchedTokens],
  );

  const allKnown = useMemo(() => {
    const map = new Map<string, DisplayToken>();
    [...listingTokens, ...trendingTokens].forEach(t => map.set(t.address, t));
    return Array.from(map.values());
  }, [listingTokens, trendingTokens]);

  const baseTokens: DisplayToken[] = useMemo(() => {
    if (activeTab === 'listings')    return listingTokens;
    if (activeTab === 'trending')    return trendingTokens;
    if (activeTab === 'mememonitor') return memeTokens;
    if (activeTab === 'smartmoney')  return smartMoneyTokens;
    if (activeTab === 'defipulse')   return defiPulseTokens;
    if (activeTab === 'watchlist')   return watchedTokens;
    return [];
  }, [activeTab, listingTokens, trendingTokens, memeTokens, smartMoneyTokens, defiPulseTokens, watchedTokens]);

  const safeCount    = useMemo(() => baseTokens.filter(t => t.safety === 'safe').length, [baseTokens]);
  const cautionCount = useMemo(() => baseTokens.filter(t => t.safety === 'warn').length, [baseTokens]);
  const riskyCount   = useMemo(() => baseTokens.filter(t => t.safety === 'rug').length,  [baseTokens]);

  // Global counts across every loaded token list — for the header legend
  const globalSafety = useMemo(() => {
    const all = [...trendingTokens, ...listingTokens, ...memeTokens, ...smartMoneyTokens, ...defiPulseTokens];
    return {
      safe:    all.filter(t => t.safety === 'safe').length,
      caution: all.filter(t => t.safety === 'warn').length,
      risky:   all.filter(t => t.safety === 'rug').length,
    };
  }, [trendingTokens, listingTokens, memeTokens, smartMoneyTokens, defiPulseTokens]);

  const filteredTokens = useMemo(() => {
    return baseTokens
      .filter(t => {
        const q = search.trim().toLowerCase();
        if (q && !t.symbol.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q) && !t.address.toLowerCase().includes(q)) return false;
        if (safetyFilter === 'safe'    && t.safety !== 'safe') return false;
        if (safetyFilter === 'caution' && t.safety !== 'warn') return false;
        if (safetyFilter === 'risky'   && t.safety !== 'rug')  return false;
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'safetyScore') return b.safetyScore - a.safetyScore;
        if (sortField === 'mcap')        return b.mcap - a.mcap;
        return b.volume24h - a.volume24h;
      });
  }, [baseTokens, search, safetyFilter, sortField]);

  // Live feed filtering
  const liveFeedBuyCount  = useMemo(() => liveSwaps.filter(s => s.side === 'buy').length,  [liveSwaps]);
  const liveFeedSellCount = useMemo(() => liveSwaps.filter(s => s.side !== 'buy').length, [liveSwaps]);

  const filteredLiveSwaps = useMemo(() => {
    return liveSwaps
      .filter(s => {
        const q = search.trim().toLowerCase();
        if (q && !s.tokenSymbol.toLowerCase().includes(q) && !s.walletAddress.toLowerCase().includes(q)) return false;
        if (safetyFilter === 'safe'    && s.side !== 'buy') return false;
        if (safetyFilter === 'caution' && s.side === 'buy') return false;
        return true;
      })
      .sort((a, b) => {
        if (liveFeedSortField === 'amount') return b.amountUsd - a.amountUsd;
        if (liveFeedSortField === 'token')  return a.tokenSymbol.localeCompare(b.tokenSymbol);
        return b.blockUnixTime - a.blockUnixTime; // 'time'
      });
  }, [liveSwaps, search, safetyFilter, liveFeedSortField]);

  // Top 6 unique tokens in the feed — built from swap data + feedPrices only
  const feedTokenCards = useMemo((): DisplayToken[] => {
    const seen = new Set<string>();
    const unique: LiveSwap[] = [];
    for (const s of liveSwaps) {
      if (s.tokenSymbol && s.tokenSymbol !== 'SOL' && s.tokenSymbol !== '???' && !seen.has(s.tokenSymbol)) {
        seen.add(s.tokenSymbol);
        unique.push(s);
        if (unique.length >= 6) break;
      }
    }
    return unique.map(s => {
      const priceData = feedPrices[s.tokenAddress];
      const score = priceData ? 40 : 30;
      return {
        symbol:      s.tokenSymbol,
        name:        s.tokenSymbol,
        address:     s.tokenAddress || s.tokenSymbol,
        price:       priceData?.price ?? 0,
        change24h:   priceData?.change24h ?? 0,
        mcap:        0,
        safety:      mapSecurityToSafety(score) as Safety,
        safetyScore: score,
        holders:     0,
        age:         '',
        volume24h:   0,
      };
    });
  }, [liveSwaps, feedPrices]);

  // Whale radar filtering
  const whaleSafeCount    = useMemo(() => whaleTxs.filter(t => t.side === 'buy').length,  [whaleTxs]);
  const whaleCautionCount = useMemo(() => whaleTxs.filter(t => t.side !== 'buy').length,  [whaleTxs]);

  const filteredWhaleTxs = useMemo(() => {
    return whaleTxs
      .filter(tx => {
        const q = search.trim().toLowerCase();
        if (q && !tx.tokenSymbol.toLowerCase().includes(q) && !tx.walletAddress.toLowerCase().includes(q)) return false;
        if (safetyFilter === 'safe'    && tx.side !== 'buy') return false;
        if (safetyFilter === 'caution' && tx.side === 'buy') return false;
        if (safetyFilter === 'risky')  return false; // no rug-risk concept for whales
        return true;
      })
      .sort((a, b) => {
        if (whaleSortField === 'amount') return b.amountUsd - a.amountUsd;
        if (whaleSortField === 'token')  return a.tokenSymbol.localeCompare(b.tokenSymbol);
        return 0; // 'time' — already sorted by server
      });
  }, [whaleTxs, search, safetyFilter, whaleSortField]);

  const isPlaceholderTab = activeTab in PLACEHOLDER_TABS;
  const TOKEN_GRID_TABS: Tab[] = ['trending', 'listings', 'mememonitor', 'smartmoney', 'defipulse', 'watchlist'];
  const showGrid  = TOKEN_GRID_TABS.includes(activeTab) && !isPlaceholderTab;
  const showEmpty = activeTab === 'watchlist' && baseTokens.length === 0;
  const isTabLoading =
    (activeTab === 'trending'    && trendingLoading) ||
    (activeTab === 'listings'    && listingsLoading) ||
    (activeTab === 'livefeed'    && livefeedLoading) ||
    (activeTab === 'whalerader'  && whaleLoading) ||
    (activeTab === 'mememonitor' && memeLoading) ||
    (activeTab === 'smartmoney'  && smartMoneyLoading) ||
    (activeTab === 'defipulse'   && defiPulseLoading);

  return (
    <>
      <style>{`
        :root {
          --bg: #04060a;
          --surface: #090d12;
          --accent: #00ff9d;
          --accent2: #ff3b6b;
          --text: #e8edf2;
          --muted: #5a6a7a;
        }

        * { box-sizing: border-box; }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .live-dot { animation: pulse-dot 1.5s ease-in-out infinite; }

        .token-card { transition: border-color 0.15s, box-shadow 0.15s; }
        .token-card:hover {
          filter: brightness(1.06);
        }

        .star-btn { transition: color 0.15s; }
        .star-btn:hover { color: #f5c518 !important; }

        .filter-btn { transition: background 0.12s, border-color 0.12s, color 0.12s; }
        .sort-btn   { transition: background 0.12s, border-color 0.12s, color 0.12s; }

        .birdeye-link:hover { color: var(--accent) !important; opacity: 1 !important; }

        input[type="text"]:focus { outline: none; border-color: rgba(99,102,241,0.6) !important; }

        .tab-nav-scroll {
          overflow-x: auto;
          scrollbar-width: none;
        }
        .tab-nav-scroll::-webkit-scrollbar { display: none; }

        .live-feed-row:hover { background: rgba(255,255,255,0.04) !important; }

        @media (max-width: 900px) {
          .token-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .token-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(ellipse at top left, rgba(0,255,157,0.05) 0%, transparent 50%), ' +
            'radial-gradient(ellipse at bottom right, rgba(99,102,241,0.07) 0%, transparent 50%), ' +
            'var(--bg)',
          color: 'var(--text)',
          fontFamily: 'var(--font-space-mono), monospace',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={{
          background: 'var(--surface)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 24px' }}>
            {/* Row 1: title + meta */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-syne), sans-serif',
                  fontWeight: 700, fontSize: 20,
                  color: 'var(--accent)',
                  letterSpacing: '-0.01em',
                }}>
                  Birdeye Token Radar
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, letterSpacing: '0.04em' }}>
                  Powered by Birdeye API · Solana
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 6,
                  background: 'rgba(99,102,241,0.10)',
                  border: '1px solid rgba(99,102,241,0.25)',
                }}>
                  <span className="live-dot inline-block" style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#6366f1',
                  }} />
                  <span style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 700 }}>{apiCallCount} API calls</span>
                </div>

                {updateTime && (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Updated {updateTime}
                  </span>
                )}

                <button
                  onClick={() => refreshCurrentTab(activeTab)}
                  disabled={isTabLoading}
                  style={{
                    padding: '5px 12px', borderRadius: 6, cursor: isTabLoading ? 'not-allowed' : 'pointer',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: isTabLoading ? 'var(--muted)' : 'var(--text)', fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.04em',
                    fontFamily: 'var(--font-space-mono), monospace',
                  }}
                >
                  {isTabLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Row 2: safety legend — live counts across all loaded tokens */}
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              {[
                { dot: '#00ff9d', glow: '#00ff9d', label: 'Safe',    count: globalSafety.safe    },
                { dot: '#f5a623', glow: '#f5a623', label: 'Caution', count: globalSafety.caution },
                { dot: '#ff3b6b', glow: '#ff3b6b', label: 'Risky',   count: globalSafety.risky   },
              ].map(({ dot, glow, label, count }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: dot,
                    display: 'inline-block',
                    boxShadow: `0 0 8px ${glow}`,
                  }} />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label} ({count})</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ── Tab Navigation ──────────────────────────────────────────────── */}
        <nav style={{
          background: 'var(--surface)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div className="tab-nav-scroll" style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ padding: '12px 24px', display: 'flex', gap: 8, width: 'max-content', minWidth: '100%' }}>
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    style={{
                      padding: '7px 18px', borderRadius: 8, cursor: 'pointer',
                      fontSize: 13, fontWeight: 700,
                      fontFamily: 'var(--font-syne), sans-serif',
                      letterSpacing: '0.01em',
                      whiteSpace: 'nowrap',
                      background: isActive ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.03)',
                      border: isActive
                        ? '1px solid rgba(99,102,241,0.55)'
                        : '1px solid rgba(255,255,255,0.09)',
                      color: isActive ? '#a5b4fc' : 'var(--muted)',
                      transition: 'all 0.12s',
                    }}
                  >
                    {tab.id === 'livefeed' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="live-dot" style={{
                          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                          background: '#00ff9d', boxShadow: '0 0 6px #00ff9d',
                        }} />
                        {tab.label}
                      </span>
                    ) : tab.label}
                    {tab.id === 'watchlist' && watchedTokens.length > 0 && (
                      <span style={{
                        marginLeft: 6, fontSize: 10, fontWeight: 700,
                        background: 'rgba(99,102,241,0.35)',
                        color: '#a5b4fc', padding: '1px 5px', borderRadius: 10,
                      }}>
                        {watchedTokens.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>

          {/* ── Live Feed tab ─────────────────────────────────────────────── */}
          {activeTab === 'livefeed' && (
            <>
              {/* Tab header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="live-dot" style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: '#00ff9d', boxShadow: '0 0 8px #00ff9d', flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                      Live Feed
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      Real-time swaps — BONK · WIF · POPCAT · JUP · SOL — refreshes every 15s
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {livefeedUpdatedAt && (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Last updated: {livefeedUpdatedAt}
                    </span>
                  )}
                  <button
                    onClick={fetchLivefeed}
                    disabled={livefeedLoading}
                    style={{
                      padding: '5px 12px', borderRadius: 6, cursor: livefeedLoading ? 'not-allowed' : 'pointer',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: livefeedLoading ? 'var(--muted)' : 'var(--text)', fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.04em',
                      fontFamily: 'var(--font-space-mono), monospace',
                    }}
                  >
                    {livefeedLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>

              {/* Filter bar */}
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Filter by token or wallet..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 14px',
                    borderRadius: 8, marginBottom: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'var(--text)', fontSize: 13,
                    fontFamily: 'var(--font-space-mono), monospace',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  {/* Buy/Sell filter */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {([
                      { id: 'all',     label: 'All',  count: liveSwaps.length },
                      { id: 'safe',    label: 'Buy',  count: liveFeedBuyCount },
                      { id: 'caution', label: 'Sell', count: liveFeedSellCount },
                    ] as { id: SafetyFilter; label: string; count: number }[]).map(({ id, label, count }) => {
                      const isActive = safetyFilter === id;
                      return (
                        <button key={id} onClick={() => setSafetyFilter(id)} className="filter-btn" style={{
                          padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                          fontSize: 12, fontWeight: 700,
                          fontFamily: 'var(--font-space-mono), monospace',
                          background: isActive ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.03)',
                          border: isActive ? '1px solid rgba(99,102,241,0.55)' : '1px solid rgba(255,255,255,0.09)',
                          color: isActive ? '#a5b4fc' : 'var(--muted)',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          {label}
                          <span style={{
                            fontSize: 10, padding: '1px 5px', borderRadius: 8,
                            background: isActive ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)',
                            color: isActive ? '#c7d2fe' : 'var(--muted)',
                          }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Sort */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', marginRight: 4 }}>SORT</span>
                    {([
                      { id: 'time',   label: 'Time'   },
                      { id: 'amount', label: 'Amount' },
                      { id: 'token',  label: 'Token'  },
                    ] as { id: LiveFeedSortField; label: string }[]).map(({ id, label }) => {
                      const isActive = liveFeedSortField === id;
                      return (
                        <button key={id} onClick={() => setLiveFeedSortField(id)} className="sort-btn" style={{
                          padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                          fontSize: 11, fontWeight: 700,
                          fontFamily: 'var(--font-space-mono), monospace',
                          background: isActive ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                          border: isActive ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(255,255,255,0.08)',
                          color: isActive ? '#a5b4fc' : 'var(--muted)',
                        }}>{label}</button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Market Overview bar */}
              {liveSwaps.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                    Market Overview
                  </span>
                  <div style={{
                    flex: 1, height: 6, borderRadius: 3, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.05)', display: 'flex',
                  }}>
                    <div style={{ width: `${(liveFeedBuyCount / liveSwaps.length) * 100}%`, background: '#00ff9d', transition: 'width 0.4s' }} />
                    <div style={{ width: `${(liveFeedSellCount / liveSwaps.length) * 100}%`, background: '#ff3b6b', transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#00ff9d' }}>{liveFeedBuyCount} buy</span>
                    <span style={{ color: 'var(--muted)' }}> · </span>
                    <span style={{ color: '#ff3b6b' }}>{liveFeedSellCount} sell</span>
                  </span>
                </div>
              )}

              {/* Ticker table */}
              {livefeedLoading && liveSwaps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--muted)', fontSize: 13 }}>
                  Fetching live swaps...
                </div>
              ) : liveSwaps.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '64px 0', color: 'var(--muted)', fontSize: 13,
                  border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 10,
                }}>
                  No recent swaps found.
                </div>
              ) : (
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  opacity: livefeedLoading ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                  marginBottom: 32,
                }}>
                  {/* Column headers */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    padding: '8px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(255,255,255,0.03)',
                  }}>
                    <span style={{ flex: '0 0 220px', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Token / Pair</span>
                    <span style={{ flex: 1, fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Wallet / DEX</span>
                    <span style={{ flex: '0 0 100px', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'right' }}>Amount / Time</span>
                  </div>
                  {filteredLiveSwaps.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      No swaps match your filters.
                    </div>
                  ) : filteredLiveSwaps.map((swap, i) => (
                    <div key={swap.txHash + i} className="live-feed-row">
                      <LiveFeedRow swap={swap} index={i} />
                    </div>
                  ))}
                </div>
              )}

              {/* Top Tokens in Feed */}
              {feedTokenCards.length > 0 && (
                <>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--muted)',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    marginBottom: 14,
                    fontFamily: 'var(--font-syne), sans-serif',
                  }}>
                    Top Tokens in Feed
                  </div>
                  <div
                    className="token-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 16,
                    }}
                  >
                    {feedTokenCards.map(token => (
                      <TokenCard
                        key={token.address}
                        token={token}
                        starred={watchlistAddresses.has(token.address)}
                        onToggleStar={() => toggleWatchlist(token)}
                        sparklinePrices={sparklines[token.address]}
                        onClickOverview={() => setOverviewAddress(token.address)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Whale Radar tab ───────────────────────────────────────────── */}
          {activeTab === 'whalerader' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                    Whale Radar
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                    Large swaps on SOL, USDC and mSOL — min $5K — refreshes every 30s
                  </div>
                </div>
                <button
                  onClick={fetchWhales}
                  disabled={whaleLoading}
                  style={{
                    padding: '5px 12px', borderRadius: 6, cursor: whaleLoading ? 'not-allowed' : 'pointer',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: whaleLoading ? 'var(--muted)' : 'var(--text)', fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.04em',
                    fontFamily: 'var(--font-space-mono), monospace',
                  }}
                >
                  {whaleLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {/* Filter Bar */}
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Filter by token symbol or wallet address..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 14px',
                    borderRadius: 8, marginBottom: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'var(--text)', fontSize: 13,
                    fontFamily: 'var(--font-space-mono), monospace',
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  {/* Safety filter buttons */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {([
                      { id: 'all',     label: 'All',     count: whaleTxs.length },
                      { id: 'safe',    label: 'Buy',     count: whaleSafeCount },
                      { id: 'caution', label: 'Sell',    count: whaleCautionCount },
                    ] as { id: SafetyFilter; label: string; count: number }[]).map(({ id, label, count }) => {
                      const isActive = safetyFilter === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setSafetyFilter(id)}
                          className="filter-btn"
                          style={{
                            padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                            fontSize: 12, fontWeight: 700,
                            fontFamily: 'var(--font-space-mono), monospace',
                            background: isActive ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.03)',
                            border: isActive
                              ? '1px solid rgba(99,102,241,0.55)'
                              : '1px solid rgba(255,255,255,0.09)',
                            color: isActive ? '#a5b4fc' : 'var(--muted)',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          {label}
                          <span style={{
                            fontSize: 10, padding: '1px 5px', borderRadius: 8,
                            background: isActive ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)',
                            color: isActive ? '#c7d2fe' : 'var(--muted)',
                          }}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sort buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', marginRight: 4 }}>SORT</span>
                    {([
                      { id: 'amount', label: 'Amount' },
                      { id: 'time',   label: 'Time'   },
                      { id: 'token',  label: 'Token'  },
                    ] as { id: WhaleSortField; label: string }[]).map(({ id, label }) => {
                      const isActive = whaleSortField === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setWhaleSortField(id)}
                          className="sort-btn"
                          style={{
                            padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                            fontSize: 11, fontWeight: 700,
                            fontFamily: 'var(--font-space-mono), monospace',
                            background: isActive ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                            border: isActive
                              ? '1px solid rgba(99,102,241,0.45)'
                              : '1px solid rgba(255,255,255,0.08)',
                            color: isActive ? '#a5b4fc' : 'var(--muted)',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Market Overview Bar (buy=safe, sell=caution) */}
              {whaleTxs.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                    Market Overview
                  </span>
                  <div style={{
                    flex: 1, height: 6, borderRadius: 3,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                  }}>
                    <div style={{ width: `${(whaleSafeCount / whaleTxs.length) * 100}%`, background: '#00ff9d', transition: 'width 0.4s' }} />
                    <div style={{ width: `${(whaleCautionCount / whaleTxs.length) * 100}%`, background: '#f5a623', transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#00ff9d' }}>{whaleSafeCount} buy</span>
                    <span style={{ color: 'var(--muted)' }}> · </span>
                    <span style={{ color: '#f5a623' }}>{whaleCautionCount} sell</span>
                  </span>
                </div>
              )}

              {whaleLoading && filteredWhaleTxs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--muted)', fontSize: 13 }}>
                  Loading whale transactions...
                </div>
              ) : filteredWhaleTxs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--muted)', fontSize: 13,
                  border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 10 }}>
                  {whaleTxs.length === 0 ? 'No whale transactions found.' : 'No transactions match your filters.'}
                </div>
              ) : (
                <div
                  className="token-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                    opacity: whaleLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {filteredWhaleTxs.map((tx, i) => (
                    <WhaleCard key={tx.txHash + i} tx={tx} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Coming-soon placeholder tabs */}
          {isPlaceholderTab && (
            <Placeholder
              title={`${PLACEHOLDER_TABS[activeTab]} — coming soon`}
              description="Real-time data via Birdeye API."
            />
          )}

          {activeTab === 'watchlist' && showEmpty && (
            <Placeholder title="Watchlist Empty" description="Star a token to track it here." />
          )}

          {showGrid && !showEmpty && (
            <>
              {/* Filter Bar */}
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Filter by name, symbol or address..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 14px',
                    borderRadius: 8, marginBottom: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'var(--text)', fontSize: 13,
                    fontFamily: 'var(--font-space-mono), monospace',
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {([
                      { id: 'all',     label: 'All',     count: baseTokens.length },
                      { id: 'safe',    label: 'Safe',    count: safeCount },
                      { id: 'caution', label: 'Caution', count: cautionCount },
                      { id: 'risky',   label: 'Risky',   count: riskyCount },
                    ] as { id: SafetyFilter; label: string; count: number }[]).map(({ id, label, count }) => {
                      const isActive = safetyFilter === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setSafetyFilter(id)}
                          className="filter-btn"
                          style={{
                            padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                            fontSize: 12, fontWeight: 700,
                            fontFamily: 'var(--font-space-mono), monospace',
                            background: isActive ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.03)',
                            border: isActive
                              ? '1px solid rgba(99,102,241,0.55)'
                              : '1px solid rgba(255,255,255,0.09)',
                            color: isActive ? '#a5b4fc' : 'var(--muted)',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          {label}
                          <span style={{
                            fontSize: 10, padding: '1px 5px', borderRadius: 8,
                            background: isActive ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)',
                            color: isActive ? '#c7d2fe' : 'var(--muted)',
                          }}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', marginRight: 4 }}>SORT</span>
                    {([
                      { id: 'safetyScore', label: 'Safety Score' },
                      { id: 'mcap',        label: 'Market Cap' },
                      { id: 'volume24h',   label: 'Volume' },
                    ] as { id: SortField; label: string }[]).map(({ id, label }) => {
                      const isActive = sortField === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setSortField(id)}
                          className="sort-btn"
                          style={{
                            padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                            fontSize: 11, fontWeight: 700,
                            fontFamily: 'var(--font-space-mono), monospace',
                            background: isActive ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                            border: isActive
                              ? '1px solid rgba(99,102,241,0.45)'
                              : '1px solid rgba(255,255,255,0.08)',
                            color: isActive ? '#a5b4fc' : 'var(--muted)',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Market Overview Bar */}
              <MarketOverviewBar tokens={baseTokens} />

              {/* Token Grid */}
              {isTabLoading && baseTokens.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '64px 0',
                  color: 'var(--muted)', fontSize: 13,
                }}>
                  Loading...
                </div>
              ) : filteredTokens.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '48px 0',
                  color: 'var(--muted)', fontSize: 13,
                  border: '1px dashed rgba(255,255,255,0.08)',
                  borderRadius: 10,
                }}>
                  No tokens match your filters.
                </div>
              ) : (
                <div
                  className="token-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                    opacity: isTabLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {filteredTokens.map(token => (
                    <TokenCard
                      key={token.address}
                      token={token}
                      starred={watchlistAddresses.has(token.address)}
                      onToggleStar={() => toggleWatchlist(token)}
                      sparklinePrices={sparklines[token.address]}
                      onClickOverview={() => setOverviewAddress(token.address)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {overviewAddress && (
        <TokenOverviewModal
          address={overviewAddress}
          onClose={() => setOverviewAddress(null)}
        />
      )}
    </>
  );
}
