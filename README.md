# Pulse

Pulse is a Next.js 14 App Router starter for creator subscriptions and pay-per-view content, using Tempo stablecoin payments, Supabase storage, and a PostgreSQL data model.

## Stack

- Next.js 14+ (App Router) + React + Tailwind CSS
- API routes for backend logic
- Prisma + PostgreSQL/Supabase
- Supabase Storage signed upload/signed delivery URLs
- Tempo payment verification hooks
- Solidity smart contract with Hardhat in `contracts/PulseSubscriptions.sol`

## Included Features

- Explore creators page (`/explore`)
- Creator profile page (`/creator/[username]`) with:
  - subscribe flow
  - pay-per-view unlock flow
  - signed URL access flow
- Feed page (`/feed`) with:
  - all viewed/unlocked
  - active subscriptions
  - transaction history
- Creator dashboard (`/dashboard`) with:
  - analytics (revenue + subscriber trend chart)
  - earnings + withdrawal
  - subscription fee updates
  - content upload + publish metadata
  - subscriber list
- Become creator page (`/become-creator`)

## Data Model

Prisma models in `prisma/schema.prisma`:

- `User`
- `Creator`
- `Content`
- `Subscription`
- `Unlock`
- `Transaction`
- `ContentView`

## Contract Alignment

Backend routes map to these Solidity functions:

- `registerCreator`: initialize creator fee and zero balances
- `subscribe`: transfer USD token into contract, increment earnings, set/extend 30-day expiry
- `withdrawCreatorEarning`: creator withdraws accumulated USD from contract balance
- `updateSubscriptionFee`: update fee
- `isActiveSubscriber`: read-only subscription status

Contract files:

- `contracts/PulseSubscriptions.sol`
- `contracts/MockUSD.sol` (test token)

## Hardhat

1. Compile contracts:
   - `npm run hh:compile`
2. Run contract tests:
   - `npm run hh:test`
3. Deploy to Tempo (after setting env values):
   - `npm run hh:deploy:tempo`

## Quick Start

1. Copy env variables:
   - `cp .env.example .env.local`
2. Install dependencies:
   - `npm install`
3. Initialize Prisma:
   - `npx prisma generate`
   - `npx prisma db push`
4. Run app:
   - `npm run dev`

## Env Variables

See `.env.example` for all values.

Required groups:

- Postgres: `DATABASE_URL`
- Supabase: URL + anon + service role + bucket
- Tempo: RPC + stablecoin + Pulse subscriptions contract address
- Deployer: `DEPLOYER_PRIVATE_KEY` (for Hardhat deployment)
- Privy placeholders: app ID + verification key

## Notes

- Current auth helper uses request-header fallback (`x-user-id`, `x-wallet-address`) with a local demo default. Replace with Privy server token verification in `src/lib/auth.ts`.
- Payment verification for Tempo transfers is implemented in `src/lib/tempo.ts` and used by contract-mapped route handlers.
- Signed URL content access is short-lived and consumed per unlock unless user has an active subscription.
