'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface OrderItem { id: string; product_id: number; quantity: number; unit_price: number; pricing_type?: string; discount_percent?: number; line_total?: number; products: { name: string } | null }
interface Order { id: string; total: number; net_amount?: number; discount_amount?: number; gross_amount?: number; status: string; created_at: string; payment_method?: string; users?: { name: string } | null; order_items?: OrderItem[] }

type Filter = 'today' | 'week' | 'month' | 'all'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  completed: { bg: '#F0FDF4', color: '#15803D' },
  pending:   { bg: '#FFFBEB', color: '#92400E' },
  cancelled: { bg: '#FEF2F2', color: '#991B1B' },
}

const PAYMENT_ICONS: Record<string, string> = { cash: '💵', momo: '📱', card: '💳' }

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('today')

  async function load(f: Filter = filter) {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select('*, users(name), order_items(*, products(name))')
      .order('created_at', { ascending: false })
    const now = new Date()
    if (f === 'today') { const s = new Date(now); s.setHours(0,0,0,0); query = query.gte('created_at', s.toISOString()) }
    else if (f === 'week') { const s = new Date(now); s.setDate(now.getDate()-7); query = query.gte('created_at', s.toISOString()) }
    else if (f === 'month') { const s = new Date(now); s.setDate(1); s.setHours(0,0,0,0); query = query.gte('created_at', s.toISOString()) }
    const { data } = await query
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { load(filter) }, [filter])

  async function updateStatus(id: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', id)
    load()
  }

  const completed = orders.filter(o => o.status === 'completed')
  const revenue = completed.reduce((s, o) => s + Number(o.net_amount ?? o.total), 0)
  const discountGiven = completed.reduce((s, o) => s + Number(o.discount_amount ?? 0), 0)

  const filters: { value: Filter; label: string }[] = [
    { value: 'today', label: 'Today' }, { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' }, { value: 'all', label: 'All' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Orders</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Sales history and transaction details</p>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1.5">
          {filters.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} className="btn btn-sm"
              style={{ background: filter === f.value ? 'var(--brand-orange)' : 'transparent', color: filter === f.value ? '#fff' : 'var(--text-secondary)', border: `1.5px solid ${filter === f.value ? 'var(--brand-orange)' : 'var(--border)'}` }}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 ml-auto">
          <div className="card px-3 py-2 text-xs text-center">
            <div className="font-black text-base" style={{ color: 'var(--success)' }}>GH₵{revenue.toFixed(2)}</div>
            <div style={{ color: 'var(--text-muted)' }}>Net Revenue</div>
          </div>
          {discountGiven > 0 && (
            <div className="card px-3 py-2 text-xs text-center">
              <div className="font-black text-base" style={{ color: 'var(--brand-amber)' }}>GH₵{discountGiven.toFixed(2)}</div>
              <div style={{ color: 'var(--text-muted)' }}>Discounted</div>
            </div>
          )}
          <div className="card px-3 py-2 text-xs text-center">
            <div className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{completed.length}</div>
            <div style={{ color: 'var(--text-muted)' }}>Orders</div>
          </div>
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Loading…</div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-16" style={{ color: 'var(--text-muted)' }}>No orders found for this period</div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const net = Number(order.net_amount ?? order.total)
            const disc = Number(order.discount_amount ?? 0)
            const st = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending
            const isOpen = expanded === order.id
            return (
              <div key={order.id} className="card overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  style={{ background: isOpen ? 'var(--surface-base)' : undefined }}
                >
                  {/* Order ID + time */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                        #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <span className="badge" style={{ background: st.bg, color: st.color }}>{order.status}</span>
                      {order.payment_method && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {PAYMENT_ICONS[order.payment_method] ?? '💰'} {order.payment_method.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(order.created_at).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
                      {order.users?.name && ` · ${order.users.name}`}
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-base" style={{ color: 'var(--brand-orange)' }}>GH₵{net.toFixed(2)}</div>
                    {disc > 0 && <div className="text-xs" style={{ color: 'var(--brand-amber)' }}>-GH₵{disc.toFixed(2)} disc</div>}
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="px-5 py-4">
                      <table className="w-full text-sm mb-4">
                        <thead>
                          <tr>
                            {['Item', 'Qty', 'Unit Price', 'Type', 'Line Total'].map(h => (
                              <th key={h} className="text-left pb-2 text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {order.order_items?.map(item => (
                            <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                              <td className="py-2 font-medium">{item.products?.name ?? `#${item.product_id}`}</td>
                              <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{item.quantity}</td>
                              <td className="py-2" style={{ color: 'var(--text-secondary)' }}>GH₵{Number(item.unit_price).toFixed(2)}</td>
                              <td className="py-2">
                                {(!item.pricing_type || item.pricing_type === 'normal') && <span className="badge badge-gray">Normal</span>}
                                {item.pricing_type === 'discount' && <span className="badge badge-yellow">{Number(item.discount_percent ?? 0).toFixed(0)}% off</span>}
                                {item.pricing_type === 'free' && <span className="badge badge-green">Free</span>}
                              </td>
                              <td className="py-2 font-bold" style={{ color: 'var(--brand-orange)' }}>
                                GH₵{Number(item.line_total ?? item.unit_price * item.quantity).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {order.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => updateStatus(order.id, 'completed')} className="btn btn-success btn-sm">✓ Mark Completed</button>
                          <button onClick={() => updateStatus(order.id, 'cancelled')} className="btn btn-sm" style={{ background: '#FEF2F2', color: 'var(--brand-red)', border: '1.5px solid #FECACA' }}>✕ Cancel Order</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
