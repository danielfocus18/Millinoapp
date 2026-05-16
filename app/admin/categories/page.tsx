'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Category { id: string; name: string }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true); setMsg('')
    const { error } = editId
      ? await supabase.from('categories').update({ name: name.trim() }).eq('id', editId)
      : await supabase.from('categories').insert({ name: name.trim() })
    if (error) { setMsg('Error: ' + error.message) }
    else { setMsg(editId ? '✓ Updated' : '✓ Category added'); setName(''); setEditId(null); load() }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleDelete(id: string, catName: string) {
    if (!confirm(`Delete "${catName}"? Products will be uncategorised.`)) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) setMsg('Error: ' + error.message)
    else { setMsg('✓ Deleted'); load() }
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Categories</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Organise menu items into groups</p>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-medium" style={{
          background: msg.startsWith('✓') ? '#F0FDF4' : '#FEF2F2',
          color: msg.startsWith('✓') ? '#15803D' : 'var(--brand-red)',
          border: `1px solid ${msg.startsWith('✓') ? '#BBF7D0' : '#FECACA'}`
        }}>{msg}</div>
      )}

      <div className="card p-5 mb-6" style={{ borderLeft: '4px solid var(--brand-orange)' }}>
        <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{editId ? 'Edit Category' : 'New Category'}</h2>
        <div className="flex gap-3">
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Meals, Drinks, Pastries"
            className="input flex-1" autoFocus />
          <button onClick={handleSave} disabled={saving || !name.trim()} className="btn btn-primary">
            {saving ? '…' : editId ? 'Update' : 'Add'}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setName('') }} className="btn btn-ghost">Cancel</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>All Categories</span>
          <span style={{ background: '#FFF7ED', color: 'var(--brand-orange-dk)', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 999 }}>
            {categories.length}
          </span>
        </div>
        {categories.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            No categories yet. Add one above or seed the database.
          </div>
        ) : (
          <ul>
            {categories.map((c, i) => (
              <li key={c.id} className="flex items-center px-5 py-4 gap-4" style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{ background: 'var(--brand-orange)', color: '#fff' }}>
                  {c.name[0].toUpperCase()}
                </div>
                <span className="flex-1 font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                <button onClick={() => { setEditId(c.id); setName(c.name) }}
                  className="text-sm font-semibold" style={{ color: 'var(--brand-orange)' }}>Edit</button>
                <button onClick={() => handleDelete(c.id, c.name)}
                  className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
