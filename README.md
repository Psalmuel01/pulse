# Pulse

Pulse is a Next.js 14 App Router starter for creator subscriptions and pay-per-view content, using Tempo pathUSD (TIP-20) payments, Supabase storage, and a PostgreSQL data model.

## Stack

- Next.js 14+ (App Router) + React + Tailwind CSS
- API routes for backend logic
- Prisma + PostgreSQL/Supabase
- Supabase Storage signed upload/signed delivery URLs
- Tempo payment verification hooks (pathUSD/TIP-20 transfer validation)
- Solidity smart contract with Hardhat in `contracts/PulseSubscriptions.sol` (Tempo is EVM-compatible)

## Backend & Deployment Model

Pulse uses a single Next.js app for both frontend and backend.

- Backend runtime: Next.js API routes under `src/app/api/**`
- Database access: Prisma (`prisma/schema.prisma`) from those API routes
- Auth/session headers: handled in server helpers (see `src/lib/auth.ts`)
- Storage: Supabase Storage signed URL operations from server code

You do **not** need to deploy a separate NestJS (or other) backend service for the current architecture.

Deployables are:

- Next.js application (UI + API routes)
- PostgreSQL database
- Supabase project (Storage)
- Tempo contracts (already deployed per your env config)

## Included Features

- Landing page (`/`) with Privy account creation CTA and authenticated redirect to `/explore`
- Explore creators page (`/explore`)
- Creator profile page (`/creator/[username]`) with:
  - subscribe flow
  - pay-per-view unlock flow
  - signed URL access flow
- Feed page (`/feed`) with:
  - all viewed/unlocked
  - active subscriptions
  - transaction history
- Creator dashboard (`/creator`) with:
  - analytics (revenue + subscriber trend chart)
  - earnings + withdrawal
  - subscription fee updates
  - content upload + publish metadata
  - subscriber list
- Legacy dashboard route (`/dashboard`) redirects to `/creator`
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
- `contracts/mocks/MockPathUSD.sol` (test TIP-20-like token)

Hardhat project layout:

- `contracts/`
- `test/`
- `scripts/`
- `ignition/modules/`

## Hardhat

This repo is wired for Hardhat 3 + `@nomicfoundation/hardhat-toolbox-mocha-ethers`.

1. Compile contracts:
   - `npm run hh:compile`
2. Run contract tests:
   - `npm run hh:test`
3. Deploy with script (default simulated network):
   - `npm run hh:deploy`
4. Deploy with Ignition module (default simulated network):
   - `npm run hh:deploy:ignition`
5. Deploy to Tempo with script (after setting env values):
   - `npm run hh:deploy:tempo`
6. Deploy to Tempo with Ignition module:
   - `npm run hh:deploy:tempo:ignition`

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
- Tempo: RPC + pathUSD token + Pulse subscriptions contract address
- Deployer: `DEPLOYER_PRIVATE_KEY` (for Hardhat deployment)
- Privy placeholders: app ID + verification key
  - `NEXT_PUBLIC_PRIVY_APP_ID` is required for frontend login/signup

## Notes

- Current auth helper uses request-header fallback (`x-user-id`, `x-wallet-address`) with a local demo default. Replace with Privy server token verification in `src/lib/auth.ts`.
- Payment verification for Tempo pathUSD transfers is implemented in `src/lib/tempo.ts` and used by contract-mapped route handlers.
- Signed URL content access is short-lived and consumed per unlock unless user has an active subscription.
