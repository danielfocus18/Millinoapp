/**
 * Fetches user profile via the server-side API (service role key → bypasses RLS).
 * Use this everywhere instead of supabase.from('users').select() on the client.
 */
export async function getProfile(userId: string): Promise<{ role: string; name: string } | null> {
  try {
    const res = await fetch(`/api/users?id=${userId}`)
    if (!res.ok) return null
    const { profile } = await res.json()
    return profile ?? null
  } catch {
    return null
  }
}
