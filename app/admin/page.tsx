'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Stats {
  todayRevenue: number; todayOrders: number; todayDiscount: number
  totalProducts: number; lowStock: number; todayExpenses: number; netProfit: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')
  const [productCount, setProductCount] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/reports?period=daily').then(r => r.json()).catch(() => ({})),
      fetch('/api/products').then(r => r.json()).catch(() => ({ products: [] })),
    ]).then(([report, prodData]) => {
      const prods = prodData.products ?? []
      setProductCount(prods.length)
      setStats({
        todayRevenue: report.summary?.netSales ?? 0,
        todayOrders: report.orderCount ?? 0,
        todayDiscount: report.summary?.discountImpact ?? 0,
        totalProducts: prods.length,
        lowStock: prods.filter((p: { stock: number }) => p.stock < 5).length,
        todayExpenses: report.summary?.totalExpenses ?? 0,
        netProfit: report.summary?.netProfit ?? 0,
      })
      setLoading(false)
    })
  }, [])

  async function handleSeed() {
    setSeeding(true); setSeedMsg('')
    const res = await fetch('/api/seed', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      setSeedMsg(`✓ Seeded ${data.summary?.inserted ?? 0} products · ${data.summary?.skipped ?? 0} already existed`)
      // Refresh stats
      fetch('/api/products').then(r => r.json()).then(d => {
        const prods = d.products ?? []
        setProductCount(prods.length)
        setStats(s => s ? { ...s, totalProducts: prods.length, lowStock: prods.filter((p: { stock: number }) => p.stock < 5).length } : s)
      })
    } else {
      setSeedMsg('✗ ' + (data.error ?? 'Seed failed — check console'))
    }
    setSeeding(false)
  }

  const statCards = stats ? [
    { label: "Today's Revenue",  value: `GH₵ ${stats.todayRevenue.toFixed(2)}`,  icon: '💰', color: 'var(--success)',      bg: '#F0FDF4' },
    { label: "Today's Orders",   value: stats.todayOrders,                        icon: '🧾', color: 'var(--brand-orange)', bg: '#FFF7ED' },
    { label: 'Discount Given',   value: `GH₵ ${stats.todayDiscount.toFixed(2)}`,  icon: '🏷️', color: 'var(--brand-amber)', bg: '#FFFBEB' },
    { label: "Expenses Today",   value: `GH₵ ${stats.todayExpenses.toFixed(2)}`,  icon: '💸', color: 'var(--brand-red)',   bg: '#FEF2F2' },
    { label: 'Net Profit',       value: `GH₵ ${stats.netProfit.toFixed(2)}`,       icon: '📈', color: stats.netProfit >= 0 ? 'var(--success)' : 'var(--brand-red)', bg: stats.netProfit >= 0 ? '#F0FDF4' : '#FEF2F2' },
    { label: 'Low Stock Items',  value: stats.lowStock,                            icon: '⚠️', color: stats.lowStock > 0 ? 'var(--brand-red)' : 'var(--text-muted)', bg: stats.lowStock > 0 ? '#FEF2F2' : 'var(--surface-base)' },
  ] : []

  const navCards = [
    { href: '/pos',               icon: '🛒', label: 'Open POS',       desc: 'Start selling' },
    { href: '/admin/orders',      icon: '🧾', label: 'Orders',         desc: 'Sales history' },
    { href: '/admin/products',    icon: '📦', label: 'Products',       desc: 'Manage menu items' },
    { href: '/admin/categories',  icon: '🏷️', label: 'Categories',    desc: 'Meals, Drinks, etc.' },
    { href: '/admin/expenses',    icon: '💸', label: 'Expenses',       desc: 'Record business costs' },
    { href: '/admin/reports',     icon: '📈', label: 'Reports',        desc: 'Daily/weekly analytics' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {new Date().toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Setup banner if no products */}
        {!loading && productCount === 0 && (
          <div className="card px-5 py-4 flex items-center gap-4" style={{ borderLeft: '4px solid var(--brand-orange)', background: '#FFF7ED' }}>
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Database is empty</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Load all 29 Millino Chops products in one click</div>
            </div>
            <button onClick={handleSeed} disabled={seeding} className="btn btn-primary btn-sm flex-shrink-0">
              {seeding ? 'Seeding…' : '⚡ Seed Products'}
            </button>
          </div>
        )}
      </div>

      {seedMsg && (
        <div className="mb-6 px-4 py-3 rounded-lg text-sm font-medium" style={{
          background: seedMsg.startsWith('✓') ? '#F0FDF4' : '#FEF2F2',
          color: seedMsg.startsWith('✓') ? '#15803D' : 'var(--brand-red)',
          border: `1px solid ${seedMsg.startsWith('✓') ? '#BBF7D0' : '#FECACA'}`
        }}>{seedMsg}</div>
      )}

      {/* Stat cards */}
      {loading ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map(s => (
            <div key={s.label} className="card p-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: s.bg }}>
                {s.icon}
              </div>
              <div className="font-black text-2xl" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation cards */}
      <div className="card p-5">
        <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Quick Navigation</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {navCards.map(n => (
            <button
              key={n.href}
              onClick={() => router.push(n.href)}
              className="flex items-start gap-3 p-4 rounded-xl text-left transition-all"
              style={{ background: 'var(--surface-base)', border: '1.5px solid var(--border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-orange)'; (e.currentTarget as HTMLElement).style.background = '#FFF7ED' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-base)' }}
            >
              <span className="text-2xl flex-shrink-0">{n.icon}</span>
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{n.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{n.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
