'use client'
import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'
interface Summary { grossSales: number; discountImpact: number; netSales: number; freeValue: number; totalExpenses: number; netProfit: number }
interface ProductRow { name: string; qty: number; normalSales: number; discountSales: number; freeQty: number; totalRevenue: number }

const COLORS = ['#F05A28','#F59E0B','#16A34A','#8B5CF6','#0284C7','#EC4899','#14B8A6','#F97316']

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('daily')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [summary, setSummary] = useState<Summary | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [orderCount, setOrderCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/reports?period=${period}&date=${date}`)
      const d = await r.json()
      setSummary(d.summary); setProducts(d.products ?? []); setOrderCount(d.orderCount ?? 0)
    } finally { setLoading(false) }
  }, [period, date])

  useEffect(() => { load() }, [load])

  function exportCSV() {
    const rows = ['Product,Qty,Normal,Discount Sales,Free Qty,Total Revenue',
      ...products.map(p => `"${p.name}",${p.qty},${p.normalSales.toFixed(2)},${p.discountSales.toFixed(2)},${p.freeQty},${p.totalRevenue.toFixed(2)}`)]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `millino_${period}_${date}.csv`; a.click()
  }

  // Top 8 products for bar chart
  const top8 = products.slice(0, 8)

  // Pie chart data: revenue by pricing type
  const normalTotal   = products.reduce((s, p) => s + p.normalSales, 0)
  const discountTotal = products.reduce((s, p) => s + p.discountSales, 0)
  const freeTotal     = products.reduce((s, p) => s + p.freeQty * 0, 0) // value given free
  const pieData = [
    { name: 'Normal Sales',   value: parseFloat(normalTotal.toFixed(2)),   fill: '#F05A28' },
    { name: 'Discount Sales', value: parseFloat(discountTotal.toFixed(2)), fill: '#F59E0B' },
    ...(summary?.freeValue ? [{ name: 'Free Items', value: parseFloat(summary.freeValue.toFixed(2)), fill: '#16A34A' }] : []),
  ].filter(d => d.value > 0)

  const summaryCards = summary ? [
    { label: 'Gross Sales',     value: summary.grossSales,     icon: '📊', color: 'var(--orange)', note: 'Before discounts' },
    { label: 'Discounts',       value: summary.discountImpact, icon: '🏷️', color: 'var(--amber)',  note: 'Total discounted' },
    { label: 'Net Sales',       value: summary.netSales,        icon: '💰', color: 'var(--green)',  note: 'Collected' },
    { label: 'Free Items',      value: summary.freeValue,       icon: '🎁', color: '#8B5CF6',       note: 'Complimentary' },
    { label: 'Expenses',        value: summary.totalExpenses,   icon: '💸', color: 'var(--red)',    note: 'Business costs' },
    { label: 'Net Profit',      value: summary.netProfit,       icon: '📈', color: summary.netProfit >= 0 ? 'var(--green)' : 'var(--red)', note: 'Revenue − Costs' },
  ] : []

  const cardStyle: React.CSSProperties = { background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, padding: '1.125rem 1rem' }

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: '1.75rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Reports</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 4 }}>Sales analytics & product breakdown</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {products.length > 0 && <button onClick={exportCSV} className="btn btn-outline btn-sm">⬇ CSV</button>}
          <button onClick={() => window.print()} className="btn btn-ghost btn-sm">🖨 Print</button>
          <button onClick={load} disabled={loading} className="btn btn-primary btn-sm">{loading ? '…' : '↻ Refresh'}</button>
        </div>
      </div>

      {/* Period controls */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['daily','weekly','monthly','yearly'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className="btn btn-sm" style={{
              background: period === p ? 'var(--ink)' : 'transparent', color: period === p ? '#fff' : 'var(--text-2)',
              border: `1.5px solid ${period === p ? 'var(--ink)' : 'var(--border-2)'}`, textTransform: 'capitalize',
            }}>{p}</button>
          ))}
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" style={{ width: 160 }} />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, marginLeft: 'auto' }}>
          {orderCount} completed order{orderCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {summaryCards.map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontWeight: 900, fontSize: '1.3rem', color: s.color, lineHeight: 1 }}>GH₵{Number(s.value).toFixed(2)}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-2)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 2 }}>{s.note}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>Loading charts…</div>
      ) : products.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>No sales data for this period</div>
      ) : (
        <>
          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: '1.5rem' }}>
            {/* Bar chart — top products */}
            <div style={cardStyle}>
              <div style={{ fontWeight: 800, color: 'var(--text-1)', marginBottom: 16, fontSize: '0.9rem' }}>Top Products by Revenue</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={top8} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#A8917E' }} tickLine={false} axisLine={false}
                    tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                  <YAxis tick={{ fontSize: 10, fill: '#A8917E' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `₵${v}`} />
                  <Tooltip formatter={(v: unknown) => [`GH₵${(v as number).toFixed(2)}`, 'Revenue']}
                    contentStyle={{ borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 12 }} />
                  <Bar dataKey="totalRevenue" radius={[6, 6, 0, 0]}>
                    {top8.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart — sales by type */}
            {pieData.length > 0 && (
              <div style={{ ...cardStyle, minWidth: 240 }}>
                <div style={{ fontWeight: 800, color: 'var(--text-1)', marginBottom: 16, fontSize: '0.9rem' }}>Sales by Type</div>
                <PieChart width={220} height={220}>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => `GH₵${(v as number).toFixed(2)}`}
                    contentStyle={{ borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </div>
            )}
          </div>

          {/* Product table */}
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
