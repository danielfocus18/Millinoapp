'use client'
import { useEffect, useState, useCallback } from 'react'

interface OrderItem { id: string; quantity: number; unit_price: number; pricing_type?: string; discount_percent?: number; line_total?: number; products: { name: string } | null }
interface Order { id: string; total: number; net_amount?: number; discount_amount?: number; gross_amount?: number; status: string; created_at: string; payment_method?: string; users?: { name: string } | null; order_items?: OrderItem[] }
type Filter = 'today' | 'week' | 'month' | 'all'

const PM_ICON: Record<string, string> = { cash: '💵', momo: '📱', card: '💳' }
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  completed: { background: '#F0FDF4', color: '#15803D' },
  pending:   { background: '#FFFBEB', color: '#92400E' },
  cancelled: { background: '#FEF2F2', color: '#DC2626' },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('today')

  const load = useCallback(async (f: Filter = filter) => {
    setLoading(true)
    const r = await fetch(`/api/orders?period=${f}`)
    const d = await r.json()
    setOrders(d.orders ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [])
  useEffect(() => { load(filter) }, [filter])

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  const completed = orders.filter(o => o.status === 'completed')
  const revenue = completed.reduce((s, o) => s + Number(o.net_amount ?? o.total), 0)
  const discountGiven = completed.reduce((s, o) => s + Number(o.discount_amount ?? 0), 0)

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontWeight: 900, fontSize: '1.75rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Orders</h1>
      <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 4, marginBottom: '1.5rem' }}>Sales history & transaction details</p>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['today','week','month','all'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="btn btn-sm" style={{
              background: filter === f ? 'var(--ink)' : '#fff',
              color: filter === f ? '#fff' : 'var(--text-2)',
              border: `1.5px solid ${filter === f ? 'var(--ink)' : 'var(--border-2)'}`,
              textTransform: 'capitalize',
            }}>{f}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: '0.5rem 1rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--green)' }}>GH₵{revenue.toFixed(2)}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Revenue</div>
          </div>
          {discountGiven > 0 && (
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: '0.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--amber)' }}>GH₵{discountGiven.toFixed(2)}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Discounts</div>
            </div>
          )}
          <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: '0.5rem 1rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--orange)' }}>{completed.length}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Orders</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>Loading…</div>
      ) : orders.length === 0 ? (
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>
          No orders for this period
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(order => {
            const net = Number(order.net_amount ?? order.total)
            const disc = Number(order.discount_amount ?? 0)
            const st = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending
            const isOpen = expanded === order.id
            return (
              <div key={order.id} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                <button onClick={() => setExpanded(isOpen ? null : order.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '1rem 1.25rem', background: isOpen ? 'var(--surface)' : '#fff',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)' }}>#{order.id.slice(-8).toUpperCase()}</span>
                      <span style={{ ...st, fontSize: '0.68rem', fontWeight: 800, padding: '0.18rem 0.6rem', borderRadius: 999, textTransform: 'uppercase' }}>{order.status}</span>
                      {order.payment_method && <span style={{ fontSize: '0.85rem' }}>{PM_ICON[order.payment_method] ?? '💰'} <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600 }}>{order.payment_method.toUpperCase()}</span></span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 3 }}>
                      {new Date(order.created_at).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
                      {order.users?.name && ` · ${order.users.name}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--orange)' }}>GH₵{net.toFixed(2)}</div>
                    {disc > 0 && <div style={{ fontSize: '0.72rem', color: 'var(--amber)', fontWeight: 700 }}>−GH₵{disc.toFixed(2)} disc</div>}
                  </div>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.8rem', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div style={{ borderTop: '1.5px solid var(--border)', padding: '1rem 1.25rem' }}>
                    <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Item','Qty','Unit Price','Type','Line Total'].map(h => (
                            <th key={h} style={{ padding: '4px 0 10px', textAlign: h === 'Item' ? 'left' : 'right', fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {order.order_items?.map((item, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-1)' }}>{item.products?.name ?? '—'}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--text-2)' }}>{item.quantity}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--text-2)' }}>GH₵{Number(item.unit_price).toFixed(2)}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right' }}>
                              {(!item.pricing_type || item.pricing_type === 'normal') && <span className="badge badge-gray">Normal</span>}
                              {item.pricing_type === 'discount' && <span className="badge badge-yellow">{Number(item.discount_percent ?? 0).toFixed(0)}% off</span>}
                              {item.pricing_type === 'free' && <span className="badge badge-green">Free</span>}
                            </td>
                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: 'var(--orange)' }}>
                              GH₵{Number(item.line_total ?? item.unit_price * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {order.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button onClick={() => updateStatus(order.id, 'completed')} className="btn btn-success btn-sm">✓ Mark Complete</button>
                        <button onClick={() => updateStatus(order.id, 'cancelled')} className="btn btn-sm" style={{ background: '#FEF2F2', color: 'var(--red)', border: '1.5px solid #FECACA' }}>✕ Cancel</button>
                      </div>
                    )}
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
