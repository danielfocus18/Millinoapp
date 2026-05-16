import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function getRange(period: string, date: string) {
  const ref = date ? new Date(date) : new Date()
  let start: Date, end: Date
  if (period === 'daily') {
    start = new Date(ref); start.setHours(0, 0, 0, 0)
    end = new Date(ref); end.setHours(23, 59, 59, 999)
  } else if (period === 'weekly') {
    end = new Date(ref); end.setHours(23, 59, 59, 999)
    start = new Date(ref); start.setDate(ref.getDate() - 6); start.setHours(0, 0, 0, 0)
  } else if (period === 'monthly') {
    start = new Date(ref.getFullYear(), ref.getMonth(), 1)
    end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999)
  } else {
    start = new Date(ref.getFullYear(), 0, 1)
    end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999)
  }
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? 'daily'
  const date   = searchParams.get('date') ?? ''
  const { start, end } = getRange(period, date)

  const supabase = createAdminClient()

  // Fetch orders — select only guaranteed columns + optional ones
  const { data: orders } = await supabase
    .from('orders')
    .select('total, gross_amount, discount_amount, net_amount')
    .eq('status', 'completed')
    .gte('created_at', start)
    .lte('created_at', end)

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .gte('created_at', start)
    .lte('created_at', end)

  // Fetch order items with product names
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, quantity, unit_price, pricing_type, discount_percent, line_total, products(name), orders!inner(status, created_at)')
    .eq('orders.status', 'completed')
    .gte('orders.created_at', start)
    .lte('orders.created_at', end)

  const ordersArr = orders ?? []
  const expensesArr = expenses ?? []
  const itemsArr = (orderItems ?? []) as unknown as {
    product_id: string
    quantity: number
    unit_price: number
    pricing_type?: string
    discount_percent?: number
    line_total?: number
    products: { name: string } | null
  }[]

  // Financial summary — use extended cols if present, fall back to total
  const grossSales    = ordersArr.reduce((s, o) => s + Number(o.gross_amount ?? o.total ?? 0), 0)
  const discountImpact = ordersArr.reduce((s, o) => s + Number(o.discount_amount ?? 0), 0)
  const netSales      = ordersArr.reduce((s, o) => s + Number(o.net_amount ?? o.total ?? 0), 0)
  const totalExpenses = expensesArr.reduce((s, e) => s + Number(e.amount), 0)
  const netProfit     = netSales - totalExpenses
  const freeValue     = itemsArr
    .filter(i => i.pricing_type === 'free')
    .reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0)

  // Product breakdown
  const productMap: Record<string, {
    name: string; qty: number; normalSales: number
    discountSales: number; freeQty: number; totalRevenue: number
  }> = {}

  for (const item of itemsArr) {
    const name = item.products?.name ?? `Product ${item.product_id}`
    if (!productMap[name]) productMap[name] = { name, qty: 0, normalSales: 0, discountSales: 0, freeQty: 0, totalRevenue: 0 }
    const row = productMap[name]
    const lineTotal = Number(item.line_total ?? item.unit_price * item.quantity)
    row.qty += item.quantity
    row.totalRevenue += lineTotal
    if (!item.pricing_type || item.pricing_type === 'normal') row.normalSales += lineTotal
    else if (item.pricing_type === 'discount') row.discountSales += lineTotal
    else if (item.pricing_type === 'free') row.freeQty += item.quantity
  }

  return NextResponse.json({
    summary: { grossSales, discountImpact, netSales, freeValue, totalExpenses, netProfit },
    products: Object.values(productMap).sort((a, b) => b.totalRevenue - a.totalRevenue),
    orderCount: ordersArr.length,
    period,
    dateRange: { start, end },
  })
}
