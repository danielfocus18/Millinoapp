import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

interface OrderItem {
  product_id: number
  quantity: number
  unit_price: number
  pricing_type?: string
  discount_percent?: number
  line_total?: number
}

export async function POST(request: Request) {
  const body = await request.json()
  const { cashier_id, items, gross_amount, discount_amount, net_amount, payment_method } = body

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No items in order' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Insert order with gross/discount/net breakdown
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      cashier_id: cashier_id || null,
      total: net_amount,           // keep total = net for backwards compat
      gross_amount: gross_amount,
      discount_amount: discount_amount,
      net_amount: net_amount,
      payment_method: payment_method ?? 'cash',
      status: 'completed',
    })
    .select()
    .single()

  if (orderError) {
    // Fallback: try without new columns (in case migration not yet run)
    const { data: orderFallback, error: fallbackError } = await supabase
      .from('orders')
      .insert({ cashier_id: cashier_id || null, total: net_amount, status: 'completed' })
      .select()
      .single()
    if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 })
    Object.assign(order ?? {}, orderFallback)
    if (!order) return NextResponse.json({ error: 'Order creation failed' }, { status: 500 })
  }

  // Insert order items
  const orderItems = (items as OrderItem[]).map((item) => ({
    order_id: (order ?? {}).id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    pricing_type: item.pricing_type ?? 'normal',
    discount_percent: item.discount_percent ?? 0,
    line_total: item.line_total ?? item.unit_price * item.quantity,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) {
    // Fallback without new columns
    const fallbackItems = (items as OrderItem[]).map((item) => ({
      order_id: (order ?? {}).id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))
    await supabase.from('order_items').insert(fallbackItems)
  }

  // Decrement stock
  for (const item of items as OrderItem[]) {
    const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single()
    if (prod) {
      await supabase.from('products').update({ stock: Math.max(0, prod.stock - item.quantity) }).eq('id', item.product_id)
    }
  }

  return NextResponse.json({ order })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? 'all'

  const supabase = createAdminClient()

  let query = supabase
    .from('orders')
    .select('*, users(name), order_items(*, products(name))')
    .order('created_at', { ascending: false })
    .limit(200)

  const now = new Date()
  if (period === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    query = query.gte('created_at', start.toISOString())
  } else if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7)
    query = query.gte('created_at', start.toISOString())
  } else if (period === 'month') {
    const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0)
    query = query.gte('created_at', start.toISOString())
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data })
}
