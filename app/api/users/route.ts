import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: Request) {
  const { user } = await request.json()
  if (!user || !user.id || !user.email)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('users')
    .upsert({ id: user.id, name: user.email, role: 'cashier' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Profile created/updated', profile: data })
}
