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
  const [productCount, setProductCount] = useState(-1)

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
      setSeedMsg(`✓ ${data.summary?.inserted ?? 0} products added, ${data.summary?.skipped ?? 0} already existed`)
      fetch('/api/products').then(r => r.json()).then(d => {
        const prods = d.products ?? []
        setProductCount(prods.length)
        setStats(s => s ? { ...s, totalProducts: prods.length, lowStock: prods.filter((p: { stock: number }) => p.stock < 5).length } : s)
      })
    } else {
      setSeedMsg('✗ ' + (data.error ?? 'Failed'))
    }
    setSeeding(false)
  }

  const statCards = stats ? [
    { label: "Today's Revenue",  value: `GH₵ ${stats.todayRevenue.toFixed(2)}`,  icon: '💰', accent: 'var(--green)'  },
    { label: "Today's Orders",   value: stats.todayOrders,                        icon: '🧾', accent: 'var(--orange)' },
    { label: 'Discount Given',   value: `GH₵ ${stats.todayDiscount.toFixed(2)}`,  icon: '🏷️', accent: 'var(--amber)'  },
    { label: "Expenses Today",   value: `GH₵ ${stats.todayExpenses.toFixed(2)}`,  icon: '💸', accent: 'var(--red)'   },
    { label: 'Net Profit',       value: `GH₵ ${stats.netProfit.toFixed(2)}`,       icon: '📈', accent: stats.netProfit >= 0 ? 'var(--green)' : 'var(--red)' },
    { label: 'Low Stock',        value: stats.lowStock,                            icon: '⚠️', accent: stats.lowStock > 0 ? 'var(--red)' : 'var(--text-3)' },
  ] : []

  const navCards = [
    { href: '/pos',              icon: '🛒', label: 'POS Terminal',  desc: 'Start taking orders' },
    { href: '/admin/orders',     icon: '🧾', label: 'Orders',        desc: 'View sales history'  },
    { href: '/admin/products',   icon: '📦', label: 'Products',      desc: 'Manage menu & stock' },
    { href: '/admin/categories', icon: '🏷️', label: 'Categories',   desc: 'Meals, Drinks, etc.' },
    { href: '/admin/expenses',   icon: '💸', label: 'Expenses',      desc: 'Record costs'        },
    { href: '/admin/reports',    icon: '📈', label: 'Reports',       desc: 'Analytics & export'  },
  ]

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: '1.75rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.9rem', marginTop: 4 }}>
            {new Date().toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Seed banner */}
        {!loading && productCount === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#FFF8F5', border: '2px solid var(--orange)', borderRadius: 14, padding: '0.875rem 1.25rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-1)' }}>Menu is empty!</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>Load all 29 Millino Chops products</div>
            </div>
            <button onClick={handleSeed} disabled={seeding} className="btn btn-primary">
              {seeding ? 'Loading…' : '⚡ Seed Menu'}
            </button>
          </div>
        )}
      </div>

      {seedMsg && (
        <div style={{
          marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 700,
          background: seedMsg.startsWith('✓') ? '#F0FDF4' : '#FEF2F2',
          color: seedMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)',
          border: `1.5px solid ${seedMsg.startsWith('✓') ? '#BBF7D0' : '#FECACA'}`,
        }}>{seedMsg}</div>
      )}

      {/* Stat cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14, marginBottom: '2rem' }}>
          {statCards.map(s => (
            <div key={s.label} className="card" style={{ padding: '1.25rem 1rem' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontWeight: 900, fontSize: '1.4rem', color: s.accent, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', fontWeight: 700, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick nav */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {navCards.map(n => (
            <button key={n.href} onClick={() => router.push(n.href)} style={{
              display: 'flex', flexDirection: 'column', gap: 6, padding: '1rem',
              borderRadius: 12, background: 'var(--surface)', border: '1.5px solid var(--border)',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--orange)'; (e.currentTarget as HTMLElement).style.background = '#FFF8F5' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}>
              <span style={{ fontSize: '1.5rem' }}>{n.icon}</span>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-1)' }}>{n.label}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{n.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
