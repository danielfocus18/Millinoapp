'use client'
import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid } from 'recharts'
import * as XLSX from 'xlsx'
import {
  ChartBar, Tag, Banknote, Receipt, Gift, Wallet, TrendingUp,
  Download, Printer, RefreshCw, CheckCircle2, XCircle,
} from 'lucide-react'

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'
interface Summary { grossSales: number; discountImpact: number; netSales: number; freeValue: number; totalExpenses: number; netProfit: number; avgOrderValue: number }
interface ProductRow { name: string; qty: number; normalSales: number; discountSales: number; freeQty: number; totalRevenue: number }
interface CategoryRow { name: string; qty: number; revenue: number }
interface PaymentRow { method: string; revenue: number; count: number }
interface CashierRow { name: string; revenue: number; orders: number }
interface TrendPoint { label: string; revenue: number }
interface Msg { type: 'success' | 'error'; text: string }

const COLORS = ['#F05A28','#F59E0B','#16A34A','#8B5CF6','#0284C7','#EC4899','#14B8A6','#F97316']
const CAT_COLORS: Record<string, string> = { Meals: '#F05A28', Pastries: '#F59E0B', Drinks: '#0284C7' }
const PM_COLORS: Record<string, string> = { Cash: '#16A34A', 'Mobile Money': '#8B5CF6', Card: '#0284C7' }

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('daily')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [summary, setSummary] = useState<Summary | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryRow[]>([])
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentRow[]>([])
  const [cashierBreakdown, setCashierBreakdown] = useState<CashierRow[]>([])
  const [revenueTrend, setRevenueTrend] = useState<TrendPoint[]>([])
  const [trendGranularity, setTrendGranularity] = useState('hour')
  const [orderCount, setOrderCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exportMsg, setExportMsg] = useState<Msg | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/reports?period=${period}&date=${date}`)
      const d = await r.json()
      setSummary(d.summary)
      setProducts(d.products ?? [])
      setCategoryBreakdown(d.categoryBreakdown ?? [])
      setPaymentBreakdown(d.paymentBreakdown ?? [])
      setCashierBreakdown(d.cashierBreakdown ?? [])
      setRevenueTrend(d.revenueTrend ?? [])
      setTrendGranularity(d.trendGranularity ?? 'hour')
      setOrderCount(d.orderCount ?? 0)
    } finally { setLoading(false) }
  }, [period, date])

  useEffect(() => { load() }, [load])

  function downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.style.display = 'none'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function exportCSV() {
    if (!products.length) { setExportMsg({ type: 'error', text: 'No data to export' }); setTimeout(() => setExportMsg(null), 3000); return }
    try {
      const header = 'Product,Qty Sold,Normal Sales (GH₵),Discount Sales (GH₵),Free Qty,Total Revenue (GH₵)'
      const rows = products.map(p => `"${p.name.replace(/"/g, '""')}",${p.qty},${p.normalSales.toFixed(2)},${p.discountSales.toFixed(2)},${p.freeQty},${p.totalRevenue.toFixed(2)}`)
      const csv = '\uFEFF' + [header, ...rows].join('\r\n')
      downloadFile(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `millino-chops_${period}_${date}.csv`)
      setExportMsg({ type: 'success', text: 'CSV downloaded' })
    } catch (err) { setExportMsg({ type: 'error', text: (err as Error).message }) }
    setTimeout(() => setExportMsg(null), 3000)
  }

  function exportExcel() {
    if (!products.length) { setExportMsg({ type: 'error', text: 'No data to export' }); setTimeout(() => setExportMsg(null), 3000); return }
    try {
      const wb = XLSX.utils.book_new()
      if (summary) {
        const summaryRows = [
          { Metric: 'Period', Value: period }, { Metric: 'Date', Value: date },
          { Metric: 'Completed Orders', Value: orderCount },
          { Metric: 'Gross Sales (GH₵)', Value: Number(summary.grossSales.toFixed(2)) },
          { Metric: 'Discounts Given (GH₵)', Value: Number(summary.discountImpact.toFixed(2)) },
          { Metric: 'Net Sales (GH₵)', Value: Number(summary.netSales.toFixed(2)) },
          { Metric: 'Avg Order Value (GH₵)', Value: Number(summary.avgOrderValue.toFixed(2)) },
          { Metric: 'Free Items Value (GH₵)', Value: Number(summary.freeValue.toFixed(2)) },
          { Metric: 'Total Expenses (GH₵)', Value: Number(summary.totalExpenses.toFixed(2)) },
          { Metric: 'Net Profit (GH₵)', Value: Number(summary.netProfit.toFixed(2)) },
        ]
        const ws1 = XLSX.utils.json_to_sheet(summaryRows); ws1['!cols'] = [{ wch: 24 }, { wch: 16 }]
        XLSX.utils.book_append_sheet(wb, ws1, 'Summary')
      }
      const ws2 = XLSX.utils.json_to_sheet(products.map(p => ({
        'Product': p.name, 'Qty Sold': p.qty, 'Normal Sales (GH₵)': Number(p.normalSales.toFixed(2)),
        'Discount Sales (GH₵)': Number(p.discountSales.toFixed(2)), 'Free Qty': p.freeQty, 'Total Revenue (GH₵)': Number(p.totalRevenue.toFixed(2)),
      })))
      ws2['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 16 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Product Breakdown')

      if (categoryBreakdown.length) {
        const ws3 = XLSX.utils.json_to_sheet(categoryBreakdown.map(c => ({ Category: c.name, 'Qty Sold': c.qty, 'Revenue (GH₵)': Number(c.revenue.toFixed(2)) })))
        ws3['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 16 }]
        XLSX.utils.book_append_sheet(wb, ws3, 'Category Breakdown')
      }
      if (cashierBreakdown.length) {
        const ws4 = XLSX.utils.json_to_sheet(cashierBreakdown.map(c => ({ Cashier: c.name, Orders: c.orders, 'Revenue (GH₵)': Number(c.revenue.toFixed(2)) })))
        ws4['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 16 }]
        XLSX.utils.book_append_sheet(wb, ws4, 'Staff Performance')
      }

      XLSX.writeFile(wb, `millino-chops_${period}_${date}.xlsx`)
      setExportMsg({ type: 'success', text: 'Excel file downloaded' })
    } catch (err) { setExportMsg({ type: 'error', text: (err as Error).message }) }
    setTimeout(() => setExportMsg(null), 3000)
  }

  const top8 = products.slice(0, 8)
  const normalTotal = products.reduce((s, p) => s + p.normalSales, 0)
  const discountTotalAmt = products.reduce((s, p) => s + p.discountSales, 0)
  const typePieData = [
    { name: 'Normal Sales', value: parseFloat(normalTotal.toFixed(2)), fill: '#F05A28' },
    { name: 'Discount Sales', value: parseFloat(discountTotalAmt.toFixed(2)), fill: '#F59E0B' },
    ...(summary?.freeValue ? [{ name: 'Free Items', value: parseFloat(summary.freeValue.toFixed(2)), fill: '#16A34A' }] : []),
  ].filter(d => d.value > 0)

  const summaryCards = summary ? [
    { label: 'Gross Sales',    value: `GH₵${summary.grossSales.toFixed(2)}`,    icon: ChartBar,  color: 'var(--orange)', note: 'Before discounts' },
    { label: 'Discounts',      value: `GH₵${summary.discountImpact.toFixed(2)}`,icon: Tag,        color: 'var(--amber)',  note: 'Total discounted' },
    { label: 'Net Sales',      value: `GH₵${summary.netSales.toFixed(2)}`,       icon: Banknote,   color: 'var(--green)',  note: 'Collected' },
    { label: 'Avg Order Value',value: `GH₵${summary.avgOrderValue.toFixed(2)}`,  icon: Receipt,    color: '#0284C7',       note: `Across ${orderCount} orders` },
    { label: 'Free Items',     value: `GH₵${summary.freeValue.toFixed(2)}`,      icon: Gift,       color: '#8B5CF6',       note: 'Complimentary' },
    { label: 'Expenses',       value: `GH₵${summary.totalExpenses.toFixed(2)}`,  icon: Wallet,     color: 'var(--red)',    note: 'Business costs' },
    { label: 'Net Profit',     value: `GH₵${summary.netProfit.toFixed(2)}`,      icon: TrendingUp, color: summary.netProfit >= 0 ? 'var(--green)' : 'var(--red)', note: 'Revenue − Costs' },
  ] : []

  const cardStyle: React.CSSProperties = { background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, padding: '1.125rem 1rem' }
  const trendLabel = trendGranularity === 'hour' ? 'Revenue by Hour of Day' : trendGranularity === 'month' ? 'Revenue by Month' : 'Revenue by Day'

  return (
    <div style={{ padding: '2rem', maxWidth: 1180, margin: '0 auto' }}>

      {/* Print-only header */}
      <div className="print-only" style={{ display: 'none', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 900, fontSize: '1.4rem', color: '#000' }}>MILLINO CHOPS</div>
        <div style={{ fontSize: '0.9rem', color: '#333', marginTop: 2 }}>
          Sales Report — {period.charAt(0).toUpperCase() + period.slice(1)} — {date}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#555', marginTop: 2 }}>
          {orderCount} completed order{orderCount !== 1 ? 's' : ''} · Generated {new Date().toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      </div>

      {/* Header */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: '1.75rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Reports</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 4 }}>Sales analytics & product breakdown</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {exportMsg && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 700, color: exportMsg.type === 'success' ? 'var(--green)' : 'var(--red)' }}>
              {exportMsg.type === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {exportMsg.text}
            </span>
          )}
          <button onClick={exportCSV} disabled={!products.length} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={14} /> CSV
          </button>
          <button onClick={exportExcel} disabled={!products.length} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={14} /> Excel
          </button>
          <button onClick={() => window.print()} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Printer size={14} /> Print
          </button>
          <button onClick={load} disabled={loading} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {loading ? '…' : <><RefreshCw size={14} /> Refresh</>}
          </button>
        </div>
      </div>

      {/* Period controls */}
      <div className="no-print" style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['daily','weekly','monthly','yearly'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className="btn btn-sm" style={{
              background: period === p ? 'var(--ink)' : 'transparent', color: period === p ? '#fff' : 'var(--text-2)',
              border: `1.5px solid ${period === p ? 'var(--ink)' : 'var(--border-2)'}`, textTransform: 'capitalize',
            }}>{p}</button>
          ))}
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" style={{ width: 160 }} />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, marginLeft: 'auto' }}>{orderCount} completed order{orderCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {summaryCards.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={cardStyle}>
              <Icon size={24} color={s.color} strokeWidth={2} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 900, fontSize: '1.25rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-2)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 2 }}>{s.note}</div>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>Loading charts…</div>
      ) : orderCount === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>No sales data for this period</div>
      ) : (
        <>
          {/* ── Revenue Trend (full width) ── */}
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, color: 'var(--text-1)', marginBottom: 16, fontSize: '0.9rem' }}>{trendLabel}</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false}
                  interval={revenueTrend.length > 15 ? Math.floor(revenueTrend.length / 10) : 0} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={v => `₵${v}`} />
                <Tooltip formatter={(v: unknown) => [`GH₵${(v as number).toFixed(2)}`, 'Revenue']}
                  contentStyle={{ borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="var(--orange)" strokeWidth={2.5} dot={revenueTrend.length <= 14} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Row: Category + Payment + Top Products ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>

            {/* Category breakdown */}
            {categoryBreakdown.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontWeight: 800, color: 'var(--text-1)', marginBottom: 12, fontSize: '0.9rem' }}>Revenue by Category</div>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={categoryBreakdown} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={3}>
                      {categoryBreakdown.map((c, i) => <Cell key={i} fill={CAT_COLORS[c.name] ?? COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => `GH₵${(v as number).toFixed(2)}`} contentStyle={{ borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.72rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Payment method breakdown */}
            {paymentBreakdown.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontWeight: 800, color: 'var(--text-1)', marginBottom: 12, fontSize: '0.9rem' }}>Revenue by Payment Method</div>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={paymentBreakdown} dataKey="revenue" nameKey="method" cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={3}>
                      {paymentBreakdown.map((p, i) => <Cell key={i} fill={PM_COLORS[p.method] ?? COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => `GH₵${(v as number).toFixed(2)}`} contentStyle={{ borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.72rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Sales by pricing type */}
            {typePieData.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontWeight: 800, color: 'var(--text-1)', marginBottom: 12, fontSize: '0.9rem' }}>Sales by Pricing Type</div>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={typePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={3}>
                      {typePieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => `GH₵${(v as number).toFixed(2)}`} contentStyle={{ borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.72rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Row: Top Products + Staff Performance ── */}
          <div style={{ display: 'grid', gridTemplateColumns: cashierBreakdown.length > 1 ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 16 }}>
            <div style={cardStyle}>
              <div style={{ fontWeight: 800, color: 'var(--text-1)', marginBottom: 16, fontSize: '0.9rem' }}>Top Products by Revenue</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={top8} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#A8917E' }} tickLine={false} axisLine={false}
                    tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                  <YAxis tick={{ fontSize: 10, fill: '#A8917E' }} tickLine={false} axisLine={false} tickFormatter={v => `₵${v}`} />
                  <Tooltip formatter={(v: unknown) => [`GH₵${(v as number).toFixed(2)}`, 'Revenue']} contentStyle={{ borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 12 }} />
                  <Bar dataKey="totalRevenue" radius={[6, 6, 0, 0]}>
                    {top8.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Staff performance — only show if more than 1 cashier has sales */}
            {cashierBreakdown.length > 1 && (
              <div style={cardStyle}>
                <div style={{ fontWeight: 800, color: 'var(--text-1)', marginBottom: 16, fontSize: '0.9rem' }}>Staff Performance</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cashierBreakdown} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={v => `₵${v}`} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: 'var(--text-2)' }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: unknown, n, p) => [`GH₵${(v as number).toFixed(2)} (${(p?.payload as CashierRow)?.orders ?? 0} orders)`, 'Revenue']}
                      contentStyle={{ borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 12 }} />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]} fill="var(--orange)">
                      {cashierBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Product table ── */}
          <div style={{ ...cardStyle, overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-1)' }}>Full Product Breakdown</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>sorted by revenue</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface)' }}>
                    {['Product','Qty Sold','Normal','Discount','Free Qty','Total Revenue'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: h === 'Product' ? 'left' : 'right', fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p.name} style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'var(--surface)' : '#fff' }}>
                      <td style={{ padding: '0.75rem 1.25rem', fontWeight: 700 }}>{p.name}</td>
                      <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', color: 'var(--text-2)' }}>{p.qty}</td>
                      <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', color: 'var(--text-2)' }}>{p.normalSales > 0 ? `GH₵${p.normalSales.toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', color: p.discountSales > 0 ? 'var(--amber)' : 'var(--text-3)' }}>{p.discountSales > 0 ? `GH₵${p.discountSales.toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', color: p.freeQty > 0 ? 'var(--green)' : 'var(--text-3)' }}>{p.freeQty > 0 ? p.freeQty : '—'}</td>
                      <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', fontWeight: 900, color: 'var(--orange)' }}>GH₵{p.totalRevenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-2)', background: '#FFF8F5' }}>
                    <td style={{ padding: '0.875rem 1.25rem', fontWeight: 900 }}>TOTAL</td>
                    <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontWeight: 800 }}>{products.reduce((s, p) => s + p.qty, 0)}</td>
                    <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontWeight: 800 }}>GH₵{products.reduce((s, p) => s + p.normalSales, 0).toFixed(2)}</td>
                    <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontWeight: 800 }}>GH₵{products.reduce((s, p) => s + p.discountSales, 0).toFixed(2)}</td>
                    <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontWeight: 800 }}>{products.reduce((s, p) => s + p.freeQty, 0)}</td>
                    <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontWeight: 900, fontSize: '1rem', color: 'var(--orange)' }}>GH₵{products.reduce((s, p) => s + p.totalRevenue, 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
