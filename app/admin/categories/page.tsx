'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Category { id: number; name: string }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    if (editId) await supabase.from('categories').update({ name: name.trim() }).eq('id', editId)
    else await supabase.from('categories').insert({ name: name.trim() })
    setName(''); setEditId(null); setSaving(false); load()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this category? Products will be uncategorised.')) return
    await supabase.from('categories').delete().eq('id', id)
    load()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Categories</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Organise your products into groups</p>
      </div>

      <div className="card p-5 mb-6" style={{ borderLeft: '4px solid var(--brand-orange)' }}>
        <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{editId ? 'Edit Category' : 'New Category'}</h2>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Meals, Drinks, Pastries"
            className="input flex-1"
            autoFocus
          />
          <button onClick={handleSave} disabled={saving || !name.trim()} className="btn btn-primary">
            {saving ? '…' : editId ? 'Update' : 'Add'}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setName('') }} className="btn btn-ghost">Cancel</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>All Categories</span>
          <span className="badge badge-orange">{categories.length}</span>
        </div>
        {categories.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No categories yet</div>
        ) : (
          <ul>
            {categories.map((c, i) => (
              <li key={c.id} className="flex items-center px-5 py-3.5 gap-4" style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: 'var(--brand-orange)', color: '#fff' }}>
                  {c.name[0].toUpperCase()}
                </div>
                <span className="flex-1 font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                <button onClick={() => { setEditId(c.id); setName(c.name) }} className="text-sm font-semibold" style={{ color: 'var(--brand-orange)' }}>Edit</button>
                <button onClick={() => handleDelete(c.id)} className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
