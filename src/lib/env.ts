export const env = {
  databaseUrl: process.env.DATABASE_URL,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "premium-content",
  tempoRpcUrl: process.env.TEMPO_RPC_URL,
  tempoPathUsdAddress: process.env.TEMPO_PATHUSD_ADDRESS,
  tempoPathUsdDecimals: Number(process.env.TEMPO_PATHUSD_DECIMALS ?? 6),
  pulseSubscriptionsContractAddress: process.env.NEXT_PUBLIC_PULSE_SUBSCRIPTIONS_CONTRACT_ADDRESS
};
