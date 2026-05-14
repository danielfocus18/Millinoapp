import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function getDateRange(period: string, date: string) {
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
  } else { // yearly
    start = new Date(ref.getFullYear(), 0, 1)
    end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999)
  }
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? 'daily'
  const date = searchParams.get('date') ?? ''

  const supabase = createAdminClient()
  const { start, end } = getDateRange(period, date)

  // Financial summary
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

  // Product breakdown
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*, products(name, price), orders!inner(created_at, status)')
    .gte('orders.created_at', start)
    .lte('orders.created_at', end)
    .eq('orders.status', 'completed')

  const ordersArr = orders ?? []
  const expensesArr = expenses ?? []
  const itemsArr = orderItems ?? []

  // Totals
  const grossSales = ordersArr.reduce((s, o) => s + Number(o.gross_amount ?? o.total ?? 0), 0)
  const discountImpact = ordersArr.reduce((s, o) => s + Number(o.discount_amount ?? 0), 0)
  const netSales = ordersArr.reduce((s, o) => s + Number(o.net_amount ?? o.total ?? 0), 0)
  const totalExpenses = expensesArr.reduce((s, e) => s + Number(e.amount), 0)
  const netProfit = netSales - totalExpenses

  // Free items value (items priced as free)
  const freeValue = itemsArr
    .filter((i: { pricing_type?: string; unit_price: number; quantity: number }) => i.pricing_type === 'free')
    .reduce((s: number, i: { unit_price: number; quantity: number }) => s + Number(i.unit_price) * i.quantity, 0)

  // Product breakdown aggregation
  const productMap: Record<string, {
    name: string; qty: number; normalSales: number; discountSales: number; freeQty: number; totalRevenue: number
  }> = {}

  for (const item of itemsArr as {
    product_id: number; products: { name: string; price: number } | null
    quantity: number; unit_price: number; pricing_type?: string; line_total?: number
  }[]) {
    const name = item.products?.name ?? `Product #${item.product_id}`
    if (!productMap[name]) productMap[name] = { name, qty: 0, normalSales: 0, discountSales: 0, freeQty: 0, totalRevenue: 0 }
    const row = productMap[name]
    const lineTotal = Number(item.line_total ?? item.unit_price * item.quantity)
    row.qty += item.quantity
    row.totalRevenue += lineTotal
    if (item.pricing_type === 'normal' || !item.pricing_type) row.normalSales += lineTotal
    else if (item.pricing_type === 'discount') row.discountSales += lineTotal
    else if (item.pricing_type === 'free') row.freeQty += item.quantity
  }

  const productRows = Object.values(productMap).sort((a, b) => b.totalRevenue - a.totalRevenue)

  return NextResponse.json({
    summary: { grossSales, discountImpact, netSales, freeValue, totalExpenses, netProfit },
    products: productRows,
    orderCount: ordersArr.length,
    period,
    dateRange: { start, end },
  })
}
