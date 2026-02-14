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
  privyAppId: process.env.PRIVY_APP_ID,
  privyVerificationKey: process.env.PRIVY_VERIFICATION_KEY,
  tempoRpcUrl: process.env.TEMPO_RPC_URL,
  tempoStablecoinAddress: process.env.TEMPO_STABLECOIN_ADDRESS,
  tempoChainId: Number(process.env.TEMPO_CHAIN_ID ?? 0),
  pulseSubscriptionsContractAddress: process.env.PULSE_SUBSCRIPTIONS_CONTRACT_ADDRESS,
  requireEnv
};
