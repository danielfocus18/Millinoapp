'use client'
import { useEffect, useState } from 'react'

interface Stats {
  todayRevenue: number; todayOrders: number; todayDiscount: number
  totalProducts: number; lowStock: number; todayExpenses: number; netProfit: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports?period=daily')
      .then(r => r.json())
      .then(data => {
        setStats({
          todayRevenue: data.summary?.netSales ?? 0,
          todayOrders: data.orderCount ?? 0,
          todayDiscount: data.summary?.discountImpact ?? 0,
          totalProducts: 0,
          lowStock: 0,
          todayExpenses: data.summary?.totalExpenses ?? 0,
          netProfit: data.summary?.netProfit ?? 0,
        })
      })
      .catch(() => {})

    // Fetch product stats separately
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        const prods = data.products ?? []
        setStats(prev => prev ? {
          ...prev,
          totalProducts: prods.length,
          lowStock: prods.filter((p: { stock: number }) => p.stock < 5).length,
        } : prev)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const statCards = stats ? [
    { label: "Today's Net Revenue", value: `GH₵ ${stats.todayRevenue.toFixed(2)}`, icon: '💰', color: 'var(--success)', bg: '#F0FDF4' },
    { label: "Today's Orders", value: stats.todayOrders, icon: '🧾', color: 'var(--brand-orange)', bg: '#FFF7ED' },
    { label: 'Discount Given', value: `GH₵ ${stats.todayDiscount.toFixed(2)}`, icon: '🏷️', color: 'var(--brand-amber)', bg: '#FFFBEB' },
    { label: "Today's Expenses", value: `GH₵ ${stats.todayExpenses.toFixed(2)}`, icon: '💸', color: 'var(--brand-red)', bg: '#FEF2F2' },
    { label: 'Net Profit', value: `GH₵ ${stats.netProfit.toFixed(2)}`, icon: '📈', color: stats.netProfit >= 0 ? 'var(--success)' : 'var(--brand-red)', bg: stats.netProfit >= 0 ? '#F0FDF4' : '#FEF2F2' },
    { label: 'Low Stock Items', value: stats.lowStock, icon: '⚠️', color: stats.lowStock > 0 ? 'var(--brand-red)' : 'var(--text-muted)', bg: stats.lowStock > 0 ? '#FEF2F2' : 'var(--surface-base)' },
  ] : []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {new Date().toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl text-xl" style={{ background: s.bg }}>{s.icon}</div>
              </div>
              <div className="font-black text-2xl" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-5">
        <div className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>QUICK ACTIONS</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { href: '/admin/orders',     icon: '🧾', label: 'View Orders' },
            { href: '/admin/products',   icon: '📦', label: 'Manage Products' },
            { href: '/admin/categories', icon: '🏷️', label: 'Categories' },
            { href: '/admin/expenses',   icon: '💸', label: 'Log Expense' },
            { href: '/admin/reports',    icon: '📈', label: 'Sales Reports' },
            { href: '/pos',              icon: '🛒', label: 'Open POS' },
          ].map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 p-3.5 rounded-xl transition-all"
              style={{ background: 'var(--surface-base)', border: '1px solid var(--border)', textDecoration: 'none' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-orange)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >
              <span className="text-xl">{a.icon}</span>
              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
