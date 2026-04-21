'use client';

import { useState, useEffect } from 'react';

type Tab = 'listings' | 'trending' | 'whales' | 'watchlist';
type Safety = 'safe' | 'warn' | 'rug';

interface Token {
  symbol: string;
  name: string;
  address: string;
  price: number;
  change24h: number;
  mcap: number;
  safety: Safety;
  holders: number;
  age: string;
}

const MOCK_TOKENS: Token[] = [
  { symbol: 'BONKAI', name: 'Bonkai', address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsk', price: 0.000042, change24h: 340, mcap: 420000, safety: 'safe', holders: 1240, age: '2h ago' },
  { symbol: 'PEPE2', name: 'PepeSol', address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', price: 0.0000091, change24h: 88, mcap: 180000, safety: 'warn', holders: 430, age: '5h ago' },
  { symbol: 'RUGBAIT', name: 'RugBait', address: 'So11111111111111111111111111111111111111112', price: 0.0000001, change24h: 2100, mcap: 9000, safety: 'rug', holders: 12, age: '1h ago' },
  { symbol: 'WIFM', name: 'WifMoon', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', price: 0.00089, change24h: 55, mcap: 890000, safety: 'safe', holders: 3200, age: '8h ago' },
  { symbol: 'MGDOG', name: 'MegaDog', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', price: 0.00012, change24h: -12, mcap: 120000, safety: 'warn', holders: 680, age: '12h ago' },
];

const TABS: { id: Tab; label: string }[] = [
  { id: 'listings', label: 'New Listings' },
  { id: 'trending', label: 'Trending' },
  { id: 'whales', label: 'Whales' },
  { id: 'watchlist', label: 'Watchlist' },
];

const SAFETY_CONFIG: Record<Safety, { label: string; color: string; bg: string; border: string }> = {
  safe: { label: 'SAFE', color: '#00ff9d', bg: 'rgba(0,255,157,0.08)', border: 'rgba(0,255,157,0.25)' },
  warn: { label: 'CAUTION', color: '#f5c518', bg: 'rgba(245,197,24,0.08)', border: 'rgba(245,197,24,0.25)' },
  rug: { label: 'RUG RISK', color: '#ff3b6b', bg: 'rgba(255,59,107,0.08)', border: 'rgba(255,59,107,0.25)' },
};

function formatPrice(price: number): string {
  if (price < 0.000001) return price.toExponential(2);
  if (price < 0.001) return price.toFixed(7);
  return price.toFixed(5);
}

function formatMcap(mcap: number): string {
  if (mcap >= 1_000_000) return `$${(mcap / 1_000_000).toFixed(2)}M`;
  if (mcap >= 1_000) return `$${(mcap / 1_000).toFixed(1)}K`;
  return `$${mcap}`;
}

function formatAddress(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('listings');
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('watchlist');
      if (stored) setWatchlist(JSON.parse(stored));
    } catch {}
  }, []);

  function toggleWatchlist(address: string) {
    setWatchlist((prev) => {
      const next = prev.includes(address)
        ? prev.filter((a) => a !== address)
        : [...prev, address];
      try {
        localStorage.setItem('watchlist', JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const watchlistTokens = MOCK_TOKENS.filter((t) => watchlist.includes(t.address));

  return (
    <>
      <style>{`
        :root {
          --bg: #080b10;
          --surface: #0e1318;
          --accent: #00ff9d;
          --accent2: #ff3b6b;
          --text: #e8edf2;
          --muted: #5a6a7a;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .live-dot { animation: pulse-dot 1.5s ease-in-out infinite; }

        .token-card {
          transition: border-color 0.15s, background 0.15s;
        }
        .token-card:hover {
          border-color: rgba(0,255,157,0.25) !important;
          background: rgba(14,19,24,0.95) !important;
        }

        .star-btn {
          transition: color 0.15s, background 0.15s;
        }
        .star-btn:hover {
          color: #f5c518 !important;
        }
      `}</style>

      <div
        className="flex flex-col min-h-screen"
        style={{
          background:
            'radial-gradient(ellipse at top left, rgba(0,255,157,0.06) 0%, transparent 50%), ' +
            'radial-gradient(ellipse at bottom right, rgba(139,92,246,0.08) 0%, transparent 50%), ' +
            'var(--bg)',
          color: 'var(--text)',
          fontFamily: 'var(--font-space-mono), monospace',
        }}
      >
        {/* Header */}
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid rgba(0,255,157,0.12)' }}>
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--accent)', letterSpacing: '-0.01em' }}
              >
                Birdeye Token Radar
              </span>
              <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                Solana Token Intel
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="live-dot inline-block w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--accent)' }}>LIVE</span>
              </div>

              <button
                onClick={() => setActiveTab('watchlist')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold"
                style={{
                  background: activeTab === 'watchlist' ? 'rgba(0,255,157,0.12)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(0,255,157,0.2)',
                  color: activeTab === 'watchlist' ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                WATCHLIST {watchlist.length}
              </button>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav style={{ background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-6xl mx-auto px-4 flex">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-5 py-3 text-xs tracking-widest uppercase"
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--muted)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer',
                    fontWeight: isActive ? '700' : '400',
                    marginBottom: '-1px',
                    fontFamily: 'var(--font-space-mono), monospace',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
          {activeTab === 'listings' && (
            <TokenList tokens={MOCK_TOKENS} watchlist={watchlist} onToggleWatchlist={toggleWatchlist} />
          )}
          {activeTab === 'trending' && (
            <Placeholder title="Trending Breakouts" description="Momentum tokens heating up — coming soon." />
          )}
          {activeTab === 'whales' && (
            <Placeholder title="Whale Tracker" description="Large wallet movements — coming soon." />
          )}
          {activeTab === 'watchlist' && (
            watchlistTokens.length === 0 ? (
              <Placeholder title="Watchlist Empty" description="Star a token from New Listings to track it here." />
            ) : (
              <TokenList tokens={watchlistTokens} watchlist={watchlist} onToggleWatchlist={toggleWatchlist} />
            )
          )}
        </main>
      </div>
    </>
  );
}

function TokenList({
  tokens,
  watchlist,
  onToggleWatchlist,
}: {
  tokens: Token[];
  watchlist: string[];
  onToggleWatchlist: (address: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Column headers */}
      <div
        className="grid text-xs px-4 pb-2"
        style={{
          gridTemplateColumns: '1fr 110px 110px 100px 90px 80px 64px 40px',
          color: 'var(--muted)',
          letterSpacing: '0.08em',
        }}
      >
        <span>TOKEN</span>
        <span className="text-right">PRICE</span>
        <span className="text-right">24H</span>
        <span className="text-right">MCAP</span>
        <span className="text-right">HOLDERS</span>
        <span className="text-right">LISTED</span>
        <span className="text-right">SAFETY</span>
        <span />
      </div>

      {tokens.map((token) => (
        <TokenCard
          key={token.address}
          token={token}
          starred={watchlist.includes(token.address)}
          onToggleStar={() => onToggleWatchlist(token.address)}
        />
      ))}
    </div>
  );
}

function TokenCard({
  token,
  starred,
  onToggleStar,
}: {
  token: Token;
  starred: boolean;
  onToggleStar: () => void;
}) {
  const safety = SAFETY_CONFIG[token.safety];
  const changePositive = token.change24h >= 0;

  return (
    <div
      className="token-card grid items-center px-4 py-3 rounded-lg"
      style={{
        gridTemplateColumns: '1fr 110px 110px 100px 90px 80px 64px 40px',
        background: 'var(--surface)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Token name/symbol */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className="text-sm font-bold truncate"
          style={{ color: 'var(--text)', fontFamily: 'var(--font-syne), sans-serif' }}
        >
          {token.symbol}
        </span>
        <span className="text-xs truncate" style={{ color: 'var(--muted)' }}>
          {token.name}&nbsp;&nbsp;
          <span style={{ opacity: 0.5 }}>{formatAddress(token.address)}</span>
        </span>
      </div>

      {/* Price */}
      <span className="text-right text-xs tabular-nums" style={{ color: 'var(--text)' }}>
        ${formatPrice(token.price)}
      </span>

      {/* 24h change */}
      <span
        className="text-right text-xs font-bold tabular-nums"
        style={{ color: changePositive ? '#00ff9d' : '#ff3b6b' }}
      >
        {changePositive ? '+' : ''}{token.change24h}%
      </span>

      {/* Market cap */}
      <span className="text-right text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
        {formatMcap(token.mcap)}
      </span>

      {/* Holders */}
      <span className="text-right text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
        {token.holders.toLocaleString()}
      </span>

      {/* Age */}
      <span className="text-right text-xs" style={{ color: 'var(--muted)' }}>
        {token.age}
      </span>

      {/* Safety badge */}
      <div className="flex justify-end">
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded"
          style={{
            color: safety.color,
            background: safety.bg,
            border: `1px solid ${safety.border}`,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          {safety.label}
        </span>
      </div>

      {/* Star button */}
      <div className="flex justify-end">
        <button
          onClick={onToggleStar}
          className="star-btn text-base leading-none p-1 rounded"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: starred ? '#f5c518' : 'var(--muted)',
            opacity: starred ? 1 : 0.6,
          }}
          aria-label={starred ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {starred ? '★' : '☆'}
        </button>
      </div>
    </div>
  );
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-24 rounded-lg"
      style={{ border: '1px dashed rgba(0,255,157,0.15)', background: 'rgba(14,19,24,0.6)' }}
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
