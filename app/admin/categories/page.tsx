'use client'
import { useEffect, useState } from 'react'

interface Category { id: string; name: string }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const r = await fetch('/api/categories')
    const d = await r.json()
    setCategories(d.categories ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true); setMsg('')
    const res = editId
      ? await fetch(`/api/categories/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      : await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    const d = await res.json()
    if (d.error) { setMsg('✗ ' + d.error) }
    else { setMsg(editId ? '✓ Updated' : '✓ Added'); setName(''); setEditId(null); load() }
    setSaving(false); setTimeout(() => setMsg(''), 3000)
  }

  async function handleDelete(id: string, catName: string) {
    if (!confirm(`Delete "${catName}"? Products will be uncategorised.`)) return
    const d = await fetch(`/api/categories/${id}`, { method: 'DELETE' }).then(r => r.json())
    if (d.error) setMsg('✗ ' + d.error)
    else { setMsg('✓ Deleted'); load() }
    setTimeout(() => setMsg(''), 3000)
  }

  const S = {
    page: { padding: '2rem', maxWidth: 640, margin: '0 auto' } as React.CSSProperties,
    h1: { fontWeight: 900, fontSize: '1.75rem', color: 'var(--text-1)', letterSpacing: '-0.02em' } as React.CSSProperties,
    sub: { color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 4 } as React.CSSProperties,
    form: { background: '#fff', border: '2px solid var(--orange)', borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem', marginTop: '1.5rem' } as React.CSSProperties,
    row: { display: 'flex', gap: 10, alignItems: 'center' } as React.CSSProperties,
    list: { background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' } as React.CSSProperties,
    item: (i: number): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', borderTop: i > 0 ? '1px solid var(--border)' : undefined }),
    avatar: { width: 36, height: 36, borderRadius: 10, background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.9rem', flexShrink: 0 } as React.CSSProperties,
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Categories</h1>
      <p style={S.sub}>Organise your menu into groups</p>

      <div style={S.form}>
        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 10 }}>
          {editId ? '✏️ Edit Category' : '＋ New Category'}
        </div>
        <div style={S.row}>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Meals, Drinks, Pastries" className="input" autoFocus style={{ flex: 1 }} />
          <button onClick={handleSave} disabled={saving || !name.trim()} className="btn btn-primary">
            {saving ? '…' : editId ? 'Update' : 'Add'}
          </button>
          {editId && <button onClick={() => { setEditId(null); setName('') }} className="btn btn-ghost">Cancel</button>}
        </div>
        {msg && <div style={{ marginTop: 8, fontSize: '0.85rem', fontWeight: 700, color: msg.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>{msg}</div>}
      </div>

      <div style={S.list}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: '0.9rem' }}>All Categories</span>
          <span style={{ background: '#FFF8F5', color: 'var(--orange)', fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: 999 }}>{categories.length}</span>
        </div>
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>No categories yet</div>
        ) : categories.map((c, i) => (
          <div key={c.id} style={S.item(i)}>
            <div style={S.avatar}>{c.name[0].toUpperCase()}</div>
            <span style={{ flex: 1, fontWeight: 700, color: 'var(--text-1)' }}>{c.name}</span>
            <button onClick={() => { setEditId(c.id); setName(c.name) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'var(--orange)', fontSize: '0.85rem' }}>Edit</button>
            <button onClick={() => handleDelete(c.id, c.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'var(--red)', fontSize: '0.85rem' }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}
