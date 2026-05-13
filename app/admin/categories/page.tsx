'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Category { id: number; name: string }

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data ?? [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
      if (!profile || profile.role !== 'manager') { router.push('/pos'); return }
      load()
    })
  }, [router])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    if (editId) {
      await supabase.from('categories').update({ name }).eq('id', editId)
    } else {
      await supabase.from('categories').insert({ name })
    }
    setName('')
    setEditId(null)
    setSaving(false)
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this category? Products in it will be uncategorised.')) return
    await supabase.from('categories').delete().eq('id', id)
    load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.push('/admin')} className="text-blue-200 hover:text-white">← Admin</button>
        <h1 className="font-bold text-lg">Categories</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">{editId ? 'Edit Category' : 'New Category'}</h2>
          <div className="flex gap-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Category name"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? '…' : editId ? 'Update' : 'Add'}
            </button>
            {editId && (
              <button
                onClick={() => { setEditId(null); setName('') }}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {categories.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No categories yet</div>
          ) : (
            <ul>
              {categories.map((c, i) => (
                <li key={c.id} className={`flex items-center px-5 py-3 ${i > 0 ? 'border-t' : ''}`}>
                  <span className="flex-1 font-medium text-gray-900">{c.name}</span>
                  <button
                    onClick={() => { setEditId(c.id); setName(c.name) }}
                    className="text-blue-600 hover:text-blue-800 text-sm mr-4"
                  >Edit</button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
