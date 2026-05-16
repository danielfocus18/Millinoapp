import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

interface RawItem {
  product_id: string
  quantity: number
  unit_price: number
  pricing_type?: string
  discount_percent?: number
  line_total?: number
}

export async function POST(request: Request) {
  const body = await request.json()
  const { cashier_id, items, gross_amount, discount_amount, net_amount, payment_method } = body

  if (!items || items.length === 0)
    return NextResponse.json({ error: 'No items in order' }, { status: 400 })

  const supabase = createAdminClient()
  const netTotal = net_amount ?? items.reduce((s: number, i: RawItem) => s + (i.line_total ?? i.unit_price * i.quantity), 0)

  // Try inserting with all extended columns first
  let order: Record<string, unknown> | null = null

  const fullPayload = {
    cashier_id: cashier_id || null,
    total: netTotal,
    gross_amount: gross_amount ?? netTotal,
    discount_amount: discount_amount ?? 0,
    net_amount: netTotal,
    payment_method: payment_method ?? 'cash',
    status: 'completed',
  }

  const { data: fullOrder, error: fullErr } = await supabase
    .from('orders').insert(fullPayload).select().single()

  if (fullErr) {
    // Columns not yet migrated — fall back to base schema only
    const { data: baseOrder, error: baseErr } = await supabase
      .from('orders')
      .insert({ cashier_id: cashier_id || null, total: netTotal, status: 'completed' })
      .select().single()
    if (baseErr) return NextResponse.json({ error: baseErr.message }, { status: 500 })
    order = baseOrder
  } else {
    order = fullOrder
  }

  // Insert order items — try extended columns, fall back to base
  const fullItems = (items as RawItem[]).map(i => ({
    order_id: order!.id,
    product_id: i.product_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    pricing_type: i.pricing_type ?? 'normal',
    discount_percent: i.discount_percent ?? 0,
    line_total: i.line_total ?? i.unit_price * i.quantity,
  }))

  const { error: itemsErr } = await supabase.from('order_items').insert(fullItems)
  if (itemsErr) {
    // Fall back to base columns only
    const baseItems = (items as RawItem[]).map(i => ({
      order_id: order!.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
    }))
    const { error: baseItemsErr } = await supabase.from('order_items').insert(baseItems)
    if (baseItemsErr) return NextResponse.json({ error: baseItemsErr.message }, { status: 500 })
  }

  // Decrement stock
  for (const item of items as RawItem[]) {
    const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single()
    if (prod) {
      await supabase.from('products').update({ stock: Math.max(0, prod.stock - item.quantity) }).eq('id', item.product_id)
    }
  }

  return NextResponse.json({ order })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? 'today'
  const supabase = createAdminClient()

  let query = supabase
    .from('orders')
    .select('*, users(name), order_items(*, products(name))')
    .order('created_at', { ascending: false })

  const now = new Date()
  if (period === 'today') {
    const s = new Date(now); s.setHours(0, 0, 0, 0)
    query = query.gte('created_at', s.toISOString())
  } else if (period === 'week') {
    const s = new Date(now); s.setDate(now.getDate() - 7)
    query = query.gte('created_at', s.toISOString())
  } else if (period === 'month') {
    const s = new Date(now); s.setDate(1); s.setHours(0, 0, 0, 0)
    query = query.gte('created_at', s.toISOString())
  }

  const { data, error } = await query.limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data })
}
