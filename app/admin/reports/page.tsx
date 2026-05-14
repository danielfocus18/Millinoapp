'use client'
import { useEffect, useState, useCallback } from 'react'

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface Summary {
  grossSales: number; discountImpact: number; netSales: number
  freeValue: number; totalExpenses: number; netProfit: number
}

interface ProductRow {
  name: string; qty: number; normalSales: number
  discountSales: number; freeQty: number; totalRevenue: number
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('daily')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [summary, setSummary] = useState<Summary | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [orderCount, setOrderCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?period=${period}&date=${date}`)
      const data = await res.json()
      setSummary(data.summary)
      setProducts(data.products ?? [])
      setOrderCount(data.orderCount ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [period, date])

  useEffect(() => { loadReport() }, [loadReport])

  const periods: { value: Period; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ]

  const summaryCards = summary ? [
    { label: 'Gross Sales',     value: summary.grossSales,    icon: '📊', color: 'var(--brand-orange)', note: 'Before discounts' },
    { label: 'Discount Impact', value: summary.discountImpact, icon: '🏷️', color: 'var(--brand-amber)', note: 'Total discounted' },
    { label: 'Net Sales',       value: summary.netSales,      icon: '💰', color: 'var(--success)',      note: 'Actual collected' },
    { label: 'Free Items Value',value: summary.freeValue,     icon: '🎁', color: '#8B5CF6',             note: 'Value given free' },
    { label: 'Total Expenses',  value: summary.totalExpenses, icon: '💸', color: 'var(--brand-red)',    note: 'Business costs' },
    { label: 'Net Profit',      value: summary.netProfit,     icon: '📈', color: summary.netProfit >= 0 ? 'var(--success)' : 'var(--brand-red)', note: 'Net – Expenses' },
  ] : []

  function handleExportCSV() {
    if (!products.length) return
    const header = 'Product Name,Quantity Sold,Normal Sales (GH₵),Discount Sales (GH₵),Free Qty,Total Revenue (GH₵)'
    const rows = products.map(p =>
      `"${p.name}",${p.qty},${p.normalSales.toFixed(2)},${p.discountSales.toFixed(2)},${p.freeQty},${p.totalRevenue.toFixed(2)}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `MillinoChops_${period}_${date}.csv`; a.click()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Sales Reports</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Financial summary & product breakdown</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {products.length > 0 && (
            <button onClick={handleExportCSV} className="btn btn-outline btn-sm">⬇ Export CSV</button>
          )}
          <button onClick={() => window.print()} className="btn btn-ghost btn-sm">🖨️ Print</button>
          <button onClick={loadReport} disabled={loading} className="btn btn-primary btn-sm">
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex gap-1.5">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className="btn btn-sm"
              style={{
                background: period === p.value ? 'var(--brand-orange)' : 'transparent',
                color: period === p.value ? '#fff' : 'var(--text-secondary)',
                border: `1.5px solid ${period === p.value ? 'var(--brand-orange)' : 'var(--border)'}`,
              }}
            >{p.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
            style={{ width: 160 }}
          />
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {orderCount} completed order{orderCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {summaryCards.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
            </div>
            <div className="font-black text-2xl" style={{ color: s.color }}>
              GH₵ {Number(s.value).toFixed(2)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.note}</div>
          </div>
        ))}
      </div>

      {/* Product Breakdown */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Product Breakdown</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Sorted by total revenue</p>
        </div>
        {loading ? (
          <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Loading…</div>
        ) : products.length === 0 ? (
          <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>No sales data for this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-base)' }}>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Product</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Qty Sold</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Normal Sales</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Discount Sales</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Free Qty</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.name} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 1 ? 'var(--surface-base)' : undefined }}>
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                    <td className="px-5 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{p.qty}</td>
                    <td className="px-5 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {p.normalSales > 0 ? `GH₵${p.normalSales.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right" style={{ color: p.discountSales > 0 ? 'var(--brand-amber)' : 'var(--text-muted)' }}>
                      {p.discountSales > 0 ? `GH₵${p.discountSales.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right" style={{ color: p.freeQty > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {p.freeQty > 0 ? p.freeQty : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-bold" style={{ color: 'var(--brand-orange)' }}>
                      GH₵{p.totalRevenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', background: '#FFF7ED' }}>
                  <td className="px-5 py-3 font-black" style={{ color: 'var(--text-primary)' }}>TOTAL</td>
                  <td className="px-5 py-3 text-right font-bold">{products.reduce((s, p) => s + p.qty, 0)}</td>
                  <td className="px-5 py-3 text-right font-bold">GH₵{products.reduce((s, p) => s + p.normalSales, 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-bold">GH₵{products.reduce((s, p) => s + p.discountSales, 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-bold">{products.reduce((s, p) => s + p.freeQty, 0)}</td>
                  <td className="px-5 py-3 text-right font-black" style={{ color: 'var(--brand-orange)' }}>
                    GH₵{products.reduce((s, p) => s + p.totalRevenue, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
