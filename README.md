# Birdeye Token Radar

## Overview

Birdeye Token Radar is an all-in-one Solana token intelligence dashboard built for degen meme hunters. It surfaces trending tokens, new listings, real-time swaps, whale activity, and DeFi market data in a single terminal-style interface — all powered by the Birdeye Data API. Built for the Birdeye Data BIP Competition Sprint 1 (April 2026).

## Features

| Tab | Description |
|-----|-------------|
| **Trending** | Top 20 Solana tokens ranked by Birdeye trending score with safety ratings |
| **New Listings** | Recently listed tokens sorted by market cap, with age and liquidity data |
| **Live Feed** | Real-time swap stream for BONK, WIF, POPCAT, JUP, and SOL — refreshes every 15s |
| **Whale Radar** | Large transactions ($100+ USD) across top Solana tokens — refreshes every 30s |
| **Meme Monitor** | Micro-cap pump tokens (<$100K liquidity) with 24h volume spikes over 50% |
| **Smart Money** | Mid-cap tokens ($10K–$5M liquidity) sorted by 24h volume change percent |
| **DeFi Pulse** | High-liquidity tokens ($1M+ liquidity) sorted by depth — the blue-chip layer |
| **Watchlist** | Starred tokens saved to localStorage, persisted across sessions |

All token tabs include a safety score (0–100), safety badge (Safe / Caution / Rug Risk), market cap, 24h volume, liquidity, and a direct link to Birdeye. Filters and sorting are available on every tab.

## Birdeye API Endpoints Used

| Endpoint | Used For |
|----------|----------|
| `GET /defi/token_trending` | Fetches the top 20 trending tokens by rank for the Trending tab |
| `GET /defi/tokenlist` | Powers New Listings (sorted by market cap), Meme Monitor (micro-cap volume spikes), Smart Money (mid-cap volume change), and DeFi Pulse (high-liquidity tokens) |
| `GET /defi/txs/token` | Fetches recent swap transactions per token for both the Live Feed (10 txns × 5 tokens, 15s cache) and Whale Radar (50 txns × 5 tokens, 30s cache) |
| `GET /defi/price` | Resolves live price and 24h change for tokens appearing in the Live Feed that are not already in the trending or listings datasets |

All requests target `https://public-api.birdeye.so` with the `x-chain: solana` header.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + inline CSS variables
- **Data:** Birdeye Data API (`public-api.birdeye.so`)
- **Deploy:** Vercel

## Live Demo

https://birdeye-token-radar.vercel.app

## GitHub

https://github.com/nanda-1-wq/birdeye-token-radar

## Getting Started

### Prerequisites

- Node.js 18+
- A Birdeye API key from [birdeye.so](https://birdeye.so)

### Installation

```bash
git clone https://github.com/nanda-1-wq/birdeye-token-radar.git
cd birdeye-token-radar
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_BIRDEYE_API_KEY=your_api_key_here
NEXT_PUBLIC_DEMO_MODE=false
```

Set `NEXT_PUBLIC_DEMO_MODE=true` to run the app with fallback mock data if the API key is unavailable.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```
