@AGENTS.md
# Birdeye Token Radar

## Project
All-in-one Solana token intelligence dashboard for degen meme hunters.
Built for Birdeye Data BIP Competition Sprint 1 (April 2026).

## Stack
- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Data: Birdeye Data API (bds.birdeye.so)
- AI: Anthropic Claude API (safety summaries)
- Deploy: Vercel

## Commands
- Dev: npm run dev
- Build: npm run build

## Rules
- Use /clear between major features
- Commit after every major feature
- Mock data first, real API calls second
- If Birdeye API fails, use DEMO_MODE=true

## Birdeye Endpoints
- /v2/tokens/new_listing — new token listings
- /defi/token_trending — trending tokens
- /defi/token_security — safety scoring
- /defi/price — live prices
- /defi/txs/token — whale transactions

## Core Features
1. New Listings Feed — fresh tokens with safety badge
2. Trending Breakouts — momentum tokens
3. Whale Tracker — large wallet movements
4. AI Safety Summary — Claude-powered verdict
5. Watchlist — save tokens via localStorage

## Theme
- Dark terminal-style UI
- Colors: bg #080b10, accent #00ff9d, danger #ff3b6b
- Fonts: Syne (headings) + Space Mono (data)

## Env Vars
NEXT_PUBLIC_BIRDEYE_API_KEY=
NEXT_PUBLIC_DEMO_MODE=true
ANTHROPIC_API_KEY=