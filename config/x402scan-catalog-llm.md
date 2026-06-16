# AgentPay x402 Catalog (2026-06-16)
Source: https://www.x402scan.com/resources
Services: 30
Skipped domains: hugen.tokyo
## 1. BlockRun — Pay-per-call AI gateway
- **Origin:** http://blockrun.ai
- **x402scan:** https://www.x402scan.com/server/cbe8caef-6324-4bd1-aee7-63d09fb4d1b9
- **Tx volume:** 1,819,420
- **Probe:** HTTP 200
- **Description:** Pay-per-call AI gateway. Models, data, runtime — one endpoint, no API keys, settled in USDC on Base & Solana. One install for OpenClaw (ClawRouter), Claude Code (MCP), or Franklin Agent. Per call, per token, no subscription.
- **APIs (15):**
  - `POST` http://blockrun.ai/api/v1/chat/completions
  - `POST` http://blockrun.ai/api/v1/images/generations
  - `POST` http://blockrun.ai/api/v1/modal/sandbox/create
  - `POST` http://blockrun.ai/api/v1/modal/sandbox/exec
  - `POST` http://blockrun.ai/api/v1/modal/sandbox/status
  - `POST` http://blockrun.ai/api/v1/modal/sandbox/terminate
  - `POST` http://blockrun.ai/api/v1/search
  - `POST` http://blockrun.ai/api/v1/x/users/followers
  - `POST` http://blockrun.ai/api/v1/x/users/lookup
  - `POST` https://blockrun.ai/api/v1/audio/generations
  - `POST` https://blockrun.ai/api/v1/audio/sound-effects
  - `POST` https://blockrun.ai/api/v1/audio/speech
  - `POST` https://blockrun.ai/api/v1/chat/completions
  - `GET` https://blockrun.ai/api/v1/defillama/chains
  - `GET` https://blockrun.ai/api/v1/defillama/prices/%7Bcoins%7D

## 2. StableEnrich
- **Origin:** https://stableenrich.dev
- **x402scan:** https://www.x402scan.com/server/b8a06bde-b6e8-4a10-b4e0-cc6a25fb9efb
- **Tx volume:** 65,538
- **Probe:** HTTP 200
- **Description:** Pay-per-request access to Apollo, Clado, Exa, Firecrawl, Google Maps, Serper, and Whitepages APIs. No auth, no subscriptions.
- **APIs (15):**
  - `POST` https://stableenrich.dev/api/apollo/org-enrich
  - `POST` https://stableenrich.dev/api/apollo/org-search
  - `POST` https://stableenrich.dev/api/apollo/people-enrich
  - `POST` https://stableenrich.dev/api/apollo/people-search
  - `POST` https://stableenrich.dev/api/clado/contacts-enrich
  - `POST` https://stableenrich.dev/api/cloudflare/crawl
  - `GET` https://stableenrich.dev/api/cloudflare/jobs
  - `POST` https://stableenrich.dev/api/exa/answer
  - `POST` https://stableenrich.dev/api/exa/contents
  - `POST` https://stableenrich.dev/api/exa/find-similar
  - `POST` https://stableenrich.dev/api/exa/search
  - `POST` https://stableenrich.dev/api/firecrawl/scrape
  - `POST` https://stableenrich.dev/api/firecrawl/search
  - `GET` https://stableenrich.dev/api/google-maps/aerial-view/lookup-video
  - `POST` https://stableenrich.dev/api/google-maps/aerial-view/render-video

## 3. twit.sh — Plug AI agents into X
- **Origin:** https://x402.twit.sh
- **x402scan:** https://www.x402scan.com/server/b6242036-97a3-439b-901b-abdded377045
- **Tx volume:** 47,193
- **Probe:** HTTP 402
- **Description:** Real-time Twitter/X data for AI agents. No sign-up, no API keys. Pay per request in USDC on Base via x402.
- **APIs (15):**
  - `GET` https://x402.twit.sh/articles/by/id
  - `GET` https://x402.twit.sh/communities/by/id
  - `GET` https://x402.twit.sh/communities/members
  - `GET` https://x402.twit.sh/communities/posts
  - `GET` https://x402.twit.sh/lists/by/id
  - `GET` https://x402.twit.sh/lists/followers
  - `GET` https://x402.twit.sh/lists/members
  - `GET` https://x402.twit.sh/lists/tweets
  - `GET` https://x402.twit.sh/tweets
  - `POST` https://x402.twit.sh/tweets
  - `DELETE` https://x402.twit.sh/tweets
  - `POST` https://x402.twit.sh/tweets/bookmark
  - `DELETE` https://x402.twit.sh/tweets/bookmark
  - `GET` https://x402.twit.sh/tweets/by/id
  - `POST` https://x402.twit.sh/tweets/like

## 4. Vishwa
- **Origin:** https://api.vishwalab.com
- **x402scan:** https://www.x402scan.com/server/7fdd6134-681d-4556-82b8-6fbb2c707a36
- **Tx volume:** 9,421
- **Probe:** HTTP 200
- **Description:** Vishwa is building agent-native banking infrastructure for autonomous capital, bringing pre-execution control to agent-driven payments and capital flows.
- **APIs (15):**
  - `GET` https://api.vishwalab.com/v1/prediction/events
  - `GET` https://api.vishwalab.com/v1/prediction/events/%7BeventId%7D
  - `GET` https://api.vishwalab.com/v1/prediction/events/%7BeventId%7D/markets
  - `GET` https://api.vishwalab.com/v1/prediction/events/search
  - `POST` https://api.vishwalab.com/v1/prediction/execute
  - `GET` https://api.vishwalab.com/v1/prediction/history
  - `GET` https://api.vishwalab.com/v1/prediction/markets/%7BmarketId%7D
  - `GET` https://api.vishwalab.com/v1/prediction/orderbook/%7BmarketId%7D
  - `GET` https://api.vishwalab.com/v1/prediction/orders
  - `DELETE` https://api.vishwalab.com/v1/prediction/orders
  - `POST` https://api.vishwalab.com/v1/prediction/orders
  - `GET` https://api.vishwalab.com/v1/prediction/orders/%7BorderPubkey%7D
  - `GET` https://api.vishwalab.com/v1/prediction/orders/status/%7BorderPubkey%7D
  - `GET` https://api.vishwalab.com/v1/prediction/positions
  - `GET` https://api.vishwalab.com/v1/prediction/positions/%7BpositionPubkey%7D

## 5. Surf Twitter
- **Origin:** https://twitter.surf.cascade.fyi
- **x402scan:** https://www.x402scan.com/server/65dad08e-2802-4fac-adc2-dfb1acb24713
- **Tx volume:** 9,175
- **Probe:** HTTP 200
- **Description:** Pay-per-use Twitter/X data API with x402 micropayments.
- **APIs (15):**
  - `POST` https://twitter.surf.cascade.fyi/communities/%7Bid%7D
  - `POST` https://twitter.surf.cascade.fyi/communities/%7Bid%7D/members
  - `POST` https://twitter.surf.cascade.fyi/communities/%7Bid%7D/tweets
  - `POST` https://twitter.surf.cascade.fyi/communities/search
  - `POST` https://twitter.surf.cascade.fyi/lists/%7Bid%7D/followers
  - `POST` https://twitter.surf.cascade.fyi/lists/%7Bid%7D/members
  - `POST` https://twitter.surf.cascade.fyi/lists/%7Bid%7D/tweets
  - `POST` https://twitter.surf.cascade.fyi/spaces/%7Bid%7D
  - `POST` https://twitter.surf.cascade.fyi/trends
  - `POST` https://twitter.surf.cascade.fyi/tweets
  - `POST` https://twitter.surf.cascade.fyi/tweets/%7Bid%7D
  - `POST` https://twitter.surf.cascade.fyi/tweets/%7Bid%7D/article
  - `POST` https://twitter.surf.cascade.fyi/tweets/%7Bid%7D/quotes
  - `POST` https://twitter.surf.cascade.fyi/tweets/%7Bid%7D/replies
  - `POST` https://twitter.surf.cascade.fyi/tweets/%7Bid%7D/retweeters

## 6. OneSource - Ethereum RPC for AI Agents
- **Origin:** https://api.onesource.io
- **x402scan:** https://www.x402scan.com/server/bbb78e94-611e-4f0c-9a48-6df8fd9b26be
- **Tx volume:** 7,844
- **Probe:** HTTP 200
- **Description:** Ethereum mainnet and Sepolia testnet RPC for AI agents, served from OneSource-operated nodes. Live block, balance, contract, NFT, transaction, and event data. Pay per call or use batch/session mode — USDC on Base via x402, or pathUSD/USDC.e on Tempo via MPP. No API keys required.
- **APIs (15):**
  - `GET` https://api.onesource.io/api/chain/allowance
  - `GET` https://api.onesource.io/api/chain/block-number
  - `GET` https://api.onesource.io/api/chain/block/%7Bnumber%7D
  - `POST` https://api.onesource.io/api/chain/call
  - `GET` https://api.onesource.io/api/chain/chain-id
  - `GET` https://api.onesource.io/api/chain/code/%7Baddress%7D
  - `GET` https://api.onesource.io/api/chain/contract/%7Baddress%7D
  - `GET` https://api.onesource.io/api/chain/ens/%7Binput%7D
  - `GET` https://api.onesource.io/api/chain/erc1155-balance
  - `GET` https://api.onesource.io/api/chain/erc20-balance
  - `GET` https://api.onesource.io/api/chain/erc20-transfers
  - `GET` https://api.onesource.io/api/chain/erc721-tokens
  - `POST` https://api.onesource.io/api/chain/estimate-gas
  - `GET` https://api.onesource.io/api/chain/events
  - `GET` https://api.onesource.io/api/chain/live-balance

## 7. ATXP — The Account for AI Agents
- **Origin:** https://hub.atxp.ai
- **x402scan:** https://www.x402scan.com/server/9f82a047-ab57-45ff-a6df-014cf5f527e8
- **Tx volume:** 7,590
- **Probe:** HTTP 200
- **Description:** ATXP gives AI agents identity, payments, communication, and tools. Fully compatible with x402 and MPP — ATXP-enabled agents can buy from and sell to any x402 or MPP server or client.
- **APIs (1):**
  - `POST` https://hub.atxp.ai/v1/services

## 8. Nansen AI - Trade Everything Onchain with AI
- **Origin:** https://api.nansen.ai
- **x402scan:** https://www.x402scan.com/server/21252dba-de2a-4432-a9dd-387f79ce5922
- **Tx volume:** 6,731
- **Probe:** HTTP 200
- **Description:** Trade everything onchain with AI, powered by 500M+ labeled addresses. Track Smart Money, analyze any token, and execute instantly - all in one place.
- **APIs (15):**
  - `POST` https://api.nansen.ai/api/v1/profiler/address/counterparties
  - `POST` https://api.nansen.ai/api/v1/profiler/address/current-balance
  - `POST` https://api.nansen.ai/api/v1/profiler/address/historical-balances
  - `POST` https://api.nansen.ai/api/v1/profiler/address/pnl
  - `POST` https://api.nansen.ai/api/v1/profiler/address/pnl-summary
  - `POST` https://api.nansen.ai/api/v1/profiler/address/related-wallets
  - `POST` https://api.nansen.ai/api/v1/profiler/address/transactions
  - `POST` https://api.nansen.ai/api/v1/profiler/dex-trades
  - `POST` https://api.nansen.ai/api/v1/profiler/perp-positions
  - `POST` https://api.nansen.ai/api/v1/profiler/perp-trades
  - `POST` https://api.nansen.ai/api/v1/smart-money/dcas
  - `POST` https://api.nansen.ai/api/v1/smart-money/dex-trades
  - `POST` https://api.nansen.ai/api/v1/smart-money/historical-holdings
  - `POST` https://api.nansen.ai/api/v1/smart-money/holdings
  - `POST` https://api.nansen.ai/api/v1/smart-money/netflow

## 9. claw402 — x402 API Payment Gateway
- **Origin:** https://claw402.ai
- **x402scan:** https://www.x402scan.com/server/c03533a3-523f-4687-b1cd-c61e9de7aed9
- **Tx volume:** 6,304
- **Probe:** HTTP 200
- **Description:** Backed by vergex.trade. Pay for any API with USDC. No API keys. No registration. Just a wallet.
- **APIs (15):**
  - `POST` https://claw402.ai/api/v1/ai/anthropic/messages/haiku
  - `POST` https://claw402.ai/api/v1/ai/anthropic/messages/opus
  - `POST` https://claw402.ai/api/v1/ai/anthropic/messages/sonnet
  - `POST` https://claw402.ai/api/v1/ai/deepseek/chat
  - `POST` https://claw402.ai/api/v1/ai/deepseek/chat/demo
  - `POST` https://claw402.ai/api/v1/ai/deepseek/chat/reasoner
  - `GET` https://claw402.ai/api/v1/ai/deepseek/models
  - `POST` https://claw402.ai/api/v1/ai/deepseek/v4-flash
  - `POST` https://claw402.ai/api/v1/ai/deepseek/v4-pro
  - `POST` https://claw402.ai/api/v1/ai/gemini/chat/2.5-flash
  - `POST` https://claw402.ai/api/v1/ai/gemini/chat/2.5-flash-lite
  - `POST` https://claw402.ai/api/v1/ai/gemini/chat/2.5-pro
  - `POST` https://claw402.ai/api/v1/ai/gemini/chat/3-flash
  - `POST` https://claw402.ai/api/v1/ai/gemini/chat/3.1-flash-lite
  - `POST` https://claw402.ai/api/v1/ai/gemini/chat/3.1-pro

## 10. StableEmail
- **Origin:** https://stableemail.dev
- **x402scan:** https://www.x402scan.com/server/7c37fc42-c725-4232-9e4e-106db4872375
- **Tx volume:** 6,130
- **Probe:** HTTP 200
- **Description:** Pay-per-send email delivery. No API keys, no accounts.
- **APIs (15):**
  - `POST` https://stableemail.dev/api/inbox/buy
  - `POST` https://stableemail.dev/api/inbox/cancel
  - `POST` https://stableemail.dev/api/inbox/messages
  - `POST` https://stableemail.dev/api/inbox/messages/delete
  - `POST` https://stableemail.dev/api/inbox/messages/read
  - `POST` https://stableemail.dev/api/inbox/send
  - `GET` https://stableemail.dev/api/inbox/status
  - `POST` https://stableemail.dev/api/inbox/topup
  - `POST` https://stableemail.dev/api/inbox/topup/quarter
  - `POST` https://stableemail.dev/api/inbox/topup/year
  - `POST` https://stableemail.dev/api/inbox/update
  - `POST` https://stableemail.dev/api/send
  - `POST` https://stableemail.dev/api/subdomain/buy
  - `POST` https://stableemail.dev/api/subdomain/inbox/create
  - `POST` https://stableemail.dev/api/subdomain/inbox/delete

## 11. glim.sh - live data for any agent
- **Origin:** https://surf.cascade.fyi
- **x402scan:** https://www.x402scan.com/server/22d38147-8bb0-4efc-a087-a1dc54f4ca9d
- **Tx volume:** 5,902
- **Probe:** HTTP 200
- **Description:** One remote endpoint gives your agent live data from Twitter, Reddit, the open web, GitHub and more. No API keys, no scraping stack - just connect the URL and pay per call.
- **APIs (15):**
  - `POST` https://surf.cascade.fyi/api/v1/amazon/get
  - `POST` https://surf.cascade.fyi/api/v1/amazon/search
  - `POST` https://surf.cascade.fyi/api/v1/github/get
  - `POST` https://surf.cascade.fyi/api/v1/github/search
  - `POST` https://surf.cascade.fyi/api/v1/reddit/get
  - `POST` https://surf.cascade.fyi/api/v1/reddit/search
  - `POST` https://surf.cascade.fyi/api/v1/twitter/get
  - `POST` https://surf.cascade.fyi/api/v1/twitter/lists/%7Bid%7D/members
  - `POST` https://surf.cascade.fyi/api/v1/twitter/lists/%7Bid%7D/tweets
  - `POST` https://surf.cascade.fyi/api/v1/twitter/search
  - `POST` https://surf.cascade.fyi/api/v1/twitter/trends
  - `POST` https://surf.cascade.fyi/api/v1/twitter/tweets
  - `POST` https://surf.cascade.fyi/api/v1/twitter/tweets/%7Bid%7D
  - `POST` https://surf.cascade.fyi/api/v1/twitter/tweets/%7Bid%7D/article
  - `POST` https://surf.cascade.fyi/api/v1/twitter/tweets/%7Bid%7D/quotes

## 12. BTC Node API — Bitcoin + Data + SEC + Scrape + AI + Reddit
- **Origin:** https://btcnode.uk
- **x402scan:** https://www.x402scan.com/server/257d21e5-2b65-4568-81ce-230263e96932
- **Tx volume:** 5,394
- **Probe:** HTTP 200
- **Description:** Bitcoin blockchain data, address portfolio, transaction tracing, fee forecasting, whale monitoring, SEC EDGAR filings, URL scraping, AI summarization, and Reddit API via x402 micropayments on Base.
- **APIs (15):**
  - `GET` https://btcnode.uk/api/addr/%7Baddress%7D
  - `GET` https://btcnode.uk/api/fees
  - `GET` https://btcnode.uk/api/fees/predict
  - `GET` https://btcnode.uk/api/info
  - `GET` https://btcnode.uk/api/mempool
  - `GET` https://btcnode.uk/api/reddit/comments/%7BpostId%7D
  - `GET` https://btcnode.uk/api/reddit/hot/%7Bsubreddit%7D
  - `GET` https://btcnode.uk/api/reddit/search
  - `GET` https://btcnode.uk/api/reddit/trending
  - `POST` https://btcnode.uk/api/scrape
  - `GET` https://btcnode.uk/api/sec/insider/%7Bticker%7D
  - `POST` https://btcnode.uk/api/summarize
  - `GET` https://btcnode.uk/api/trace/%7Btxid%7D
  - `GET` https://btcnode.uk/api/tx/%7Bhash%7D
  - `GET` https://btcnode.uk/api/whales

## 13. molty.cash — USDC payments for agents and humans
- **Origin:** https://api.molty.cash
- **x402scan:** https://www.x402scan.com/server/701b5dfd-59a7-45ad-9463-f5d73723fcc4
- **Tx volume:** 5,356
- **Probe:** HTTP 200
- **Description:** Send tips, hire for tasks, and create gigs — settled on-chain via x402 (Base, Solana, World Chain, SKALE) and MPP (Tempo, Stellar, Monad).
- **APIs (1):**
  - `POST` https://api.molty.cash/a2a

## 14. Otto AI x402 — Programmable USDC payments for AI agents
- **Origin:** https://x402.ottoai.services
- **x402scan:** https://www.x402scan.com/server/2a58f75f-bd11-4020-a347-0e1c7f4912ef
- **Tx volume:** 5,260
- **Probe:** HTTP 200
- **Description:** 50 pay-per-call AI services on x402 V2 — market intel, DeFi execution, AI creative tools. USDC on Base, Polygon, or Solana. From $0.001 per call.
- **APIs (15):**
  - `GET` https://x402.ottoai.services/base-ecosystem-news
  - `GET` https://x402.ottoai.services/base-season
  - `POST` https://x402.ottoai.services/bridge
  - `POST` https://x402.ottoai.services/close-position
  - `GET` https://x402.ottoai.services/crypto-news
  - `GET` https://x402.ottoai.services/defi-analytics
  - `POST` https://x402.ottoai.services/deposit
  - `GET` https://x402.ottoai.services/equity-intel
  - `GET` https://x402.ottoai.services/filtered-news
  - `GET` https://x402.ottoai.services/funding-rates
  - `POST` https://x402.ottoai.services/generate-meme
  - `POST` https://x402.ottoai.services/hl-deposit-withdraw
  - `GET` https://x402.ottoai.services/hl-transaction-history
  - `GET` https://x402.ottoai.services/holder-analytics
  - `GET` https://x402.ottoai.services/hyperliquid-account

## 15. APINow.fun - Pay-Per-Call Tokenized APIs
- **Origin:** https://apinow.fun
- **x402scan:** https://www.x402scan.com/server/d6835471-2fb0-450a-aba1-5fb465afaa6f
- **Tx volume:** 5,052
- **Probe:** HTTP 200
- **Description:** Kill the API Key for Vibe Coders and Make AI Truly Autonomous with Pay-Per-Call Tokenized APIs.
- **APIs (1):**
  - `POST` https://apinow.fun/api/apinow-scan

## 16. https://gg402.vercel.app
- **Origin:** https://gg402.vercel.app
- **x402scan:** https://www.x402scan.com/server/3257e90c-5a73-4a07-8b14-4d094904bc21
- **Tx volume:** 5,052
- **Probe:** HTTP 200
- **APIs (15):**
  - `POST` https://gg402.vercel.app/accent_detector
  - `POST` https://gg402.vercel.app/accent_training_coach
  - `POST` https://gg402.vercel.app/accessibility_audit
  - `POST` https://gg402.vercel.app/accessibility_auditor
  - `POST` https://gg402.vercel.app/accessibility_image_descriptor
  - `POST` https://gg402.vercel.app/ad_copy_generator
  - `POST` https://gg402.vercel.app/adaptive_curriculum_builder
  - `POST` https://gg402.vercel.app/adaptive_learning_path
  - `POST` https://gg402.vercel.app/adaptive_quiz
  - `POST` https://gg402.vercel.app/adventure_itinerary_planner
  - `POST` https://gg402.vercel.app/ai-tools/openai-sentiment
  - `POST` https://gg402.vercel.app/ai_bias_detector
  - `POST` https://gg402.vercel.app/ai_ethics_auditor
  - `POST` https://gg402.vercel.app/ai_fairness_checker
  - `POST` https://gg402.vercel.app/ai_tutor

## 17. HYRE Agent — AI-Enhanced DeFi Data API
- **Origin:** https://mpp.hyreagent.fun
- **x402scan:** https://www.x402scan.com/server/eee5895d-af89-4a03-9fa0-cbb476eb962d
- **Tx volume:** 4,742
- **Probe:** HTTP 200
- **Description:** Pay-per-call DeFi intelligence for autonomous agents. 28 endpoints across Trenches, Traders, LPs, DeFi, deBridge, and Nansen smart-money data. Multi-chain x402 on Solana, Base, SKALE + MPP on Tempo. No API keys — payment is the only gate.
- **APIs (15):**
  - `POST` https://mpp.hyreagent.fun/ask
  - `GET` https://mpp.hyreagent.fun/lp/meteora/pools
  - `GET` https://mpp.hyreagent.fun/lp/meteora/pools/%7Baddress%7D
  - `GET` https://mpp.hyreagent.fun/lp/meteora/pools/recommend
  - `GET` https://mpp.hyreagent.fun/lp/meteora/pools/strategy
  - `GET` https://mpp.hyreagent.fun/lp/positions/%7Bid%7D/rebalance
  - `GET` https://mpp.hyreagent.fun/lp/wallet/%7Baddress%7D/positions
  - `GET` https://mpp.hyreagent.fun/traders/token/%7Bmint%7D/ohlcv
  - `GET` https://mpp.hyreagent.fun/traders/token/%7Bmint%7D/whales
  - `GET` https://mpp.hyreagent.fun/traders/wallet/%7Baddress%7D/intel
  - `GET` https://mpp.hyreagent.fun/traders/wallet/%7Baddress%7D/pnl
  - `GET` https://mpp.hyreagent.fun/traders/wallet/%7Baddress%7D/positions
  - `GET` https://mpp.hyreagent.fun/trenches/curve/%7Bmint%7D
  - `GET` https://mpp.hyreagent.fun/trenches/token/%7Bmint%7D
  - `GET` https://mpp.hyreagent.fun/trenches/token/%7Bmint%7D/snipers

## 18. Xona Agent | Infrastructure for Agentic Commerce
- **Origin:** https://api.xona-agent.com
- **x402scan:** https://www.x402scan.com/server/e0c4cbd0-c696-412c-b4ee-589158c6f3e9
- **Tx volume:** 4,188
- **Probe:** HTTP 404
- **Description:** Build AI agents that earn on Orbit. Power them with Xona Resources.
- **APIs (15):**
  - `POST` https://api.xona-agent.com/ai/x-news
  - `POST` https://api.xona-agent.com/ai/x-persona
  - `POST` https://api.xona-agent.com/audio/elevenlabs-music
  - `POST` https://api.xona-agent.com/audio/speech-to-text
  - `POST` https://api.xona-agent.com/audio/x-text-to-speech
  - `POST` https://api.xona-agent.com/image-model/qwen-image
  - `POST` https://api.xona-agent.com/image-model/seedream-4.5
  - `POST` https://api.xona-agent.com/image/creative-director
  - `POST` https://api.xona-agent.com/image/designer
  - `POST` https://api.xona-agent.com/image/flux-2-flex
  - `POST` https://api.xona-agent.com/image/flux-2-max
  - `POST` https://api.xona-agent.com/image/flux-2-pro
  - `POST` https://api.xona-agent.com/image/gpt-image-2
  - `POST` https://api.xona-agent.com/image/grok-imagine
  - `POST` https://api.xona-agent.com/image/nano-banana

## 19. StableTravel
- **Origin:** https://stabletravel.dev
- **x402scan:** https://www.x402scan.com/server/166fd2f6-6d6f-4bda-9c7c-3cb8e9cf417e
- **Tx volume:** 3,775
- **Probe:** HTTP 200
- **Description:** Pay-per-request access to flights, award availability, hotels, activities, and transfers. No auth, no subscriptions.
- **APIs (15):**
  - `GET` https://stabletravel.dev/api/activities/by-square
  - `GET` https://stabletravel.dev/api/activities/details
  - `GET` https://stabletravel.dev/api/activities/search
  - `GET` https://stabletravel.dev/api/flightaware/airports
  - `GET` https://stabletravel.dev/api/flightaware/airports/delays
  - `GET` https://stabletravel.dev/api/flightaware/airports/id
  - `GET` https://stabletravel.dev/api/flightaware/airports/id/canonical
  - `GET` https://stabletravel.dev/api/flightaware/airports/id/delays
  - `GET` https://stabletravel.dev/api/flightaware/airports/id/flights
  - `GET` https://stabletravel.dev/api/flightaware/airports/id/flights/arrivals
  - `GET` https://stabletravel.dev/api/flightaware/airports/id/flights/counts
  - `GET` https://stabletravel.dev/api/flightaware/airports/id/flights/departures
  - `GET` https://stabletravel.dev/api/flightaware/airports/id/flights/scheduled-arrivals
  - `GET` https://stabletravel.dev/api/flightaware/airports/id/flights/scheduled-departures
  - `GET` https://stabletravel.dev/api/flightaware/airports/id/flights/to/dest_id

## 20. StableSocial
- **Origin:** https://socialx402.com
- **x402scan:** https://www.x402scan.com/server/49d221cc-9960-49fb-b4eb-7aa4550defa1
- **Tx volume:** 2,907
- **Probe:** HTTP 200
- **Description:** Pay-per-request access to social media data from TikTok, Instagram, Facebook, Reddit, and LinkedIn. No auth, no subscriptions.
- **APIs (15):**
  - `POST` https://socialx402.com/api/facebook/comment-replies
  - `POST` https://socialx402.com/api/facebook/followers
  - `POST` https://socialx402.com/api/facebook/following
  - `POST` https://socialx402.com/api/facebook/post-comments
  - `POST` https://socialx402.com/api/facebook/posts
  - `POST` https://socialx402.com/api/facebook/profile
  - `POST` https://socialx402.com/api/facebook/search
  - `POST` https://socialx402.com/api/facebook/search-groups
  - `POST` https://socialx402.com/api/facebook/search-pages
  - `POST` https://socialx402.com/api/facebook/search-people
  - `POST` https://socialx402.com/api/instagram/comment-replies
  - `POST` https://socialx402.com/api/instagram/followers
  - `POST` https://socialx402.com/api/instagram/following
  - `POST` https://socialx402.com/api/instagram/highlights
  - `POST` https://socialx402.com/api/instagram/post-comments

## 21. StableSocial
- **Origin:** https://stablesocial.dev
- **x402scan:** https://www.x402scan.com/server/d8c1a882-b877-4d75-a8f6-cf94f7103e54
- **Tx volume:** 2,907
- **Probe:** HTTP 200
- **Description:** Pay-per-request access to social media data from TikTok, Instagram, Facebook, Reddit, and LinkedIn. No auth, no subscriptions.
- **APIs (15):**
  - `POST` https://stablesocial.dev/api/facebook/comment-replies
  - `POST` https://stablesocial.dev/api/facebook/followers
  - `POST` https://stablesocial.dev/api/facebook/following
  - `POST` https://stablesocial.dev/api/facebook/post-comments
  - `POST` https://stablesocial.dev/api/facebook/posts
  - `POST` https://stablesocial.dev/api/facebook/profile
  - `POST` https://stablesocial.dev/api/facebook/search
  - `POST` https://stablesocial.dev/api/facebook/search-groups
  - `POST` https://stablesocial.dev/api/facebook/search-pages
  - `POST` https://stablesocial.dev/api/facebook/search-people
  - `POST` https://stablesocial.dev/api/instagram/comment-replies
  - `POST` https://stablesocial.dev/api/instagram/followers
  - `POST` https://stablesocial.dev/api/instagram/following
  - `POST` https://stablesocial.dev/api/instagram/highlights
  - `POST` https://stablesocial.dev/api/instagram/post-comments

## 22. Exa | Web Search API, AI Search Engine, &amp; Website Crawler
- **Origin:** https://api.exa.ai
- **x402scan:** https://www.x402scan.com/server/a6c0793e-51e9-4038-9fdd-bfe58e46fba5
- **Tx volume:** 2,540
- **Probe:** HTTP 404
- **Description:** Real-time AI search engine with a powerful web search API, web crawling API, SERP API, and deep research tools. Search and extract structured content from websites and live data.
- **APIs (1):**
  - `POST` https://api.exa.ai/search

## 23. Sponge Gateway
- **Origin:** https://wolframalpha.x402.paysponge.com
- **x402scan:** https://www.x402scan.com/server/46afb49b-3e4e-4d5f-bc7c-1523965eb369
- **Tx volume:** 2,338
- **Probe:** HTTP 200
- **Description:** API payment gateway dashboard
- **APIs (3):**
  - `POST` https://wolframalpha.x402.paysponge.com/v1/result
  - `POST` https://wolframalpha.x402.paysponge.com/v1/simple
  - `POST` https://wolframalpha.x402.paysponge.com/v2/query

## 24. Sponge Gateway
- **Origin:** https://api.paysponge.com
- **x402scan:** https://www.x402scan.com/server/542a125f-a541-4a02-8cce-ed2c7235f0cd
- **Tx volume:** 2,338
- **Probe:** HTTP 200
- **Description:** API payment gateway dashboard
- **APIs (10):**
  - `POST` https://api.paysponge.com/x402/purchase/svc_d5ymfernpzeh58gb8/person/enrichment
  - `POST` https://api.paysponge.com/x402/purchase/svc_d5ymfernpzeh58gb8/person/search
  - `POST` https://api.paysponge.com/x402/purchase/svc_d672d90ggvqqygj60/extract
  - `POST` https://api.paysponge.com/x402/purchase/svc_d672d90ggvqqygj60/parse
  - `POST` https://api.paysponge.com/x402/purchase/svc_d6kszbre4qwg5n4n4/status/%7BtextId%7D
  - `POST` https://api.paysponge.com/x402/purchase/svc_d6kszbre4qwg5n4n4/status/test
  - `POST` https://api.paysponge.com/x402/purchase/svc_d6kszbre4qwg5n4n4/text
  - `POST` https://api.paysponge.com/x402/purchase/svc_d79zmxrk1hk7f3mp0
  - `POST` https://api.paysponge.com/x402/purchase/svc_d7mq738nrv9m8cv10/v0/profiles/:address
  - `POST` https://api.paysponge.com/x402/purchase/svc_d7y5tb8gh147se37m/url/:domain

## 25. 2Captcha
- **Origin:** https://2captcha.x402.paysponge.com
- **x402scan:** https://www.x402scan.com/server/464c5b21-f256-4265-84cf-5fc1e7b4e3f4
- **Tx volume:** 2,338
- **Probe:** HTTP 200
- **Description:** 2Captcha CAPTCHA solving API — solves reCAPTCHA v2/v3, hCaptcha, Cloudflare Turnstile, FunCaptcha, GeeTest, image captchas, and more
- **APIs (1):**
  - `POST` https://2captcha.x402.paysponge.com/createTask

## 26. AgentMail | Email Inbox API for AI Agents
- **Origin:** https://x402.api.agentmail.to
- **x402scan:** https://www.x402scan.com/server/8480a82b-d24f-4472-a04c-c36141f8bbb1
- **Tx volume:** 2,303
- **Probe:** HTTP 404
- **Description:** AgentMail gives AI agents real email inboxes. Create, send, receive, and search messages via REST API — built for autonomous agents and agentic workflows.
- **APIs (15):**
  - `POST` https://x402.api.agentmail.to/v0/domains
  - `POST` https://x402.api.agentmail.to/v0/domains/%7Bdomain_id%7D
  - `POST` https://x402.api.agentmail.to/v0/domains/%7Bdomain_id%7D/verify
  - `POST` https://x402.api.agentmail.to/v0/domains/%7Bdomain_id%7D/zone-file
  - `POST` https://x402.api.agentmail.to/v0/drafts
  - `POST` https://x402.api.agentmail.to/v0/drafts/%7Bdraft_id%7D
  - `POST` https://x402.api.agentmail.to/v0/drafts/%7Bdraft_id%7D/attachments/%7Battachment_id%7D
  - `POST` https://x402.api.agentmail.to/v0/inboxes
  - `POST` https://x402.api.agentmail.to/v0/inboxes/%7Binbox_id%7D
  - `POST` https://x402.api.agentmail.to/v0/inboxes/%7Binbox_id%7D/drafts
  - `POST` https://x402.api.agentmail.to/v0/inboxes/%7Binbox_id%7D/drafts/%7Bdraft_id%7D
  - `POST` https://x402.api.agentmail.to/v0/inboxes/%7Binbox_id%7D/drafts/%7Bdraft_id%7D/attachments/%7Battachment_id%7D
  - `POST` https://x402.api.agentmail.to/v0/inboxes/%7Binbox_id%7D/drafts/%7Bdraft_id%7D/send
  - `POST` https://x402.api.agentmail.to/v0/inboxes/%7Binbox_id%7D/messages
  - `POST` https://x402.api.agentmail.to/v0/inboxes/%7Binbox_id%7D/messages/%7Bmessage_id%7D

## 27. StableStudio
- **Origin:** https://stablestudio.io
- **x402scan:** https://www.x402scan.com/server/9d0738fb-658b-479a-929b-cec1eedd9ead
- **Tx volume:** 2,084
- **Probe:** HTTP 200
- **Description:** Pay-per-generation AI image and video creation. No subscriptions ever.
- **APIs (15):**
  - `POST` https://stablestudio.io/api/generate/flux-2-max/edit
  - `POST` https://stablestudio.io/api/generate/flux-2-max/generate
  - `POST` https://stablestudio.io/api/generate/flux-2-pro/edit
  - `POST` https://stablestudio.io/api/generate/flux-2-pro/generate
  - `POST` https://stablestudio.io/api/generate/gpt-image-1.5/edit
  - `POST` https://stablestudio.io/api/generate/gpt-image-1.5/generate
  - `POST` https://stablestudio.io/api/generate/gpt-image-2/edit
  - `POST` https://stablestudio.io/api/generate/gpt-image-2/generate
  - `POST` https://stablestudio.io/api/generate/grok-video/generate
  - `POST` https://stablestudio.io/api/generate/grok/edit
  - `POST` https://stablestudio.io/api/generate/grok/generate
  - `POST` https://stablestudio.io/api/generate/nano-banana-pro/edit
  - `POST` https://stablestudio.io/api/generate/nano-banana-pro/generate
  - `POST` https://stablestudio.io/api/generate/nano-banana/edit
  - `POST` https://stablestudio.io/api/generate/nano-banana/generate

## 28. StableStudio
- **Origin:** https://stablestudio.dev
- **x402scan:** https://www.x402scan.com/server/7660b99d-029c-4806-b8fb-bbec52b09f6f
- **Tx volume:** 2,084
- **Probe:** HTTP 200
- **Description:** Pay-per-generation AI image and video creation. No subscriptions ever.
- **APIs (15):**
  - `POST` https://stablestudio.dev/api/generate/arrow-1.1-max/vectorize
  - `POST` https://stablestudio.dev/api/generate/arrow-1.1/vectorize
  - `POST` https://stablestudio.dev/api/generate/flux-2-max/edit
  - `POST` https://stablestudio.dev/api/generate/flux-2-max/generate
  - `POST` https://stablestudio.dev/api/generate/flux-2-pro/edit
  - `POST` https://stablestudio.dev/api/generate/flux-2-pro/generate
  - `POST` https://stablestudio.dev/api/generate/gpt-image-1.5/edit
  - `POST` https://stablestudio.dev/api/generate/gpt-image-1.5/generate
  - `POST` https://stablestudio.dev/api/generate/gpt-image-2/edit
  - `POST` https://stablestudio.dev/api/generate/gpt-image-2/generate
  - `POST` https://stablestudio.dev/api/generate/grok-video/generate
  - `POST` https://stablestudio.dev/api/generate/grok/edit
  - `POST` https://stablestudio.dev/api/generate/grok/generate
  - `POST` https://stablestudio.dev/api/generate/nano-banana-pro/edit
  - `POST` https://stablestudio.dev/api/generate/nano-banana-pro/generate

## 29. StableUpload
- **Origin:** https://stableupload.dev
- **x402scan:** https://www.x402scan.com/server/db32d172-1e2c-4de4-aeda-1463ffb67044
- **Tx volume:** 2,000
- **Probe:** HTTP 200
- **Description:** Pay-per-upload file hosting. Upload files, get a link.
- **APIs (10):**
  - `GET` https://stableupload.dev/api/download/:uploadId
  - `POST` https://stableupload.dev/api/site
  - `PUT` https://stableupload.dev/api/site
  - `POST` https://stableupload.dev/api/site/activate
  - `POST` https://stableupload.dev/api/site/domain
  - `DELETE` https://stableupload.dev/api/site/domain
  - `GET` https://stableupload.dev/api/site/domain/status
  - `POST` https://stableupload.dev/api/site/renew
  - `POST` https://stableupload.dev/api/upload
  - `GET` https://stableupload.dev/api/uploads

## 30. PrintMoneyLab - Automate &amp; Earn
- **Origin:** https://api.printmoneylab.com
- **x402scan:** https://www.x402scan.com/server/d117d751-46e2-4c66-9416-08a5c4445e0a
- **Tx volume:** 1,855
- **Probe:** HTTP 405
- **Description:** Real experiments in AI automation — crypto bots, prediction markets, and AI agents. No coding background. No fluff. Just what worked and what didn&#39;t
- **APIs (5):**
  - `POST` https://api.printmoneylab.com/api/v1/fx-rate
  - `POST` https://api.printmoneylab.com/api/v1/kimchi-premium
  - `POST` https://api.printmoneylab.com/api/v1/kr-prices
  - `POST` https://api.printmoneylab.com/api/v1/kr-sentiment
  - `POST` https://api.printmoneylab.com/api/v1/stablecoin-premium
