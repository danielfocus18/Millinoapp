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

const CAT_EMOJI: Record<string, string> = { Meals: '🍛', Pastries: '🥐', Drinks: '🥤' }

const PRICING: { value: PricingType; label: string; activeBg: string }[] = [
  { value: 'normal',   label: 'Normal',   activeBg: 'var(--ink)'   },
  { value: 'discount', label: 'Discount', activeBg: '#D97706'       },
  { value: 'free',     label: 'Free',     activeBg: 'var(--green)'  },
]

export default function POSPage() {
  const router = useRouter()
  const cart = useCart()
  const { items, addItem, removeItem, updateQty, clearCart, grossTotal, discountTotal, netTotal } = cart

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
  const [showCart, setShowCart] = useState(false) // mobile cart toggle
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
      const orig = pickedProduct.price * qty
      discountPercent = orig > 0 ? ((orig - paid) / orig) * 100 : 0
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
      setReceipt({
        orderId: data.order.id,
        items: items.map(i => ({ name: i.name, qty: i.quantity, unitPrice: i.unitPrice, pricingType: i.pricingType, discountPercent: i.discountPercent, lineTotal: i.lineTotal })),
        gross: grossTotal(), discount: discountTotal(), net: netTotal(),
        cashier: profile?.name ?? '', date: now.toLocaleDateString('en-GH', { dateStyle: 'medium' }),
        time: now.toLocaleTimeString('en-GH', { timeStyle: 'short' }), paymentMethod,
        amountPaid: parseFloat(cashGiven) || netTotal(),
      })
      clearCart(); loadData()
    } catch (err) { alert('Error: ' + (err as Error).message) }
    finally { setCheckingOut(false) }
  }

  const gross = grossTotal(), disc = discountTotal(), net = netTotal()
  const change = Math.max(0, (parseFloat(cashGiven) || 0) - net)

  // ── LOADING ──
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)' }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo.png" alt="" style={{ width: 56, height: 56, objectFit: 'contain', opacity: 0.5, marginBottom: 12 }} />
        <div style={{ color: '#5C4033', fontSize: '0.875rem' }}>Loading POS…</div>
      </div>
    </div>
  )

  // ── RECEIPT ──
  if (receipt) return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '2rem' }}>

      {/* ── Screen receipt card — pure black & white ── */}
      <div style={{ width: 340, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.12)', border: '1px solid #E0E0E0' }}>

        {/* Header — white background, black text, logo in color */}
        <div style={{ background: '#fff', padding: '1.75rem 1.5rem 1.25rem', textAlign: 'center', borderBottom: '1px solid #E8E8E8' }}>
          <img src="/logo.png" alt="Millino Chops" style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontWeight: 900, color: '#000', fontSize: '1.15rem', letterSpacing: '0.08em', marginBottom: 3 }}>MILLINO CHOPS</div>
          <div style={{ color: '#555', fontSize: '0.72rem' }}>Eatery Point of Sale</div>
          <div style={{ marginTop: 12, fontSize: '0.72rem', lineHeight: 2, color: '#333' }}>
            <div>{receipt.date} · {receipt.time}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700 }}>#{receipt.orderId.slice(-8).toUpperCase()}</div>
            <div>{receipt.cashier}</div>
          </div>
        </div>

        {/* Items */}
        <div style={{ padding: '1rem 1.375rem', borderBottom: '1px dashed #BDBDBD' }}>
          {receipt.items.map((item, i) => (
            <div key={i} style={{ marginBottom: i < receipt.items.length - 1 ? 12 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem', color: '#000' }}>
                <span style={{ flex: 1, marginRight: 8 }}>{item.name}</span>
                <span style={{ flexShrink: 0 }}>GH₵{item.lineTotal.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#555', marginTop: 3, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>{item.qty} × GH₵{item.unitPrice.toFixed(2)}</span>
                {item.pricingType === 'discount' && (
                  <span style={{ border: '1px solid #000', color: '#000', fontWeight: 800, padding: '0 5px', borderRadius: 3, fontSize: '0.6rem' }}>{item.discountPercent.toFixed(0)}% OFF</span>
                )}
                {item.pricingType === 'free' && (
                  <span style={{ border: '1px solid #000', color: '#000', fontWeight: 800, padding: '0 5px', borderRadius: 3, fontSize: '0.6rem' }}>FREE</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ padding: '1rem 1.375rem', borderBottom: '1px dashed #BDBDBD' }}>
          {receipt.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', color: '#000', marginBottom: 6 }}>
              <span>Discount</span><span>−GH₵{receipt.discount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.05rem', color: '#000' }}>
            <span>TOTAL</span>
            <span>GH₵{receipt.net.toFixed(2)}</span>
          </div>
          {receipt.paymentMethod === 'cash' && receipt.amountPaid > receipt.net && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', color: '#000', marginTop: 6 }}>
              <span>Change</span><span>GH₵{(receipt.amountPaid - receipt.net).toFixed(2)}</span>
            </div>
          )}
          <div style={{ fontSize: '0.75rem', color: '#555', marginTop: 10 }}>
            Payment: {receipt.paymentMethod === 'momo' ? 'Mobile Money (MoMo)' : receipt.paymentMethod === 'card' ? 'Card' : 'Cash'}
          </div>
        </div>

        {/* Thank you footer */}
        <div style={{ background: '#fff', padding: '1.25rem', textAlign: 'center', borderTop: '1px solid #E8E8E8' }}>
          <div style={{ fontWeight: 900, color: '#000', fontSize: '0.85rem', letterSpacing: '0.08em', marginBottom: 4 }}>
            THANK YOU! COME AGAIN
          </div>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>We appreciate your patronage</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => window.print()} className="btn btn-outline">🖨 Print Receipt</button>
        <button onClick={() => { setReceipt(null); setCashGiven('') }} className="btn btn-primary btn-lg">＋ New Sale</button>
      </div>

      {/* Hidden thermal receipt for printing */}
      <div id="receipt-print" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 2 }}>MILLINO CHOPS</div>
          <div style={{ fontSize: 11 }}>Eatery Point of Sale</div>
          <div style={{ fontSize: 10, marginTop: 4, lineHeight: 1.7 }}>
            {receipt.date} · {receipt.time}<br />
            Order: #{receipt.orderId.slice(-8).toUpperCase()}<br />
            Cashier: {receipt.cashier}
          </div>
        </div>
        <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '8px 0', margin: '8px 0' }}>
          {receipt.items.map((item, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12 }}>
                <span style={{ flex: 1, paddingRight: 8 }}>{item.name}</span>
                <span>GH{item.lineTotal.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: 10, color: '#000' }}>
                {item.qty} x GH{item.unitPrice.toFixed(2)}
                {item.pricingType === 'discount' && ` (${item.discountPercent.toFixed(0)}% OFF)`}
                {item.pricingType === 'free' && ' (COMPLIMENTARY)'}
              </div>
            </div>
          ))}
        </div>
        {receipt.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span>Discount:</span><span>-GH{receipt.discount.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 14, borderTop: '1px dashed #000', paddingTop: 6, marginTop: 4 }}>
          <span>TOTAL:</span><span>GH{receipt.net.toFixed(2)}</span>
        </div>
        {receipt.paymentMethod === 'cash' && receipt.amountPaid > receipt.net && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
            <span>Change:</span><span>GH{(receipt.amountPaid - receipt.net).toFixed(2)}</span>
          </div>
        )}
        <div style={{ fontSize: 10, marginTop: 6 }}>
          Payment: {receipt.paymentMethod === 'momo' ? 'Mobile Money' : receipt.paymentMethod === 'card' ? 'Card' : 'Cash'}
        </div>
        <div style={{ textAlign: 'center', marginTop: 12, borderTop: '1px dashed #000', paddingTop: 8 }}>
          <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>THANK YOU! COME AGAIN</div>
          <div style={{ fontSize: 9, marginTop: 3 }}>millinoapp.vercel.app</div>
        </div>
      </div>
    </div>
  )

  // ── MAIN POS ──
  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--ink)' }}>

      {/* ── TOP BAR ── */}
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: 56, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <img src="/logo.png" alt="Millino Chops" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontWeight: 900, color: '#fff', fontSize: '0.82rem', letterSpacing: '0.05em' }}>MILLINO CHOPS</div>
            <div style={{ color: '#5C4033', fontSize: '0.65rem' }}>
              {new Date().toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {profile && <span style={{ color: '#7C6050', fontSize: '0.8rem', fontWeight: 600 }} className="hidden sm:inline">{profile.name}</span>}
          {profile?.role === 'manager' && (
            <button onClick={() => router.push('/admin')} className="btn btn-sm" style={{ background: 'rgba(240,90,40,0.15)', color: '#FDA274', border: '1px solid rgba(240,90,40,0.3)' }}>Admin ↗</button>
          )}
          {/* Mobile cart toggle */}
          <button onClick={() => setShowCart(s => !s)} className="btn btn-sm md:hidden" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', position: 'relative' }}>
            🛒 {items.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 999, background: 'var(--orange)', color: '#fff', fontSize: '0.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{items.length}</span>}
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.06)', color: '#7C6050' }}>Out</button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* ── PRODUCTS PANEL ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--surface)' }}>

          {/* Search + categories */}
          <div style={{ flexShrink: 0, padding: '1rem 1.5rem 0.875rem', background: '#fff', borderBottom: '1.5px solid var(--border)' }}>
            <div style={{ position: 'relative', marginBottom: '0.875rem' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: 'var(--text-3)' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu…" className="input"
                style={{ paddingLeft: '2.25rem', background: 'var(--surface)', borderColor: 'var(--border)' }} />
            </div>
            {/* Category pills */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {[{ id: null, name: 'All Items' }, ...categories].map(c => {
                const active = selectedCat === c.id
                return (
                  <button key={c.id ?? 'all'} onClick={() => setSelectedCat(c.id as string | null)} style={{
                    flexShrink: 0, padding: '0.4rem 1rem', borderRadius: 999, fontSize: '0.82rem', fontWeight: 700,
                    border: active ? 'none' : '1.5px solid var(--border-2)',
                    background: active ? 'var(--orange)' : '#fff',
                    color: active ? '#fff' : 'var(--text-2)',
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: active ? 'var(--sh-orange)' : 'none',
                  }}>
                    {c.id ? (CAT_EMOJI[c.name] ?? '🍽') + ' ' : ''}{c.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Product grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
            {filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)' }}>
                <div style={{ fontSize: '3.5rem' }}>🍽️</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-2)', marginTop: 12 }}>
                  {products.length === 0 ? 'Menu is empty' : 'Nothing found'}
                </div>
                {products.length === 0 && profile?.role === 'manager' && (
                  <button onClick={() => router.push('/admin')} className="btn btn-primary" style={{ marginTop: 16 }}>
                    Go to Admin → Add Products
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                {filtered.map(p => {
                  const outOfStock = p.stock === 0
                  const isSelected = pickedProduct?.id === p.id
                  return (
                    <button key={p.id} onClick={() => pickProduct(p)} disabled={outOfStock} style={{
                      background: isSelected ? 'var(--orange)' : '#fff',
                      border: isSelected ? '2.5px solid var(--orange-dk)' : '1.5px solid var(--border)',
                      borderRadius: 16, padding: '1rem',
                      cursor: outOfStock ? 'not-allowed' : 'pointer',
                      opacity: outOfStock ? 0.4 : 1,
                      boxShadow: isSelected ? 'var(--sh-orange)' : 'var(--sh-sm)',
                      transition: 'all 0.15s', textAlign: 'left',
                      transform: isSelected ? 'scale(0.97)' : 'scale(1)',
                    }}>
                      <div style={{ fontSize: '1.75rem', marginBottom: 8 }}>
                        {CAT_EMOJI[categories.find(c => c.id === p.category_id)?.name ?? ''] ?? '🍽'}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.83rem', color: isSelected ? '#fff' : 'var(--text-1)', lineHeight: 1.3, marginBottom: 6 }}>
                        {p.name}
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '1.05rem', color: isSelected ? 'rgba(255,255,255,0.92)' : 'var(--orange)' }}>
                        GH₵{Number(p.price).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.67rem', fontWeight: 700, marginTop: 4, color: outOfStock ? 'var(--red)' : p.stock < 5 ? 'var(--amber)' : isSelected ? 'rgba(255,255,255,0.55)' : 'var(--text-3)' }}>
                        {outOfStock ? 'OUT OF STOCK' : p.stock < 5 ? `LOW: ${p.stock}` : `${p.stock} avail.`}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── ITEM PICKER PANEL ── */}
          {pickedProduct && (
            <div className="slide-up" style={{ flexShrink: 0, background: 'var(--ink)', borderTop: '2px solid var(--orange)', padding: '1rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem', marginBottom: 2 }}>{pickedProduct.name}</div>
                  <div style={{ fontWeight: 900, color: 'var(--orange)', fontSize: '1.2rem' }}>GH₵{Number(pickedProduct.price).toFixed(2)}</div>
                </div>
                {/* Pricing type */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {PRICING.map(pt => (
                    <button key={pt.value} onClick={() => { setPricingType(pt.value); setDiscountAmt('') }} style={{
                      padding: '0.35rem 0.75rem', borderRadius: 7, fontSize: '0.78rem', fontWeight: 700,
                      background: pricingType === pt.value ? pt.activeBg : 'rgba(255,255,255,0.08)',
                      color: pricingType === pt.value ? '#fff' : '#A8917E',
                      border: `1.5px solid ${pricingType === pt.value ? 'transparent' : 'rgba(255,255,255,0.10)'}`,
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}>{pt.label}</button>
                  ))}
                </div>
                {/* Discount amount */}
                {pricingType === 'discount' && (
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Amount charged (GH₵)</div>
                    <input ref={discountRef} type="number" value={discountAmt} onChange={e => setDiscountAmt(e.target.value)}
                      placeholder="0.00" style={{ width: 130, padding: '0.4rem 0.6rem', borderRadius: 7, border: '1.5px solid var(--amber)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }} />
                    {discountAmt && !isNaN(parseFloat(discountAmt)) && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--amber)', marginTop: 3, fontWeight: 700 }}>
                        {Math.max(0, ((Number(pickedProduct.price) * qty - parseFloat(discountAmt)) / (Number(pickedProduct.price) * qty) * 100)).toFixed(1)}% discount
                      </div>
                    )}
                  </div>
                )}
                {/* Qty */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.10)', color: '#fff', border: 'none', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ width: 28, textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{qty}</span>
                  <button onClick={() => setQty(qty + 1)} style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.10)', color: '#fff', border: 'none', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setPickedProduct(null)} style={{ padding: '0.4rem 0.875rem', borderRadius: 7, background: 'rgba(255,255,255,0.08)', color: '#A8917E', border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 700 }}>Cancel</button>
                  <button onClick={addToCart} className="btn btn-primary btn-sm">＋ Add to Order</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── CART PANEL ── */}
        {/* Desktop: always visible. Mobile: slide-in overlay */}
        <>
          {/* Mobile backdrop */}
          {showCart && (
            <div onClick={() => setShowCart(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 20 }} className="md:hidden" />
          )}
          <div style={{
            width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
            background: '#fff', borderLeft: '1.5px solid var(--border)',
            // On mobile: fixed right drawer
            position: 'relative',
          }}
          className={`
            hidden md:flex
            ${showCart ? 'fixed right-0 top-0 h-full z-30 flex flex-col shadow-2xl' : ''}
          `}
          >
            {/* Cart header */}
            <div style={{ flexShrink: 0, padding: '1rem 1.25rem', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <div style={{ fontWeight: 900, color: '#fff', fontSize: '0.95rem' }}>ORDER</div>
                <div style={{ fontSize: '0.72rem', color: '#5C4033', marginTop: 1 }}>{items.length} item{items.length !== 1 ? 's' : ''}</div>
              </div>
              {items.length > 0 && (
                <button onClick={clearCart} style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 6, color: '#F87171', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', cursor: 'pointer' }}>Clear</button>
              )}
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem' }}>
              {items.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                  <div style={{ fontSize: '2.25rem' }}>🛒</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: 8 }}>Order is empty</div>
                  <div style={{ fontSize: '0.75rem', marginTop: 3 }}>Tap a product to begin</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((item, i) => (
                    <div key={i} style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--text-1)', lineHeight: 1.3 }}>{item.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>GH₵{item.unitPrice.toFixed(2)} ea.</span>
                            {item.pricingType === 'discount' && <span style={{ background: '#FFFBEB', color: '#92400E', fontSize: '0.6rem', fontWeight: 800, padding: '1px 5px', borderRadius: 999 }}>{item.discountPercent.toFixed(0)}% off</span>}
                            {item.pricingType === 'free' && <span style={{ background: '#F0FDF4', color: '#15803D', fontSize: '0.6rem', fontWeight: 800, padding: '1px 5px', borderRadius: 999 }}>FREE</span>}
                          </div>
                        </div>
                        <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '1.1rem', cursor: 'pointer', flexShrink: 0, padding: '0 2px', lineHeight: 1 }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--red)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}>×</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => updateQty(item.id, item.quantity - 1)} style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--border-2)', border: 'none', fontWeight: 800, cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ width: 22, textAlign: 'center', fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-1)' }}>{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, item.quantity + 1)} style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--border-2)', border: 'none', fontWeight: 800, cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--orange)' }}>GH₵{item.lineTotal.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkout area */}
            <div style={{ flexShrink: 0, padding: '1rem 1.125rem', borderTop: '1.5px solid var(--border)', background: 'var(--surface-warm)' }}>
              {/* Totals */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', color: 'var(--text-2)', marginBottom: 4 }}>
                  <span>Subtotal</span><span>GH₵{gross.toFixed(2)}</span>
                </div>
                {disc > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', color: 'var(--amber)', fontWeight: 600, marginBottom: 4 }}>
                    <span>Discount</span><span>−GH₵{disc.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.05rem', borderTop: '1.5px solid var(--border-2)', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ color: 'var(--text-1)' }}>TOTAL</span>
                  <span style={{ color: 'var(--orange)' }}>GH₵{net.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Payment</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {[{ v: 'cash', l: '💵', s: 'Cash' }, { v: 'momo', l: '📱', s: 'MoMo' }, { v: 'card', l: '💳', s: 'Card' }].map(pm => (
                    <button key={pm.v} onClick={() => setPaymentMethod(pm.v)} style={{
                      padding: '0.5rem 0.25rem', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700,
                      background: paymentMethod === pm.v ? 'var(--ink)' : '#fff',
                      color: paymentMethod === pm.v ? '#fff' : 'var(--text-2)',
                      border: `1.5px solid ${paymentMethod === pm.v ? 'var(--ink)' : 'var(--border-2)'}`,
                      cursor: 'pointer', transition: 'all 0.12s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}>
                      <span style={{ fontSize: '1rem' }}>{pm.l}</span>
                      <span>{pm.s}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash change */}
              {paymentMethod === 'cash' && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Cash received</div>
                  <input type="number" value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="0.00" className="input" style={{ borderColor: 'var(--border-2)' }} />
                  {cashGiven && !isNaN(parseFloat(cashGiven)) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', fontWeight: 800, marginTop: 6, padding: '0.4rem 0.625rem', borderRadius: 7, background: change >= 0 ? '#F0FDF4' : '#FEF2F2', color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      <span>Change</span><span>GH₵{change.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Charge button */}
              <button onClick={checkout} disabled={!items.length || checkingOut} className="btn btn-success w-full"
                style={{ padding: '0.875rem', fontSize: '0.95rem', fontWeight: 900, borderRadius: 12, letterSpacing: '0.04em', boxShadow: items.length ? '0 4px 20px rgba(22,163,74,0.35)' : 'none' }}>
                {checkingOut ? 'Processing…' : `✓ CHARGE  GH₵${net.toFixed(2)}`}
              </button>
            </div>
          </div>

          {/* Mobile cart — shown when showCart=true */}
          {showCart && (
            <div style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 300, zIndex: 30, display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: '1.5px solid var(--border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.2)' }} className="md:hidden">
              <div style={{ flexShrink: 0, padding: '1rem 1.25rem', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 900, color: '#fff' }}>ORDER — {items.length} items</div>
                <button onClick={() => setShowCart(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: '1rem' }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem' }}>
                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>Cart empty</div>
                ) : items.map((item, i) => (
                  <div key={i} style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '0.75rem', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.83rem', marginBottom: 6 }}>
                      <span>{item.name}</span>
                      <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>×</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--border-2)', border: 'none', fontWeight: 800, cursor: 'pointer' }}>−</button>
                        <span style={{ width: 22, textAlign: 'center', fontWeight: 800 }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--border-2)', border: 'none', fontWeight: 800, cursor: 'pointer' }}>+</button>
                      </div>
                      <span style={{ fontWeight: 900, color: 'var(--orange)' }}>GH₵{item.lineTotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '1rem', borderTop: '1.5px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.05rem', marginBottom: 12 }}>
                  <span>TOTAL</span><span style={{ color: 'var(--orange)' }}>GH₵{net.toFixed(2)}</span>
                </div>
                <button onClick={() => { checkout(); setShowCart(false) }} disabled={!items.length || checkingOut} className="btn btn-success w-full" style={{ padding: '0.875rem', fontWeight: 900, borderRadius: 12 }}>
                  {checkingOut ? 'Processing…' : `✓ CHARGE GH₵${net.toFixed(2)}`}
                </button>
              </div>
            </div>
          )}
        </>
      </div>
    </div>
  )
}
