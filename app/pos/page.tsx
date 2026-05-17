'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCart, type PricingType } from '@/store/cart'
import { getProfile } from '@/lib/getProfile'

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

const PRICING: { value: PricingType; label: string; emoji: string; activeColor: string; activeBg: string }[] = [
  { value: 'normal',   label: 'Normal',   emoji: '✓', activeColor: '#fff', activeBg: 'var(--ink)' },
  { value: 'discount', label: 'Discount', emoji: '🏷', activeColor: '#fff', activeBg: '#D97706' },
  { value: 'free',     label: 'Free',     emoji: '🎁', activeColor: '#fff', activeBg: 'var(--green)' },
]

const CAT_EMOJI: Record<string, string> = { Meals: '🍛', Pastries: '🥐', Drinks: '🥤' }

export default function POSPage() {
  const router = useRouter()
  const { items, addItem, removeItem, updateQty, clearCart, grossTotal, discountTotal, netTotal } = useCart()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [pickedProduct, setPickedProduct] = useState<Product | null>(null)
  const [pricingType, setPricingType] = useState<PricingType>('normal')
  const [discountAmt, setDiscountAmt] = useState('')
  const [qty, setQty] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashGiven, setCashGiven] = useState('')
  const discountRef = useRef<HTMLInputElement>(null)
  const userId = useRef<string>('')

  const loadData = useCallback(async () => {
    const [pd, cd] = await Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ])
    setProducts(pd.products ?? [])
    setCategories(cd.categories ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      userId.current = session.user.id
      const p = await getProfile(session.user.id)
      if (!p) { router.push('/login'); return }
      setProfile(p)
      loadData()
    })
  }, [router, loadData])

  useEffect(() => { if (pricingType === 'discount') discountRef.current?.focus() }, [pricingType])

  const filtered = products.filter(p => {
    const matchCat = !selectedCat || p.category_id === selectedCat
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function pickProduct(p: Product) {
    if (p.stock === 0) return
    setPickedProduct(p); setPricingType('normal'); setDiscountAmt(''); setQty(1)
  }

  function addToCart() {
    if (!pickedProduct) return
    let discountPercent = 0, lineTotal = pickedProduct.price * qty
    if (pricingType === 'discount') {
      const paid = parseFloat(discountAmt)
      if (isNaN(paid) || paid < 0) { alert('Enter a valid amount'); return }
      discountPercent = pickedProduct.price * qty > 0 ? ((pickedProduct.price * qty - paid) / (pickedProduct.price * qty)) * 100 : 0
      lineTotal = paid
    } else if (pricingType === 'free') {
      discountPercent = 100; lineTotal = 0
    }
    addItem({ id: Number(pickedProduct.id), name: pickedProduct.name, sku: pickedProduct.sku, unitPrice: pickedProduct.price, pricingType, discountPercent, lineTotal })
    setPickedProduct(null)
  }

  async function checkout() {
    if (!items.length) return
    setCheckingOut(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashier_id: userId.current,
          items: items.map(i => ({ product_id: i.id, quantity: i.quantity, unit_price: i.unitPrice, pricing_type: i.pricingType, discount_percent: i.discountPercent, line_total: i.lineTotal })),
          gross_amount: grossTotal(), discount_amount: discountTotal(), net_amount: netTotal(), payment_method: paymentMethod,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const now = new Date()
      setReceipt({ orderId: data.order.id, items: items.map(i => ({ name: i.name, qty: i.quantity, unitPrice: i.unitPrice, pricingType: i.pricingType, discountPercent: i.discountPercent, lineTotal: i.lineTotal })), gross: grossTotal(), discount: discountTotal(), net: netTotal(), cashier: profile?.name ?? '', date: now.toLocaleDateString('en-GH', { dateStyle: 'medium' }), time: now.toLocaleTimeString('en-GH', { timeStyle: 'short' }), paymentMethod, amountPaid: parseFloat(cashGiven) || netTotal() })
      clearCart(); loadData()
    } catch (err) { alert('Error: ' + (err as Error).message) }
    finally { setCheckingOut(false) }
  }

  const gross = grossTotal(), disc = discountTotal(), net = netTotal()
  const change = Math.max(0, (parseFloat(cashGiven) || 0) - net)

  // ── RECEIPT ──
  if (receipt) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6" style={{ background: 'var(--surface)' }}>
      <div id="receipt-print" className="w-80 rounded-2xl overflow-hidden shadow-xl" style={{ background: '#fff', border: '1.5px solid var(--border)' }}>
        <div className="p-6 text-center" style={{ background: 'var(--ink)', borderBottom: '2px dashed #3D2B1F' }}>
          <img src="/logo.png" alt="Millino Chops" style={{ width: 52, height: 52, objectFit: 'contain', margin: '0 auto 10px', filter: 'brightness(0) invert(1)' }} />
          <div className="font-black text-white text-xl tracking-wide">MILLINO CHOPS</div>
          <div className="text-xs mt-1" style={{ color: '#A8917E' }}>Eatery Point of Sale</div>
          <div className="text-xs mt-3 space-y-0.5" style={{ color: '#7C6050' }}>
            <div>{receipt.date} · {receipt.time}</div>
            <div style={{ fontFamily: 'monospace' }}>#{receipt.orderId.slice(-8).toUpperCase()}</div>
            <div>{receipt.cashier}</div>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {receipt.items.map((item, i) => (
            <div key={i} className="text-sm">
              <div className="flex justify-between font-semibold">
                <span style={{ color: 'var(--text-1)' }}>{item.name}</span>
                <span style={{ color: 'var(--orange)' }}>GH₵{item.lineTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5" style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
                <span>{item.qty} × GH₵{item.unitPrice.toFixed(2)}</span>
                {item.pricingType === 'discount' && <span className="badge badge-yellow">{item.discountPercent.toFixed(0)}% OFF</span>}
                {item.pricingType === 'free' && <span className="badge badge-green">FREE</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 space-y-2 text-sm" style={{ borderTop: '1.5px dashed var(--border-2)' }}>
          {receipt.discount > 0 && (
            <div className="flex justify-between" style={{ color: '#D97706' }}>
              <span>Discount</span><span>−GH₵{receipt.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-base" style={{ color: 'var(--text-1)' }}>
            <span>TOTAL</span><span style={{ color: 'var(--orange)' }}>GH₵{receipt.net.toFixed(2)}</span>
          </div>
          {receipt.paymentMethod === 'cash' && receipt.amountPaid > receipt.net && (
            <div className="flex justify-between font-semibold" style={{ color: 'var(--green)' }}>
              <span>Change</span><span>GH₵{(receipt.amountPaid - receipt.net).toFixed(2)}</span>
            </div>
          )}
          <div className="pt-1 text-xs" style={{ color: 'var(--text-3)' }}>
            Payment: {receipt.paymentMethod === 'momo' ? 'Mobile Money' : receipt.paymentMethod === 'card' ? 'Card' : 'Cash'}
          </div>
        </div>
        <div className="px-5 py-4 text-center text-xs font-bold" style={{ background: '#FFF8F5', color: 'var(--orange)', borderTop: '1.5px dashed var(--border-2)', letterSpacing: '0.05em' }}>
          THANK YOU! COME AGAIN 🧡
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => window.print()} className="btn btn-outline">🖨 Print</button>
        <button onClick={() => { setReceipt(null); setCashGiven('') }} className="btn btn-primary btn-lg">＋ New Sale</button>
      </div>
    </div>
  )

  // ── LOADING ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ink)' }}>
      <div>
        <img src="/logo.png" alt="Millino Chops" style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 16px', filter: 'brightness(0) invert(1)', opacity: 0.6 }} />
        <div className="text-center text-sm" style={{ color: '#7C6050' }}>Loading POS…</div>
      </div>
    </div>
  )

  // ── MAIN POS ──
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--ink)' }}>

      {/* ── TOP BAR ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3" style={{ background: 'var(--ink)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <img src="/logo.png" alt="Millino Chops" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div className="font-black text-white text-sm tracking-wide">MILLINO CHOPS</div>
            <div className="text-xs" style={{ color: '#7C6050' }}>
              {new Date().toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profile && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{ background: 'var(--orange)', color: '#fff' }}>
                {profile.name[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium" style={{ color: '#C4A898' }}>{profile.name}</span>
            </div>
          )}
          {profile?.role === 'manager' && (
            <button onClick={() => router.push('/admin')} className="btn btn-sm" style={{ background: 'rgba(240,90,40,0.15)', color: '#FDA274', border: '1px solid rgba(240,90,40,0.3)' }}>
              Admin ↗
            </button>
          )}
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.06)', color: '#A8917E' }}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: PRODUCTS ── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>

          {/* Search + category tabs */}
          <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ background: 'var(--surface)', borderBottom: '1.5px solid var(--border)' }}>
            {/* Search */}
            <div className="relative mb-3">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base" style={{ color: 'var(--text-3)' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search menu…" className="input"
                style={{ paddingLeft: '2.5rem', background: 'var(--card)', borderColor: 'var(--border-2)' }} />
            </div>
            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              <button onClick={() => setSelectedCat(null)} style={{
                padding: '0.45rem 1rem', borderRadius: 999, fontSize: '0.82rem', fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                background: !selectedCat ? 'var(--orange)' : 'var(--card)', color: !selectedCat ? '#fff' : 'var(--text-2)',
                boxShadow: !selectedCat ? 'var(--sh-orange)' : 'var(--sh-sm)', outline: !selectedCat ? 'none' : '1.5px solid var(--border-2)',
              }}>All Items</button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setSelectedCat(c.id)} style={{
                  padding: '0.45rem 1rem', borderRadius: 999, fontSize: '0.82rem', fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                  background: selectedCat === c.id ? 'var(--orange)' : 'var(--card)', color: selectedCat === c.id ? '#fff' : 'var(--text-2)',
                  boxShadow: selectedCat === c.id ? 'var(--sh-orange)' : 'var(--sh-sm)', outline: selectedCat === c.id ? 'none' : '1.5px solid var(--border-2)',
                }}>
                  {CAT_EMOJI[c.name] ?? '🍽'} {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-3)' }}>
                <div style={{ fontSize: '4rem' }}>🍽️</div>
                <div className="mt-4 font-bold text-lg" style={{ color: 'var(--text-2)' }}>
                  {products.length === 0 ? 'Menu is empty' : 'No items found'}
                </div>
                {products.length === 0 && profile?.role === 'manager' && (
                  <button onClick={() => router.push('/admin')} className="btn btn-primary mt-4">Go to Admin → Add Products</button>
                )}
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))' }}>
                {filtered.map(p => {
                  const outOfStock = p.stock === 0
                  const isSelected = pickedProduct?.id === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => pickProduct(p)}
                      disabled={outOfStock}
                      className="pop-in text-left"
                      style={{
                        background: isSelected ? 'var(--orange)' : 'var(--card)',
                        border: isSelected ? '2.5px solid var(--orange-dk)' : '1.5px solid var(--border)',
                        borderRadius: 18,
                        padding: '1rem',
                        cursor: outOfStock ? 'not-allowed' : 'pointer',
                        opacity: outOfStock ? 0.4 : 1,
                        boxShadow: isSelected ? 'var(--sh-orange)' : 'var(--sh-sm)',
                        transition: 'all 0.15s ease',
                        transform: isSelected ? 'scale(0.97)' : 'scale(1)',
                      }}
                    >
                      {/* Category emoji */}
                      <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
                        {CAT_EMOJI[categories.find(c => c.id === p.category_id)?.name ?? ''] ?? '🍽'}
                      </div>
                      <div className="font-bold leading-snug" style={{ fontSize: '0.85rem', color: isSelected ? '#fff' : 'var(--text-1)', marginBottom: '0.5rem' }}>
                        {p.name}
                      </div>
                      <div className="font-black" style={{ fontSize: '1.1rem', color: isSelected ? 'rgba(255,255,255,0.9)' : 'var(--orange)' }}>
                        GH₵{Number(p.price).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '0.3rem', color: outOfStock ? 'var(--red)' : p.stock < 5 ? 'var(--amber)' : isSelected ? 'rgba(255,255,255,0.6)' : 'var(--text-3)' }}>
                        {outOfStock ? 'OUT OF STOCK' : p.stock < 5 ? `LOW: ${p.stock}` : `${p.stock} avail.`}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── ITEM PICKER PANEL (bottom) ── */}
          {pickedProduct && (
            <div className="flex-shrink-0 slide-up" style={{ background: 'var(--ink)', borderTop: '2px solid var(--orange)', padding: '1rem 1.25rem' }}>
              <div className="flex items-start gap-4 flex-wrap">
                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white leading-tight" style={{ fontSize: '1rem' }}>{pickedProduct.name}</div>
                  <div className="font-black mt-0.5" style={{ fontSize: '1.25rem', color: 'var(--orange)' }}>GH₵{Number(pickedProduct.price).toFixed(2)}</div>
                </div>

                {/* Pricing type */}
                <div className="flex gap-1.5">
                  {PRICING.map(pt => (
                    <button key={pt.value} onClick={() => { setPricingType(pt.value); setDiscountAmt('') }}
                      className="btn btn-sm"
                      style={{
                        background: pricingType === pt.value ? pt.activeBg : 'rgba(255,255,255,0.08)',
                        color: pricingType === pt.value ? pt.activeColor : '#A8917E',
                        border: `1.5px solid ${pricingType === pt.value ? 'transparent' : 'rgba(255,255,255,0.12)'}`,
                      }}>
                      {pt.emoji} {pt.label}
                    </button>
                  ))}
                </div>

                {/* Discount amount input */}
                {pricingType === 'discount' && (
                  <div style={{ minWidth: 150 }}>
                    <label className="label" style={{ color: 'var(--amber)' }}>Amount charged (GH₵)</label>
                    <input ref={discountRef} type="number" value={discountAmt} onChange={e => setDiscountAmt(e.target.value)}
                      className="input" placeholder="0.00" style={{ borderColor: 'var(--amber)', background: 'rgba(255,255,255,0.06)', color: '#fff' }} />
                    {discountAmt && !isNaN(parseFloat(discountAmt)) && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--amber)', marginTop: 3, fontWeight: 700 }}>
                        {Math.max(0, ((Number(pickedProduct.price) * qty - parseFloat(discountAmt)) / (Number(pickedProduct.price) * qty) * 100)).toFixed(1)}% discount
                      </div>
                    )}
                  </div>
                )}

                {/* Qty stepper */}
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.10)', color: '#fff', border: 'none', fontSize: '1.25rem', fontWeight: 800, cursor: 'pointer' }}>−</button>
                  <span style={{ width: 32, textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{qty}</span>
                  <button onClick={() => setQty(qty + 1)} style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.10)', color: '#fff', border: 'none', fontSize: '1.25rem', fontWeight: 800, cursor: 'pointer' }}>+</button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => setPickedProduct(null)} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.08)', color: '#A8917E', border: '1px solid rgba(255,255,255,0.12)' }}>Cancel</button>
                  <button onClick={addToCart} className="btn btn-primary btn-sm">＋ Add to Order</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: ORDER PANEL ── */}
        <div className="flex-shrink-0 flex flex-col" style={{ width: 300, background: 'var(--card)', borderLeft: '1.5px solid var(--border)' }}>

          {/* Order header */}
          <div className="px-4 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1.5px solid var(--border)', background: 'var(--ink)' }}>
            <div>
              <div className="font-black text-white text-base">ORDER</div>
              <div className="text-xs" style={{ color: '#7C6050' }}>{items.length} item{items.length !== 1 ? 's' : ''}</div>
            </div>
            {items.length > 0 && (
              <button onClick={clearCart} className="btn btn-sm" style={{ background: 'rgba(220,38,38,0.15)', color: '#F87171', border: '1px solid rgba(220,38,38,0.25)', fontSize: '0.75rem' }}>
                Clear
              </button>
            )}
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '0.75rem' }}>
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center" style={{ color: 'var(--text-3)' }}>
                <div style={{ fontSize: '2.5rem' }}>🛒</div>
                <div className="mt-3 text-sm font-semibold" style={{ color: 'var(--text-3)' }}>Order is empty</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Tap a product to add it</div>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm leading-snug truncate" style={{ color: 'var(--text-1)' }}>{item.name}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-xs" style={{ color: 'var(--text-3)' }}>GH₵{item.unitPrice.toFixed(2)} ea.</span>
                          {item.pricingType === 'discount' && <span className="badge badge-yellow">{item.discountPercent.toFixed(0)}% off</span>}
                          {item.pricingType === 'free' && <span className="badge badge-green">FREE</span>}
                        </div>
                      </div>
                      <button onClick={() => removeItem(item.id)} style={{ color: 'var(--text-3)', fontSize: '1.25rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '0 2px' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--red)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}>×</button>
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--border-2)', color: 'var(--text-2)', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}>−</button>
                        <span style={{ width: 22, textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-1)' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--border-2)', color: 'var(--text-2)', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}>+</button>
                      </div>
                      <div className="font-black" style={{ fontSize: '0.95rem', color: 'var(--orange)' }}>GH₵{item.lineTotal.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── CHECKOUT ── */}
          <div className="flex-shrink-0 p-4 space-y-3" style={{ borderTop: '1.5px solid var(--border)', background: 'var(--surface-warm)' }}>
            {/* Totals */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm" style={{ color: 'var(--text-2)' }}>
                <span>Subtotal</span><span>GH₵{gross.toFixed(2)}</span>
              </div>
              {disc > 0 && (
                <div className="flex justify-between text-sm font-semibold" style={{ color: 'var(--amber)' }}>
                  <span>Discount</span><span>−GH₵{disc.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-lg pt-1" style={{ borderTop: '1.5px solid var(--border-2)', color: 'var(--text-1)' }}>
                <span>TOTAL</span>
                <span style={{ color: 'var(--orange)' }}>GH₵{net.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="label">Payment</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[{ v: 'cash', l: '💵 Cash' }, { v: 'momo', l: '📱 MoMo' }, { v: 'card', l: '💳 Card' }].map(pm => (
                  <button key={pm.v} onClick={() => setPaymentMethod(pm.v)}
                    style={{
                      padding: '0.5rem 0.25rem', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, border: '1.5px solid', cursor: 'pointer',
                      background: paymentMethod === pm.v ? 'var(--ink)' : 'var(--card)',
                      color: paymentMethod === pm.v ? '#fff' : 'var(--text-2)',
                      borderColor: paymentMethod === pm.v ? 'var(--ink)' : 'var(--border-2)',
                    }}>
                    {pm.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash change calculator */}
            {paymentMethod === 'cash' && (
              <div>
                <label className="label">Cash received</label>
                <input type="number" value={cashGiven} onChange={e => setCashGiven(e.target.value)}
                  className="input" placeholder="0.00" style={{ borderColor: 'var(--border-2)' }} />
                {cashGiven && !isNaN(parseFloat(cashGiven)) && (
                  <div className="flex justify-between text-sm font-black mt-2 px-3 py-2 rounded-lg"
                    style={{ background: change >= 0 ? '#F0FDF4' : '#FEF2F2', color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    <span>Change</span><span>GH₵{change.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Charge button */}
            <button onClick={checkout} disabled={!items.length || checkingOut} className="btn btn-success btn-xl w-full"
              style={{ letterSpacing: '0.04em', boxShadow: items.length ? '0 4px 20px rgba(22,163,74,0.35)' : 'none' }}>
              {checkingOut ? 'Processing…' : `✓ CHARGE  GH₵${net.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
