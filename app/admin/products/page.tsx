'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Product {
  id: number
  name: string
  sku?: string
  price: number
  stock: number
  category_id?: number
  is_available?: boolean
  description?: string
}
interface Category { id: number; name: string }

const emptyForm = { name: '', sku: '', price: '', stock: '', category_id: '', description: '', is_available: true }

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    setProducts(p ?? [])
    setCategories(c ?? [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
      if (!profile || profile.role !== 'manager') { router.push('/pos'); return }
      load()
    })
  }, [router])

  function startEdit(p: Product) {
    setEditId(p.id)
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      price: String(p.price),
      stock: String(p.stock),
      category_id: String(p.category_id ?? ''),
      description: p.description ?? '',
      is_available: p.is_available !== false,
    })
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      name: form.name,
      sku: form.sku || null,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      category_id: form.category_id ? parseInt(form.category_id) : null,
      description: form.description || null,
      is_available: form.is_available,
    }
    if (editId) {
      await supabase.from('products').update(payload).eq('id', editId)
    } else {
      await supabase.from('products').insert(payload)
    }
    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    load()
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin')} className="text-blue-200 hover:text-white">← Admin</button>
          <h1 className="font-bold text-lg">Products</h1>
        </div>
        <button
          onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true) }}
          className="bg-white text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition"
        >
          + Add Product
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">{editId ? 'Edit Product' : 'New Product'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input" placeholder="Product name" />
              </div>
              <div>
                <label className="label">SKU</label>
                <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                  className="input" placeholder="SKU-001" />
              </div>
              <div>
                <label className="label">Category</label>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="input">
                  <option value="">None</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Price (GH₵) *</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                  className="input" placeholder="0.00" />
              </div>
              <div>
                <label className="label">Stock *</label>
                <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                  className="input" placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="label">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="input h-20 resize-none" placeholder="Optional description" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="avail" checked={form.is_available}
                  onChange={e => setForm({ ...form, is_available: e.target.checked })} />
                <label htmlFor="avail" className="text-sm text-gray-700">Available for sale</label>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving || !form.name || !form.price}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setShowForm(false); setEditId(null) }}
                className="px-6 py-2 rounded-lg border hover:bg-gray-50 transition">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products…" className="input w-full sm:w-80" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-center">Available</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {categories.find(c => c.id === p.category_id)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">GH₵ {Number(p.price).toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${p.stock < 5 ? 'text-red-600' : ''}`}>{p.stock}</td>
                    <td className="px-4 py-3 text-center">{p.is_available !== false ? '✓' : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(p)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No products</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <style jsx>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 0.25rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input:focus { ring: 2px solid #3b82f6; border-color: #3b82f6; }
      `}</style>
    </div>
  )
}
