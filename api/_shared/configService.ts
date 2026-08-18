export interface PublicConfigResult {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

/**
 * Returns public configuration safe to expose to the frontend.
 * Strictly NEVER returns service roles, private API keys, or backend secrets.
 */
export function getPublicConfig(): PublicConfigResult {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const supabasePublishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  return {
    supabaseUrl: supabaseUrl.trim(),
    supabasePublishableKey: supabasePublishableKey.trim(),
  };
}
