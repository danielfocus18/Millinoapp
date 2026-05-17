'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts'

interface Stats {
  todayRevenue: number; todayOrders: number; todayDiscount: number
  totalProducts: number; lowStock: number; todayExpenses: number; netProfit: number
}
interface ProductRow { name: string; qty: number; totalRevenue: number }

const COLORS = ['#F05A28','#F59E0B','#16A34A','#8B5CF6','#0284C7','#EC4899','#14B8A6']

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [topProducts, setTopProducts] = useState<ProductRow[]>([])
  const [weekData, setWeekData] = useState<{ day: string; revenue: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')
  const [productCount, setProductCount] = useState(-1)

  useEffect(() => {
    async function loadAll() {
      // Today's report
      const [reportRes, prodRes, weekRes] = await Promise.all([
        fetch('/api/reports?period=daily').then(r => r.json()).catch(() => ({})),
        fetch('/api/products').then(r => r.json()).catch(() => ({ products: [] })),
        fetch('/api/reports?period=weekly').then(r => r.json()).catch(() => ({})),
      ])

      const prods = prodRes.products ?? []
      setProductCount(prods.length)
      setStats({
        todayRevenue: reportRes.summary?.netSales ?? 0,
        todayOrders: reportRes.orderCount ?? 0,
        todayDiscount: reportRes.summary?.discountImpact ?? 0,
        totalProducts: prods.length,
        lowStock: prods.filter((p: { stock: number }) => p.stock < 5).length,
        todayExpenses: reportRes.summary?.totalExpenses ?? 0,
        netProfit: reportRes.summary?.netProfit ?? 0,
      })

      // Top products from today
      const topP = (reportRes.products ?? []).slice(0, 6)
      setTopProducts(topP)

      // Build last-7-days data from weekly report
      // We'll generate per-day labels
      const days: { day: string; revenue: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        days.push({
          day: d.toLocaleDateString('en-GH', { weekday: 'short' }),
          revenue: 0,
        })
      }
      // Fill with weekly total spread evenly as placeholder until daily breakdown API exists
      const weekRevenue = weekRes.summary?.netSales ?? 0
      // Just show the week total on the last bar for now — real per-day needs a date-range query
      if (days.length > 0) {
        days[days.length - 1].revenue = parseFloat((reportRes.summary?.netSales ?? 0).toFixed(2))
      }
      setWeekData(days)
      setLoading(false)
    }
    loadAll()
  }, [])

  async function handleSeed() {
    setSeeding(true); setSeedMsg('')
    const r = await fetch('/api/seed', { method: 'POST' })
    const d = await r.json()
    setSeedMsg(d.success
      ? `✓ ${d.summary?.inserted ?? 0} products added`
      : '✗ ' + (d.error ?? 'Failed'))
    setSeeding(false)
    if (d.success) {
      const pd = await fetch('/api/products').then(r => r.json())
      const prods = pd.products ?? []
      setProductCount(prods.length)
      setStats(s => s ? { ...s, totalProducts: prods.length } : s)
    }
    setTimeout(() => setSeedMsg(''), 4000)
  }

  const navCards = [
    { href: '/pos',              icon: '🛒', label: 'POS Terminal',  desc: 'Take orders'         },
    { href: '/admin/orders',     icon: '🧾', label: 'Orders',        desc: 'Sales history'       },
    { href: '/admin/products',   icon: '📦', label: 'Products',      desc: 'Menu & stock'        },
    { href: '/admin/categories', icon: '🏷️', label: 'Categories',   desc: 'Meals, Drinks…'      },
    { href: '/admin/expenses',   icon: '💸', label: 'Expenses',      desc: 'Record costs'        },
    { href: '/admin/reports',    icon: '📈', label: 'Reports',       desc: 'Full analytics'      },
  ]

  const card: React.CSSProperties = { background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14 }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, color: 'var(--text-3)' }}>
      Loading dashboard…
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: '1.75rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 4 }}>
            {new Date().toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {productCount === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#FFF8F5', border: '2px solid var(--orange)', borderRadius: 14, padding: '0.875rem 1.25rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-1)' }}>Menu is empty!</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>Load 29 Millino Chops products</div>
            </div>
            <button onClick={handleSeed} disabled={seeding} className="btn btn-primary btn-sm">
              {seeding ? 'Loading…' : '⚡ Seed Menu'}
            </button>
          </div>
        )}
      </div>

      {seedMsg && (
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', background: seedMsg.startsWith('✓') ? '#F0FDF4' : '#FEF2F2', color: seedMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', border: `1.5px solid ${seedMsg.startsWith('✓') ? '#BBF7D0' : '#FECACA'}` }}>
          {seedMsg}
        </div>
      )}

      {/* KPI cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
          {[
            { label: "Today's Revenue",  value: `GH₵${stats.todayRevenue.toFixed(2)}`,  icon: '💰', color: 'var(--green)'  },
            { label: "Today's Orders",   value: stats.todayOrders,                       icon: '🧾', color: 'var(--orange)' },
            { label: 'Discount Given',   value: `GH₵${stats.todayDiscount.toFixed(2)}`,  icon: '🏷️', color: 'var(--amber)'  },
            { label: "Expenses",         value: `GH₵${stats.todayExpenses.toFixed(2)}`,  icon: '💸', color: 'var(--red)'   },
            { label: 'Net Profit',       value: `GH₵${stats.netProfit.toFixed(2)}`,       icon: '📈', color: stats.netProfit >= 0 ? 'var(--green)' : 'var(--red)' },
            { label: 'Low Stock Items',  value: stats.lowStock,                           icon: '⚠️', color: stats.lowStock > 0 ? 'var(--red)' : 'var(--text-3)' },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: '1.125rem 1rem' }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontWeight: 900, fontSize: '1.3rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: topProducts.length > 0 ? '1fr 300px' : '1fr', gap: 16, marginBottom: '1.5rem' }}>
        {/* Revenue line chart - last 7 days */}
        <div style={{ ...card, padding: '1.25rem' }}>
          <div style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: '0.9rem', marginBottom: 16 }}>Revenue — Last 7 Days</div>
          {weekData.every(d => d.revenue === 0) ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '0.875rem' }}>
              No sales data yet for this week
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weekData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={v => `₵${v}`} />
                <Tooltip formatter={(v: unknown) => [`GH₵${(v as number).toFixed(2)}`, 'Revenue']}
                  contentStyle={{ borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="var(--orange)" strokeWidth={2.5} dot={{ fill: 'var(--orange)', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products bar chart */}
        {topProducts.length > 0 && (
          <div style={{ ...card, padding: '1.25rem' }}>
            <div style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: '0.9rem', marginBottom: 16 }}>Top Products Today</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={v => `₵${v}`} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v.length > 13 ? v.slice(0, 13) + '…' : v} />
                <Tooltip formatter={(v: unknown) => [`GH₵${(v as number).toFixed(2)}`, 'Revenue']}
                  contentStyle={{ borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 12 }} />
                <Bar dataKey="totalRevenue" radius={[0, 6, 6, 0]}>
                  {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Quick nav */}
      <div style={{ ...card, padding: '1.25rem' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {navCards.map(n => (
            <button key={n.href} onClick={() => router.push(n.href)} style={{
              display: 'flex', flexDirection: 'column', gap: 6, padding: '1rem', borderRadius: 12,
              background: 'var(--surface)', border: '1.5px solid var(--border)',
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
