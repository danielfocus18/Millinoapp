import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// GET — return all auth users + all public.users profiles
export async function GET() {
  const supabase = createAdminClient()

  // List all auth users (requires service role key)
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers()
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 })
  }

  // Get all profiles
  const { data: profileUsers, error: profileErr } = await supabase
    .from('users')
    .select('id, name, role')

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  const authUsers = (authData.users ?? []).map(u => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
  }))

  return NextResponse.json({ authUsers, profileUsers: profileUsers ?? [] })
}

// POST — upsert a user profile with a given role
export async function POST(request: Request) {
  const { userId, email, role } = await request.json()

  if (!userId || !role || !['manager', 'cashier'].includes(role)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .upsert(
      { id: userId, name: email, role },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, profile: data })
}
