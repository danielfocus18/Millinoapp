import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

// Browser / shared client (anon key)
export function getSupabase() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

// Convenience named export used by client components
export const supabase = {
  get auth() { return getSupabase().auth },
  from: (...args: Parameters<SupabaseClient['from']>) => getSupabase().from(...args),
  rpc: (...args: Parameters<SupabaseClient['rpc']>) => getSupabase().rpc(...args),
}

// Server-only admin client (service role key) — call on every request, never cache
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
