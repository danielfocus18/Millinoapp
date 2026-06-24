'use client'
import { useEffect, useState } from 'react'
import { Pencil, Plus, X, CheckCircle2, XCircle, Package, ImageOff } from 'lucide-react'
import { ProductImageUpload } from '@/components/admin/ProductImageUpload'

interface Product { id: string; name: string; sku: string; price: number; stock: number; category_id?: string; description?: string; image_url?: string | null }
interface Category { id: string; name: string }
interface Msg { type: 'success' | 'error'; text: string }
const empty = { name: '', sku: '', price: '', stock: '', category_id: '', description: '', image_url: null as string | null }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<Msg | null>(null)

  async function load() {
    const [pd, cd] = await Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ])
    setProducts(pd.products ?? [])
    setCategories(cd.categories ?? [])
  }

  useEffect(() => { load() }, [])

  function startEdit(p: Product) {
    setEditId(p.id)
    setForm({ name: p.name, sku: p.sku ?? '', price: String(p.price), stock: String(p.stock), category_id: p.category_id ?? '', description: p.description ?? '', image_url: p.image_url ?? null })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    if (!form.name.trim() || !form.sku.trim() || !form.price) { setMsg({ type: 'error', text: 'Name, SKU and Price are required' }); return }
    setSaving(true); setMsg(null)
    const payload = {
      name: form.name.trim(), sku: form.sku.trim(), price: parseFloat(form.price),
      stock: parseInt(form.stock) || 0, category_id: form.category_id || null,
      description: form.description || null, image_url: form.image_url || null,
    }
    const res = editId
      ? await fetch(`/api/products/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await res.json()
    if (d.error) { setMsg({ type: 'error', text: d.error }); setSaving(false); return }
    setMsg({ type: 'success', text: d.warning ?? (editId ? 'Product updated' : 'Product added') })
    setForm(empty); setEditId(null); setShowForm(false); setSaving(false); load()
    setTimeout(() => setMsg(null), 4000)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    const d = await fetch(`/api/products/${id}`, { method: 'DELETE' }).then(r => r.json())
    if (d.error) setMsg({ type: 'error', text: d.error })
    else { setMsg({ type: 'success', text: 'Deleted' }); load() }
    setTimeout(() => setMsg(null), 3000)
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(search.toLowerCase()))
  const lowStock = products.filter(p => p.stock < 5).length
  const card: React.CSSProperties = { background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14 }

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: '1.75rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Products</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 4 }}>
            {products.length} total {lowStock > 0 && <span style={{ color: 'var(--red)', fontWeight: 700 }}>· {lowStock} low stock</span>}
          </p>
        </div>
        <button onClick={() => { setEditId(null); setForm(empty); setShowForm(s => !s) }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {showForm && !editId ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add Product</>}
        </button>
      </div>

      {msg && (
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1rem', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', background: msg.type === 'success' ? '#F0FDF4' : '#FEF2F2', color: msg.type === 'success' ? 'var(--green)' : 'var(--red)', border: `1.5px solid ${msg.type === 'success' ? '#BBF7D0' : '#FECACA'}` }}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {msg.text}
        </div>
      )}

      {showForm && (
        <div style={{ ...card, padding: '1.5rem', marginBottom: '1.5rem', borderColor: 'var(--orange)', borderWidth: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: 'var(--text-1)', marginBottom: '1rem' }}>
            {editId ? <Pencil size={16} /> : <Plus size={16} />}
            {editId ? 'Edit Product' : 'New Product'}
          </div>

          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {/* Image upload — fixed square, every photo crops to fit identically */}
            <div>
              <label className="label">Photo</label>
              <ProductImageUpload value={form.image_url} onChange={url => setForm({ ...form, image_url: url })} size={96} />
            </div>

            {/* Form fields */}
            <div style={{ flex: 1, minWidth: 280, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
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
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="label">Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input" style={{ height: 68, resize: 'none' }} placeholder="Short description…" />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: '1.125rem' }}>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : editId ? 'Update Product' : 'Add Product'}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(empty) }} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1.5px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU…" className="input" style={{ maxWidth: 320 }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600 }}>{filtered.length} shown</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                {['', 'Name', 'SKU', 'Category', 'Price', 'Stock', ''].map((h, i) => (
                  <th key={i} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <Package size={32} strokeWidth={1.5} />
                    {products.length === 0 ? 'No products yet — click Add Product or seed the menu from Dashboard' : 'No matches'}
                  </div>
                </td></tr>
              )}
              {filtered.map((p, i) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'var(--surface)' : '#fff' }}>
                  <td style={{ padding: '0.6rem 0.75rem 0.6rem 1.25rem' }}>
                    {/* Thumbnail — fixed 40x40 square, cropped consistently */}
                    <div style={{ width: 40, height: 40, borderRadius: 9, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <ImageOff size={16} color="var(--text-3)" />}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1.25rem', fontWeight: 700, color: 'var(--text-1)' }}>{p.name}</td>
                  <td style={{ padding: '0.75rem 1.25rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-3)' }}>{p.sku}</td>
                  <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-2)' }}>{categories.find(c => c.id === p.category_id)?.name ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1.25rem', fontWeight: 800, color: 'var(--orange)' }}>GH₵{Number(p.price).toFixed(2)}</td>
                  <td style={{ padding: '0.75rem 1.25rem' }}>
                    <span style={{ fontWeight: 700, color: p.stock === 0 ? 'var(--red)' : p.stock < 5 ? 'var(--amber)' : 'var(--text-1)' }}>
                      {p.stock}
                      {p.stock === 0 && <span style={{ marginLeft: 6, fontSize: '0.68rem', fontWeight: 800, background: '#FEF2F2', color: 'var(--red)', padding: '0.15rem 0.45rem', borderRadius: 999 }}>OUT</span>}
                      {p.stock > 0 && p.stock < 5 && <span style={{ marginLeft: 6, fontSize: '0.68rem', fontWeight: 800, background: '#FFFBEB', color: '#92400E', padding: '0.15rem 0.45rem', borderRadius: 999 }}>LOW</span>}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                      <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'var(--orange)', fontSize: '0.85rem' }}>Edit</button>
                      <button onClick={() => handleDelete(p.id, p.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'var(--red)', fontSize: '0.85rem' }}>Delete</button>
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
