import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: Request) {
  const body = await request.json()
  const { cashier_id, items, total } = body

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No items in order' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Create the order (status = completed immediately for POS)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ cashier_id: cashier_id || null, total, status: 'completed' })
    .select()
    .single()

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  // Insert order items
  const orderItems = items.map((item: { product_id: number; quantity: number; unit_price: number }) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  // Decrement stock for each product
  for (const item of items as { product_id: number; quantity: number }[]) {
    const { data: prod } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single()

    if (prod) {
      await supabase
        .from('products')
        .update({ stock: Math.max(0, prod.stock - item.quantity) })
        .eq('id', item.product_id)
    }
  }

  return NextResponse.json({ order })
}

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name))')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data })
}
