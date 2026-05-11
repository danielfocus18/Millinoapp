import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  const { user } = await request.json()
  if (!user || !user.id || !user.email) 
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  // Default role is cashier (can be upgraded later via admin UI)
  const { data, error } = await supabase
    .from('users')
    .upsert({ id: user.id, name: user.email, role: 'cashier' })
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Profile created/updated', profile: data })
}
