'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Product { id: string; name: string; sku: string; price: number; stock: number; category_id?: string; description?: string }
interface Category { id: string; name: string }

const emptyForm = { name: '', sku: '', price: '', stock: '', category_id: '', description: '' }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')

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
    setForm({ name: p.name, sku: p.sku ?? '', price: String(p.price), stock: String(p.stock), category_id: p.category_id ?? '', description: p.description ?? '' })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price || !form.sku.trim()) { setMsg('Name, SKU and Price are required.'); return }
    setSaving(true); setMsg('')
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: parseFloat(form.price),
      stock: parseInt(form.stock) || 0,
      category_id: form.category_id || null,
      description: form.description || null,
    }
    const { error } = editId
      ? await supabase.from('products').update(payload).eq('id', editId)
      : await supabase.from('products').insert(payload)

    if (error) { setMsg('Error: ' + error.message); setSaving(false); return }
    setMsg(editId ? '✓ Product updated' : '✓ Product added')
    setForm(emptyForm); setEditId(null); setShowForm(false); setSaving(false); load()
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('✓ Product deleted'); load()
    setTimeout(() => setMsg(''), 3000)
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
  const lowStock = products.filter(p => p.stock < 5).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Products</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {products.length} total · {lowStock > 0 ? <span style={{ color: 'var(--danger)' }}>{lowStock} low stock</span> : 'all stocked'}
          </p>
        </div>
        <button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(s => !s) }} className="btn btn-primary">
          {showForm && !editId ? '✕ Cancel' : '+ Add Product'}
        </button>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-medium" style={{ background: msg.startsWith('✓') ? '#F0FDF4' : '#FEF2F2', color: msg.startsWith('✓') ? '#15803D' : 'var(--brand-red)', border: `1px solid ${msg.startsWith('✓') ? '#BBF7D0' : '#FECACA'}` }}>
          {msg}
        </div>
      )}

      {showForm && (
        <div className="card p-6 mb-6" style={{ borderLeft: '4px solid var(--brand-orange)' }}>
          <h2 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{editId ? 'Edit Product' : 'New Product'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Product Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="e.g. Jollof Rice (Reg)" autoFocus />
            </div>
            <div>
              <label className="label">SKU * (unique code)</label>
              <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="input" placeholder="e.g. ML-014" />
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
              <label className="label">Stock Quantity</label>
              <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="input" placeholder="99" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input" style={{ height: 72, resize: 'none' }} placeholder="Short description…" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving…' : editId ? 'Update Product' : 'Add Product'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU…" className="input" style={{ maxWidth: 340 }} />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{filtered.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-base)' }}>
                {['Name', 'SKU', 'Category', 'Price', 'Stock', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  {products.length === 0 ? 'No products yet — click "Add Product" or run the seed.' : 'No matches'}
                </td></tr>
              )}
              {filtered.map((p, i) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 1 ? 'var(--surface-base)' : undefined }}>
                  <td className="px-5 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{categories.find(c => c.id === p.category_id)?.name ?? '—'}</td>
                  <td className="px-5 py-3 font-bold" style={{ color: 'var(--brand-orange)' }}>GH₵{Number(p.price).toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className="font-semibold" style={{ color: p.stock === 0 ? 'var(--danger)' : p.stock < 5 ? 'var(--brand-amber)' : 'var(--text-primary)' }}>
                      {p.stock}
                      {p.stock === 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded" style={{ background: '#FEF2F2', color: 'var(--danger)' }}>OUT</span>}
                      {p.stock > 0 && p.stock < 5 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded" style={{ background: '#FFFBEB', color: '#92400E' }}>LOW</span>}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => startEdit(p)} className="text-sm font-semibold" style={{ color: 'var(--brand-orange)' }}>Edit</button>
                      <button onClick={() => handleDelete(p.id, p.name)} className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Delete</button>
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
