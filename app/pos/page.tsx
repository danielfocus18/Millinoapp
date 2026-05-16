'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCart, type PricingType } from '@/store/cart'
import { getProfile } from '@/lib/getProfile'
import type { User } from '@supabase/supabase-js'

interface Product { id: string; name: string; price: number; stock: number; sku?: string; category_id?: string }
interface Category { id: string; name: string }
interface Profile { role: string; name: string }
interface ReceiptData {
  orderId: string
  items: { name: string; qty: number; unitPrice: number; pricingType: string; discountPercent: number; lineTotal: number }[]
  gross: number; discount: number; net: number
  cashier: string; date: string; time: string
  paymentMethod: string; amountPaid: number
}

const PRICING_TYPES: { value: PricingType; label: string; color: string }[] = [
  { value: 'normal',   label: 'Normal',   color: '#1C1917' },
  { value: 'discount', label: 'Discount', color: '#D97706' },
  { value: 'free',     label: 'Free',     color: '#16A34A' },
]

export default function POSPage() {
  const router = useRouter()
  const { items, addItem, removeItem, updateQty, clearCart, grossTotal, discountTotal, netTotal } = useCart()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [pricingType, setPricingType] = useState<PricingType>('normal')
  const [amountPaid, setAmountPaid] = useState('')
  const [qty, setQty] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashGiven, setCashGiven] = useState('')
  const amountPaidRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    const [{ data: prods }, { data: cats }] = await Promise.all([
      fetch('/api/products').then(r => r.json()).then(d => ({ data: d.products ?? [] })),
      fetch('/api/categories').then(r => r.json()).then(d => ({ data: d.categories ?? [] })),
    ])
    setProducts(prods ?? [])
    setCategories(cats ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const data = await getProfile(session.user.id)
      setProfile(data)
      loadData()
    })
  }, [router, loadData])

  useEffect(() => { if (pricingType === 'discount') amountPaidRef.current?.focus() }, [pricingType])

  const filtered = products.filter(p => {
    const matchCat = selectedCat == null || p.category_id === selectedCat
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function handleProductClick(p: Product) {
    if (p.stock === 0) return
    setSelectedProduct(p); setPricingType('normal'); setAmountPaid(''); setQty(1)
  }

  function handleAddToCart() {
    if (!selectedProduct) return
    let discountPercent = 0
    let lineTotal = selectedProduct.price * qty
    if (pricingType === 'discount') {
      const paid = parseFloat(amountPaid)
      if (isNaN(paid) || paid < 0) { alert('Enter a valid amount paid'); return }
      const orig = selectedProduct.price * qty
      lineTotal = paid
      discountPercent = orig > 0 ? ((orig - paid) / orig) * 100 : 0
    } else if (pricingType === 'free') {
      discountPercent = 100; lineTotal = 0
    }
    addItem({ id: Number(selectedProduct.id), name: selectedProduct.name, sku: selectedProduct.sku, unitPrice: selectedProduct.price, pricingType, discountPercent, lineTotal })
    setSelectedProduct(null); setAmountPaid(''); setQty(1); setPricingType('normal')
  }

  async function handleCheckout() {
    if (items.length === 0) return
    setCheckingOut(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashier_id: user?.id,
          items: items.map(i => ({ product_id: i.id, quantity: i.quantity, unit_price: i.unitPrice, pricing_type: i.pricingType, discount_percent: i.discountPercent, line_total: i.lineTotal })),
          gross_amount: grossTotal(), discount_amount: discountTotal(), net_amount: netTotal(),
          payment_method: paymentMethod,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const now = new Date()
      setReceipt({
        orderId: data.order.id,
        items: items.map(i => ({ name: i.name, qty: i.quantity, unitPrice: i.unitPrice, pricingType: i.pricingType, discountPercent: i.discountPercent, lineTotal: i.lineTotal })),
        gross: grossTotal(), discount: discountTotal(), net: netTotal(),
        cashier: profile?.name ?? '', date: now.toLocaleDateString('en-GH', { dateStyle: 'medium' }),
        time: now.toLocaleTimeString('en-GH', { timeStyle: 'short' }), paymentMethod,
        amountPaid: parseFloat(cashGiven) || netTotal(),
      })
      clearCart(); loadData()
    } catch (err) { alert('Checkout failed: ' + (err as Error).message) }
    finally { setCheckingOut(false) }
  }

  const gross = grossTotal(), disc = discountTotal(), net = netTotal()
  const change = Math.max(0, (parseFloat(cashGiven) || 0) - net)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-base)' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading POS…</div>
    </div>
  )

  // ── Receipt screen ──
  if (receipt) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-base)' }}>
      <div id="receipt-print" className="card" style={{ width: 320, fontFamily: "'Courier New', monospace" }}>
        <div className="p-6 text-center" style={{ borderBottom: '1px dashed var(--border)' }}>
          <img src="/logo.png" alt="Millino Chops" style={{ width: 60, height: 60, objectFit: 'contain', margin: '0 auto 8px' }} />
          <div className="font-black text-xl">MILLINO CHOPS</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Eatery Point of Sale</div>
          <div className="text-xs mt-3" style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>
            {receipt.date} · {receipt.time}<br />
            Order #{receipt.orderId.slice(-8).toUpperCase()}<br />
            Cashier: {receipt.cashier}
          </div>
        </div>
        <div className="px-6 py-4 space-y-2">
          {receipt.items.map((item, i) => (
            <div key={i} className="text-xs">
              <div className="font-semibold">{item.name}</div>
              <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                <span>{item.qty} × GH₵{item.unitPrice.toFixed(2)}</span>
                <span>GH₵{item.lineTotal.toFixed(2)}</span>
              </div>
              {item.pricingType === 'discount' && <div style={{ color: 'var(--brand-amber)', fontSize: '0.7rem' }}>Discount: {item.discountPercent.toFixed(1)}%</div>}
              {item.pricingType === 'free' && <div style={{ color: 'var(--success)', fontSize: '0.7rem' }}>FREE ITEM</div>}
            </div>
          ))}
        </div>
        <div className="px-6 py-4 text-xs space-y-1" style={{ borderTop: '1px dashed var(--border)' }}>
          <div className="flex justify-between"><span>Gross</span><span>GH₵{receipt.gross.toFixed(2)}</span></div>
          {receipt.discount > 0 && <div className="flex justify-between" style={{ color: 'var(--brand-amber)' }}><span>Discount</span><span>−GH₵{receipt.discount.toFixed(2)}</span></div>}
          <div className="flex justify-between font-black text-sm pt-1" style={{ borderTop: '1px solid var(--border)' }}><span>NET TOTAL</span><span>GH₵{receipt.net.toFixed(2)}</span></div>
          {receipt.paymentMethod === 'cash' && receipt.amountPaid > receipt.net && (
            <div className="flex justify-between" style={{ color: 'var(--success)' }}><span>Change</span><span>GH₵{(receipt.amountPaid - receipt.net).toFixed(2)}</span></div>
          )}
        </div>
        <div className="px-6 py-4 text-center text-xs" style={{ color: 'var(--text-muted)', borderTop: '1px dashed var(--border)' }}>
          Thank you for choosing<br /><strong style={{ color: 'var(--brand-orange)' }}>Millino Chops!</strong>
        </div>
      </div>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        <button onClick={() => window.print()} className="btn btn-outline">🖨️ Print</button>
        <button onClick={() => { setReceipt(null); setCashGiven('') }} className="btn btn-primary">+ New Sale</button>
      </div>
    </div>
  )

  // ── Main POS ──
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--surface-base)' }}>
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3" style={{ background: 'var(--surface-sidebar)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white flex-shrink-0">
            <img src="/logo.png" alt="Millino" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Millino Chops POS</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              {new Date().toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile && <span className="text-sm mr-1 hidden sm:inline" style={{ color: '#A8A29E' }}>{profile.name}</span>}
          {/* Manager gets Admin link; cashier does not */}
          {profile?.role === 'manager' && (
            <button onClick={() => router.push('/admin')} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.10)', color: '#fff' }}>
              Admin ↗
            </button>
          )}
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="btn btn-sm" style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171' }}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Products panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + categories */}
          <div className="flex-shrink-0 p-4 space-y-3" style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--border)' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="input" style={{ maxWidth: 360 }} />
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setSelectedCat(null)} style={selectedCat === null
                ? { background: 'var(--brand-orange)', color: '#fff', border: 'none', borderRadius: 999, padding: '0.3rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }
                : { background: 'var(--border)', color: 'var(--text-secondary)', border: 'none', borderRadius: 999, padding: '0.3rem 0.9rem', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                All
              </button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setSelectedCat(c.id)} style={selectedCat === c.id
                  ? { background: 'var(--brand-orange)', color: '#fff', border: 'none', borderRadius: 999, padding: '0.3rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }
                  : { background: 'var(--border)', color: 'var(--text-secondary)', border: 'none', borderRadius: 999, padding: '0.3rem 0.9rem', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <div style={{ fontSize: '3rem' }}>🍽️</div>
                <div className="mt-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {products.length === 0 ? 'No products in database yet' : 'No products match your search'}
                </div>
                {products.length === 0 && (
                  <div className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {profile?.role === 'manager'
                      ? 'Go to Admin → Products to add items, or run the seed.'
                      : 'Ask your manager to add products.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map(p => (
                  <button key={p.id} onClick={() => handleProductClick(p)} disabled={p.stock === 0}
                    className="card text-left p-4 transition-all"
                    style={{ outline: selectedProduct?.id === p.id ? '2.5px solid var(--brand-orange)' : 'none', cursor: p.stock === 0 ? 'not-allowed' : 'pointer', opacity: p.stock === 0 ? 0.45 : 1 }}>
                    <div className="font-semibold text-sm mb-2 leading-snug" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                    <div className="font-black text-base" style={{ color: 'var(--brand-orange)' }}>GH₵{Number(p.price).toFixed(2)}</div>
                    <div className="text-xs mt-1.5 font-medium" style={{ color: p.stock === 0 ? '#EF4444' : p.stock < 5 ? '#F59E0B' : 'var(--text-muted)' }}>
                      {p.stock === 0 ? 'Out of stock' : p.stock < 5 ? `Low: ${p.stock}` : `${p.stock} in stock`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add-to-cart bar */}
          {selectedProduct && (
            <div className="flex-shrink-0 p-4 flex items-start gap-4 flex-wrap" style={{ background: '#FFF7ED', borderTop: '2px solid #FED7AA' }}>
              <div className="flex-1 min-w-0">
                <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{selectedProduct.name}</div>
                <div className="font-black text-lg" style={{ color: 'var(--brand-orange)' }}>GH₵{Number(selectedProduct.price).toFixed(2)}</div>
              </div>
              <div className="flex gap-1.5">
                {PRICING_TYPES.map(pt => (
                  <button key={pt.value} onClick={() => { setPricingType(pt.value); setAmountPaid('') }} className="btn btn-sm"
                    style={{ background: pricingType === pt.value ? pt.color : 'transparent', color: pricingType === pt.value ? '#fff' : pt.color, border: `1.5px solid ${pt.color}` }}>
                    {pt.label}
                  </button>
                ))}
              </div>
              {pricingType === 'discount' && (
                <div>
                  <label className="label" style={{ color: 'var(--brand-amber)' }}>Amount paid (GH₵)</label>
                  <input ref={amountPaidRef} type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                    className="input" style={{ width: 140, borderColor: '#D97706' }} placeholder="0.00" />
                  {amountPaid && !isNaN(parseFloat(amountPaid)) && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--brand-amber)', marginTop: 2 }}>
                      Disc: {Math.max(0, ((Number(selectedProduct.price) * qty - parseFloat(amountPaid)) / (Number(selectedProduct.price) * qty)) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 flex items-center justify-center rounded-full font-bold" style={{ background: 'var(--border)' }}>−</button>
                <span className="w-8 text-center font-bold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="w-8 h-8 flex items-center justify-center rounded-full font-bold" style={{ background: 'var(--border)' }}>+</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedProduct(null)} className="btn btn-ghost btn-sm">Cancel</button>
                <button onClick={handleAddToCart} className="btn btn-primary btn-sm">Add to Cart</button>
              </div>
            </div>
          )}
        </div>

        {/* Cart panel */}
        <div className="flex-shrink-0 flex flex-col" style={{ width: 300, background: 'var(--surface-card)', borderLeft: '1px solid var(--border)' }}>
          <div className="px-4 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Cart</span>
            <span style={{ background: '#FFF7ED', color: 'var(--brand-orange-dk)', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 999 }}>{items.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {items.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>Cart is empty.<br />Tap a product to begin.</div>
            ) : items.map((item, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--surface-base)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{item.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>GH₵{item.unitPrice.toFixed(2)}</span>
                      {item.pricingType === 'discount' && <span style={{ background: '#FFFBEB', color: '#92400E', fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 999 }}>{item.discountPercent.toFixed(0)}% off</span>}
                      {item.pricingType === 'free' && <span style={{ background: '#F0FDF4', color: '#15803D', fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 999 }}>FREE</span>}
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.id)} style={{ color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold" style={{ background: 'var(--border)' }}>−</button>
                    <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold" style={{ background: 'var(--border)' }}>+</button>
                  </div>
                  <div className="font-bold text-sm">GH₵{item.lineTotal.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}><span>Gross</span><span>GH₵{gross.toFixed(2)}</span></div>
              {disc > 0 && <div className="flex justify-between" style={{ color: 'var(--brand-amber)' }}><span>Discount</span><span>−GH₵{disc.toFixed(2)}</span></div>}
              <div className="flex justify-between font-black text-base pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                <span>NET TOTAL</span><span style={{ color: 'var(--brand-orange)' }}>GH₵{net.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <label className="label">Payment method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input" style={{ fontSize: '0.875rem' }}>
                <option value="cash">Cash</option>
                <option value="momo">Mobile Money (MoMo)</option>
                <option value="card">Card</option>
              </select>
            </div>
            {paymentMethod === 'cash' && (
              <div>
                <label className="label">Cash received (GH₵)</label>
                <input type="number" value={cashGiven} onChange={e => setCashGiven(e.target.value)} className="input" placeholder="0.00" />
                {cashGiven && !isNaN(parseFloat(cashGiven)) && (
                  <div className="flex justify-between text-sm mt-1.5 font-semibold" style={{ color: 'var(--success)' }}>
                    <span>Change</span><span>GH₵{change.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
            <button onClick={handleCheckout} disabled={items.length === 0 || checkingOut} className="btn btn-success btn-lg w-full">
              {checkingOut ? 'Processing…' : '✓ Confirm & Charge'}
            </button>
            {items.length > 0 && (
              <button onClick={clearCart} className="btn btn-ghost w-full text-sm" style={{ color: 'var(--danger)' }}>Clear Cart</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
