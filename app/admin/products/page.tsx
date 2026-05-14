'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Product { id: number; name: string; sku?: string; price: number; stock: number; category_id?: number; is_available?: boolean; description?: string }
interface Category { id: number; name: string }

const emptyForm = { name: '', sku: '', price: '', stock: '', category_id: '', description: '', is_available: true }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    setProducts(p ?? [])
    setCategories(c ?? [])
  }

  useEffect(() => { load() }, [])

  function startEdit(p: Product) {
    setEditId(p.id)
    setForm({ name: p.name, sku: p.sku ?? '', price: String(p.price), stock: String(p.stock), category_id: String(p.category_id ?? ''), description: p.description ?? '', is_available: p.is_available !== false })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    if (!form.name || !form.price) return
    setSaving(true)
    const payload = { name: form.name, sku: form.sku || null, price: parseFloat(form.price), stock: parseInt(form.stock) || 0, category_id: form.category_id ? parseInt(form.category_id) : null, description: form.description || null, is_available: form.is_available }
    if (editId) await supabase.from('products').update(payload).eq('id', editId)
    else await supabase.from('products').insert(payload)
    setForm(emptyForm); setEditId(null); setShowForm(false); setSaving(false); load()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setDeleting(id)
    await supabase.from('products').delete().eq('id', id)
    setDeleting(null); load()
  }

  async function toggleAvailable(p: Product) {
    await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id)
    load()
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Products</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{products.length} total · {products.filter(p => p.stock < 5).length} low stock</p>
        </div>
        <button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(!showForm) }} className="btn btn-primary">
          {showForm ? '✕ Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6" style={{ borderLeft: '4px solid var(--brand-orange)' }}>
          <h2 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{editId ? 'Edit Product' : 'New Product'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Product Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="e.g. Jollof Rice" autoFocus />
            </div>
            <div>
              <label className="label">SKU</label>
              <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="input" placeholder="e.g. JR-001" />
            </div>
            <div>
              <label className="label">Category</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="input">
                <option value="">— None —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Price (GH₵) *</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="label">Stock Quantity *</label>
              <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="input" placeholder="0" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input" style={{ height: 72, resize: 'none' }} placeholder="Optional" />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="avail" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })} style={{ accentColor: 'var(--brand-orange)', width: 16, height: 16 }} />
              <label htmlFor="avail" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Available for sale on POS</label>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} disabled={saving || !form.name || !form.price} className="btn btn-primary">
              {saving ? 'Saving…' : editId ? 'Update Product' : 'Add Product'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="input" style={{ maxWidth: 340 }} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-base)' }}>
                {['Name', 'SKU', 'Category', 'Price', 'Stock', 'Available', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No products{search ? ' matching search' : ' yet'}</td></tr>
              )}
              {filtered.map((p, i) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 1 ? 'var(--surface-base)' : undefined }}>
                  <td className="px-5 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku || '—'}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{categories.find(c => c.id === p.category_id)?.name || '—'}</td>
                  <td className="px-5 py-3 font-bold" style={{ color: 'var(--brand-orange)' }}>GH₵{Number(p.price).toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className="font-semibold" style={{ color: p.stock === 0 ? 'var(--danger)' : p.stock < 5 ? 'var(--brand-amber)' : 'var(--text-primary)' }}>
                      {p.stock}
                      {p.stock === 0 && <span className="ml-1 text-xs" style={{ color: 'var(--danger)' }}>OUT</span>}
                      {p.stock > 0 && p.stock < 5 && <span className="ml-1 text-xs" style={{ color: 'var(--brand-amber)' }}>LOW</span>}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleAvailable(p)} className="badge" style={p.is_available !== false ? { background: '#F0FDF4', color: '#15803D', cursor: 'pointer' } : { background: '#F5F5F4', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {p.is_available !== false ? '● Active' : '○ Hidden'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(p)} className="text-sm font-semibold" style={{ color: 'var(--brand-orange)' }}>Edit</button>
                      <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>{deleting === p.id ? '…' : 'Delete'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
