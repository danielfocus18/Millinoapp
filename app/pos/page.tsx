'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/store/cart'
import type { User } from '@supabase/supabase-js'

interface Product {
  id: number
  name: string
  price: number
  stock: number
  sku?: string
  category_id?: number
  is_available?: boolean
}

interface Category {
  id: number
  name: string
}

interface Profile {
  role: string
  name: string
}

export default function POSPage() {
  const router = useRouter()
  const { items, addItem, removeItem, updateQty, clearCart, total } = useCart()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')

  const loadData = useCallback(async () => {
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('products').select('*').eq('is_available', true).order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    setProducts(prods ?? [])
    setCategories(cats ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', session.user.id)
        .single()
      setProfile(data)
      loadData()
    })
  }, [router, loadData])

  const filtered = products.filter((p) => {
    const matchCat = selectedCat == null || p.category_id === selectedCat
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  async function handleCheckout() {
    if (items.length === 0) return
    setCheckingOut(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashier_id: user?.id,
          items: items.map((i) => ({
            product_id: i.id,
            quantity: i.quantity,
            unit_price: i.price,
          })),
          total: total(),
          payment_method: paymentMethod,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setOrderId(data.order.id)
      setOrderSuccess(true)
      clearCart()
      loadData()
    } catch (err) {
      alert('Checkout failed: ' + (err as Error).message)
    } finally {
      setCheckingOut(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const cartTotal = total()
  const change = amountPaid ? parseFloat(amountPaid) - cartTotal : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading POS…</div>
      </div>
    )
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sale Complete!</h2>
          <p className="text-gray-500 text-sm mb-1">Order #{orderId?.slice(-8).toUpperCase()}</p>
          <p className="text-2xl font-bold text-blue-600 mb-6">GH₵ {cartTotal.toFixed(2)}</p>
          {paymentMethod === 'cash' && amountPaid && (
            <p className="text-gray-600 mb-4">Change: GH₵ {Math.max(0, change).toFixed(2)}</p>
          )}
          <button
            onClick={() => { setOrderSuccess(false); setAmountPaid('') }}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            New Sale
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      {/* Top bar */}
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">Millino POS</span>
          {profile && <span className="text-blue-200 text-sm">| {profile.name}</span>}
        </div>
        <div className="flex items-center gap-3">
          {profile?.role === 'manager' && (
            <button
              onClick={() => router.push('/admin')}
              className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition"
            >
              Admin
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Products panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + category filter */}
          <div className="bg-white px-4 py-3 border-b flex gap-3 flex-shrink-0">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Categories */}
          <div className="bg-white px-4 py-2 border-b flex gap-2 overflow-x-auto flex-shrink-0">
            <button
              onClick={() => setSelectedCat(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                selectedCat === null ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedCat === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="text-center text-gray-400 mt-16">No products found</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addItem({ id: p.id, name: p.name, price: p.price, sku: p.sku })}
                    disabled={p.stock === 0}
                    className="bg-white rounded-xl p-4 text-left shadow-sm hover:shadow-md transition hover:ring-2 hover:ring-blue-400 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="font-medium text-gray-900 text-sm mb-1 leading-tight">{p.name}</div>
                    <div className="text-blue-600 font-bold">GH₵ {p.price.toFixed(2)}</div>
                    <div className={`text-xs mt-1 ${p.stock < 5 ? 'text-red-500' : 'text-gray-400'}`}>
                      {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart panel */}
        <div className="w-80 bg-white border-l flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b">
            <h2 className="font-bold text-gray-900">Cart ({items.length} items)</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {items.length === 0 ? (
              <div className="text-gray-400 text-sm text-center mt-8">Cart is empty</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                    <div className="text-xs text-gray-500">GH₵ {item.price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 text-sm font-bold"
                    >−</button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 text-sm font-bold"
                    >+</button>
                  </div>
                  <div className="text-sm font-medium text-gray-900 w-16 text-right">
                    GH₵ {(item.price * item.quantity).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-400 hover:text-red-600 text-lg leading-none"
                  >×</button>
                </div>
              ))
            )}
          </div>

          {/* Checkout area */}
          <div className="border-t px-4 py-4 space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-blue-600">GH₵ {cartTotal.toFixed(2)}</span>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Payment</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="cash">Cash</option>
                <option value="momo">Mobile Money</option>
                <option value="card">Card</option>
              </select>
            </div>

            {paymentMethod === 'cash' && (
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Amount Paid</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
                {amountPaid && (
                  <div className="text-xs mt-1 text-gray-600">
                    Change: GH₵ {Math.max(0, change).toFixed(2)}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={items.length === 0 || checkingOut}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingOut ? 'Processing…' : 'Charge'}
            </button>

            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="w-full text-sm text-red-500 hover:text-red-700 transition"
              >
                Clear Cart
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
