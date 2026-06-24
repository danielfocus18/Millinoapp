import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function getRange(period: string, date: string) {
  const ref = date ? new Date(date) : new Date()
  let start: Date, end: Date
  if (period === 'daily') {
    start = new Date(ref); start.setHours(0, 0, 0, 0)
    end   = new Date(ref); end.setHours(23, 59, 59, 999)
  } else if (period === 'weekly') {
    end   = new Date(ref); end.setHours(23, 59, 59, 999)
    start = new Date(ref); start.setDate(ref.getDate() - 6); start.setHours(0, 0, 0, 0)
  } else if (period === 'monthly') {
    start = new Date(ref.getFullYear(), ref.getMonth(), 1)
    end   = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999)
  } else {
    start = new Date(ref.getFullYear(), 0, 1)
    end   = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999)
  }
  return { start, end }
}

const HOUR_LABELS = ['12am','1am','2am','3am','4am','5am','6am','7am','8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm','10pm','11pm']
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const PAYMENT_LABELS: Record<string, string> = { cash: 'Cash', momo: 'Mobile Money', card: 'Card' }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? 'daily'
  const date   = searchParams.get('date') ?? ''
  const { start, end } = getRange(period, date)
  const startISO = start.toISOString()
  const endISO = end.toISOString()

  const supabase = createAdminClient()

  // ── One query: all completed orders in range, with cashier name ──
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total, gross_amount, discount_amount, net_amount, payment_method, cashier_id, created_at, users(name)')
    .eq('status', 'completed')
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  const ordersArr = (orders ?? []) as unknown as {
    id: string; total: number; gross_amount?: number; discount_amount?: number
    net_amount?: number; payment_method?: string; cashier_id?: string
    created_at: string; users: { name: string } | null
  }[]

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .gte('created_at', startISO)
    .lte('created_at', endISO)
  const expensesArr = expenses ?? []

  // ── Order items for completed orders only ──
  const orderIds = ordersArr.map(o => o.id)
  let itemsArr: {
    product_id: string; quantity: number; unit_price: number
    pricing_type?: string; discount_percent?: number; line_total?: number
    products: { name: string; category_id: string | null } | null
  }[] = []

  if (orderIds.length > 0) {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price, pricing_type, discount_percent, line_total, products(name, category_id)')
      .in('order_id', orderIds)
    itemsArr = (orderItems ?? []) as unknown as typeof itemsArr
  }

  // Category id → name map
  const { data: categories } = await supabase.from('categories').select('id, name')
  const catNameById: Record<string, string> = {}
  for (const c of categories ?? []) catNameById[c.id] = c.name

  // ── Core financial summary ──
  const grossSales     = ordersArr.reduce((s, o) => s + Number(o.gross_amount    ?? o.total ?? 0), 0)
  const discountImpact = ordersArr.reduce((s, o) => s + Number(o.discount_amount ?? 0), 0)
  const netSales       = ordersArr.reduce((s, o) => s + Number(o.net_amount      ?? o.total ?? 0), 0)
  const totalExpenses  = expensesArr.reduce((s, e) => s + Number(e.amount), 0)
  const netProfit      = netSales - totalExpenses
  const freeValue      = itemsArr.filter(i => i.pricing_type === 'free').reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0)
  const avgOrderValue  = ordersArr.length > 0 ? netSales / ordersArr.length : 0

  // ── Product breakdown ──
  const productMap: Record<string, { name: string; qty: number; normalSales: number; discountSales: number; freeQty: number; totalRevenue: number }> = {}
  for (const item of itemsArr) {
    const name = item.products?.name
    if (!name || !name.trim()) continue
    if (!productMap[name]) productMap[name] = { name, qty: 0, normalSales: 0, discountSales: 0, freeQty: 0, totalRevenue: 0 }
    const row = productMap[name]
    const lineTotal = Number(item.line_total ?? item.unit_price * item.quantity)
    row.qty += item.quantity
    row.totalRevenue += lineTotal
    if (!item.pricing_type || item.pricing_type === 'normal') row.normalSales += lineTotal
    else if (item.pricing_type === 'discount') row.discountSales += lineTotal
    else if (item.pricing_type === 'free') row.freeQty += item.quantity
  }

  // ── Category breakdown (Meals / Pastries / Drinks) ──
  const categoryMap: Record<string, { name: string; qty: number; revenue: number }> = {}
  for (const item of itemsArr) {
    const catId = item.products?.category_id
    const catName = catId ? (catNameById[catId] ?? 'Uncategorized') : 'Uncategorized'
    if (!categoryMap[catName]) categoryMap[catName] = { name: catName, qty: 0, revenue: 0 }
    const lineTotal = Number(item.line_total ?? item.unit_price * item.quantity)
    categoryMap[catName].qty += item.quantity
    categoryMap[catName].revenue += lineTotal
  }
  const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue)

  // ── Payment method breakdown ──
  const paymentMap: Record<string, { method: string; revenue: number; count: number }> = {}
  for (const o of ordersArr) {
    const method = o.payment_method ?? 'cash'
    const label = PAYMENT_LABELS[method] ?? method
    if (!paymentMap[label]) paymentMap[label] = { method: label, revenue: 0, count: 0 }
    paymentMap[label].revenue += Number(o.net_amount ?? o.total ?? 0)
    paymentMap[label].count += 1
  }
  const paymentBreakdown = Object.values(paymentMap).sort((a, b) => b.revenue - a.revenue)

  // ── Cashier / staff performance ──
  const cashierMap: Record<string, { name: string; revenue: number; orders: number }> = {}
  for (const o of ordersArr) {
    const name = o.users?.name ?? 'Unknown'
    if (!cashierMap[name]) cashierMap[name] = { name, revenue: 0, orders: 0 }
    cashierMap[name].revenue += Number(o.net_amount ?? o.total ?? 0)
    cashierMap[name].orders += 1
  }
  const cashierBreakdown = Object.values(cashierMap).sort((a, b) => b.revenue - a.revenue)

  // ── Revenue trend — bucketed by period type ──
  // daily   → by hour of day (24 buckets, Ghana = UTC, no offset needed)
  // weekly/monthly → by calendar day across the range
  // yearly  → by month
  let revenueTrend: { label: string; revenue: number }[] = []
  let trendGranularity = 'hour'

  if (period === 'daily') {
    trendGranularity = 'hour'
    const buckets = new Array(24).fill(0)
    for (const o of ordersArr) {
      const h = new Date(o.created_at).getUTCHours()
      buckets[h] += Number(o.net_amount ?? o.total ?? 0)
    }
    revenueTrend = HOUR_LABELS.map((label, i) => ({ label, revenue: buckets[i] }))
  } else if (period === 'yearly') {
    trendGranularity = 'month'
    const buckets = new Array(12).fill(0)
    for (const o of ordersArr) {
      const m = new Date(o.created_at).getUTCMonth()
      buckets[m] += Number(o.net_amount ?? o.total ?? 0)
    }
    revenueTrend = MONTH_LABELS.map((label, i) => ({ label, revenue: buckets[i] }))
  } else {
    trendGranularity = 'day'
    const dayBuckets: Record<string, number> = {}
    const cursor = new Date(start)
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10)
      dayBuckets[key] = 0
      cursor.setDate(cursor.getDate() + 1)
    }
    for (const o of ordersArr) {
      const key = new Date(o.created_at).toISOString().slice(0, 10)
      if (key in dayBuckets) dayBuckets[key] += Number(o.net_amount ?? o.total ?? 0)
    }
    revenueTrend = Object.entries(dayBuckets).map(([key, revenue]) => ({
      label: new Date(key).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' }),
      revenue,
    }))
  }

  return NextResponse.json({
    summary: { grossSales, discountImpact, netSales, freeValue, totalExpenses, netProfit, avgOrderValue },
    products: Object.values(productMap).sort((a, b) => b.totalRevenue - a.totalRevenue),
    categoryBreakdown,
    paymentBreakdown,
    cashierBreakdown,
    revenueTrend,
    trendGranularity,
    orderCount: ordersArr.length,
    period,
    dateRange: { start: startISO, end: endISO },
  })
}
