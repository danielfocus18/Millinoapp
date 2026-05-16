import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// GET - fetch profile for a given auth user id
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ profile: null, error: error.message })
  return NextResponse.json({ profile: data })
}

// POST - upsert profile
export async function POST(request: Request) {
  const { user } = await request.json()
  if (!user?.id || !user?.email)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('users')
    .upsert({ id: user.id, name: user.email, role: 'cashier' }, { onConflict: 'id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
