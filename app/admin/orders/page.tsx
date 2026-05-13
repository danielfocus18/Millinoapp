'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface OrderItem {
  id: string
  product_id: number
  quantity: number
  unit_price: number
  products: { name: string } | null
}
interface Order {
  id: string
  total: number
  status: string
  created_at: string
  cashier_id?: string
  users?: { name: string } | null
  order_items?: OrderItem[]
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')

  async function load() {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select('*, users(name), order_items(*, products(name))')
      .order('created_at', { ascending: false })

    const now = new Date()
    if (filter === 'today') {
      const start = new Date(now); start.setHours(0,0,0,0)
      query = query.gte('created_at', start.toISOString())
    } else if (filter === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - 7)
      query = query.gte('created_at', start.toISOString())
    } else if (filter === 'month') {
      const start = new Date(now); start.setDate(1); start.setHours(0,0,0,0)
      query = query.gte('created_at', start.toISOString())
    }

    const { data } = await query
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
      if (!profile || profile.role !== 'manager') { router.push('/pos'); return }
      load()
    })
  }, [router])

  useEffect(() => { load() }, [filter])

  async function updateStatus(id: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', id)
    load()
  }

  const revenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.total), 0)

  const statusColor: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.push('/admin')} className="text-blue-200 hover:text-white">← Admin</button>
        <h1 className="font-bold text-lg">Orders</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
                }`}>{f}</button>
            ))}
          </div>
          <div className="text-sm font-semibold text-green-600">Revenue: GH₵ {revenue.toFixed(2)}</div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No orders found</div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div
                  className="flex items-center px-5 py-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-gray-500">#{order.id.slice(-8).toUpperCase()}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
                      {order.users?.name && ` · ${order.users.name}`}
                    </div>
                  </div>
                  <div className="font-bold text-gray-900 mr-4">GH₵ {Number(order.total).toFixed(2)}</div>
                  <span className="text-gray-400 text-sm">{expanded === order.id ? '▲' : '▼'}</span>
                </div>

                {expanded === order.id && (
                  <div className="border-t px-5 py-4">
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="text-gray-500 text-xs uppercase">
                          <th className="text-left pb-2">Item</th>
                          <th className="text-right pb-2">Qty</th>
                          <th className="text-right pb-2">Unit</th>
                          <th className="text-right pb-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.order_items?.map(item => (
                          <tr key={item.id} className="border-t">
                            <td className="py-2">{item.products?.name ?? 'Unknown'}</td>
                            <td className="py-2 text-right">{item.quantity}</td>
                            <td className="py-2 text-right">GH₵ {Number(item.unit_price).toFixed(2)}</td>
                            <td className="py-2 text-right font-medium">GH₵ {(item.quantity * Number(item.unit_price)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {order.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(order.id, 'completed')}
                          className="bg-green-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-green-700 transition">
                          Mark Completed
                        </button>
                        <button onClick={() => updateStatus(order.id, 'cancelled')}
                          className="bg-red-100 text-red-600 text-sm px-4 py-1.5 rounded-lg hover:bg-red-200 transition">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
