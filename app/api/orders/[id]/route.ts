import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// Update order status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status } = await request.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ order: data })
}

// Permanently delete an order and its items
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  // Delete order_items first (foreign key constraint)
  const { error: itemsErr } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', id)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  // Delete the order itself
  const { error: orderErr } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)
  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
