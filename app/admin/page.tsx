'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Stats {
  todaySales: number
  todayOrders: number
  totalProducts: number
  lowStock: number
  totalExpenses: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileName, setProfileName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'manager') {
        router.push('/pos')
        return
      }
      setProfileName(profile.name)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [
        { data: todayOrders },
        { data: products },
        { data: expenses },
      ] = await Promise.all([
        supabase.from('orders').select('total, status').gte('created_at', today.toISOString()),
        supabase.from('products').select('stock'),
        supabase.from('expenses').select('amount').gte('created_at', today.toISOString()),
      ])

      const completedOrders = (todayOrders ?? []).filter(o => o.status === 'completed')
      setStats({
        todaySales: completedOrders.reduce((s, o) => s + Number(o.total), 0),
        todayOrders: completedOrders.length,
        totalProducts: (products ?? []).length,
        lowStock: (products ?? []).filter(p => p.stock < 5).length,
        totalExpenses: (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0),
      })
      setLoading(false)
    })
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
  }

  const navItems = [
    { label: 'POS Terminal', href: '/pos', icon: '🛒', desc: 'Go to the selling screen' },
    { label: 'Products', href: '/admin/products', icon: '📦', desc: 'Manage inventory' },
    { label: 'Categories', href: '/admin/categories', icon: '🏷️', desc: 'Organise product groups' },
    { label: 'Orders', href: '/admin/orders', icon: '🧾', desc: 'View sales history' },
    { label: 'Expenses', href: '/admin/expenses', icon: '💸', desc: 'Track business costs' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div>
          <h1 className="text-xl font-bold">Millino Admin</h1>
          <p className="text-blue-200 text-sm">{profileName}</p>
        </div>
        <button onClick={handleSignOut} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition">
          Sign Out
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Today's Revenue", value: `GH₵ ${stats.todaySales.toFixed(2)}`, color: 'text-green-600' },
              { label: "Today's Orders", value: stats.todayOrders, color: 'text-blue-600' },
              { label: 'Products', value: stats.totalProducts, color: 'text-purple-600' },
              { label: 'Low Stock', value: stats.lowStock, color: stats.lowStock > 0 ? 'text-red-600' : 'text-gray-400' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="bg-white rounded-xl p-5 text-left shadow-sm hover:shadow-md hover:ring-2 hover:ring-blue-400 transition"
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="font-semibold text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
