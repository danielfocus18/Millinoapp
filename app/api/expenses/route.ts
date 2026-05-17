import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') ?? 'today'
  const supabase = createAdminClient()

  let query = supabase.from('expenses').select('*').order('created_at', { ascending: false })
  const now = new Date()
  if (filter === 'today') {
    const s = new Date(now); s.setHours(0,0,0,0)
    query = query.gte('created_at', s.toISOString())
  } else if (filter === 'week') {
    const s = new Date(now); s.setDate(now.getDate()-7)
    query = query.gte('created_at', s.toISOString())
  } else if (filter === 'month') {
    const s = new Date(now); s.setDate(1); s.setHours(0,0,0,0)
    query = query.gte('created_at', s.toISOString())
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expenses: data })
}

export async function POST(request: Request) {
  const { description, amount, recorded_by } = await request.json()
  if (!description?.trim() || !amount) return NextResponse.json({ error: 'Description and amount required' }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('expenses')
    .insert({ description: description.trim(), amount: parseFloat(amount), recorded_by: recorded_by ?? null })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expense: data })
}
