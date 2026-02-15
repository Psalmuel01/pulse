function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "premium-content",
  privyAppId: process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  privyAppSecret: process.env.PRIVY_APP_SECRET,
  privyVerificationKey: process.env.PRIVY_VERIFICATION_KEY,
  tempoRpcUrl: process.env.TEMPO_RPC_URL,
  tempoPathUsdAddress: process.env.TEMPO_PATHUSD_ADDRESS ?? process.env.TEMPO_STABLECOIN_ADDRESS,
  tempoPathUsdDecimals: Number(process.env.TEMPO_PATHUSD_DECIMALS ?? process.env.TEMPO_STABLECOIN_DECIMALS ?? 6),
  tempoChainId: Number(process.env.TEMPO_CHAIN_ID ?? 42421),
  pulseSubscriptionsContractAddress: process.env.PULSE_SUBSCRIPTIONS_CONTRACT_ADDRESS,
  nextPublicPrivyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  nextPublicPulseSubscriptionsContractAddress: process.env.NEXT_PUBLIC_PULSE_SUBSCRIPTIONS_CONTRACT_ADDRESS,
  nextPublicTempoPathUsdAddress:
    process.env.NEXT_PUBLIC_TEMPO_PATHUSD_ADDRESS ?? process.env.NEXT_PUBLIC_TEMPO_STABLECOIN_ADDRESS,
  nextPublicTempoChainId: Number(process.env.NEXT_PUBLIC_TEMPO_CHAIN_ID ?? 42421),
  nextPublicTempoPathUsdDecimals: Number(
    process.env.NEXT_PUBLIC_TEMPO_PATHUSD_DECIMALS ?? process.env.NEXT_PUBLIC_TEMPO_STABLECOIN_DECIMALS ?? 6
  ),
  requireEnv
};
