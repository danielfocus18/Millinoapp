'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Expense {
  id: string
  description: string
  amount: number
  created_at: string
  recorded_by?: string
}

export default function ExpensesPage() {
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState({ description: '', amount: '' })
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')

  async function load() {
    let query = supabase.from('expenses').select('*').order('created_at', { ascending: false })
    const now = new Date()
    if (filter === 'today') {
      const start = new Date(now); start.setHours(0,0,0,0)
      query = query.gte('created_at', start.toISOString())
    } else if (filter === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - 7)
      query = query.gte('created_at', start.toISOString())
    } else if (filter === 'month') {
      const start = new Date(now); start.setDate(1); start.setHours(0,0,0,0)
      query = query.gte('created_at', start.toISOString())
    }
    const { data } = await query
    setExpenses(data ?? [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
      if (!profile || profile.role !== 'manager') { router.push('/pos'); return }
      setUserId(session.user.id)
      load()
    })
  }, [router])

  useEffect(() => { load() }, [filter])

  async function handleAdd() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    await supabase.from('expenses').insert({
      description: form.description,
      amount: parseFloat(form.amount),
      recorded_by: userId,
    })
    setForm({ description: '', amount: '' })
    setSaving(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id)
    load()
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.push('/admin')} className="text-blue-200 hover:text-white">← Admin</button>
        <h1 className="font-bold text-lg">Expenses</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Add form */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Record Expense</h2>
          <div className="flex gap-3">
            <input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              placeholder="Amount"
              className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !form.description.trim() || !form.amount}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? '…' : 'Add'}
            </button>
          </div>
        </div>

        {/* Filter + total */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="text-sm font-semibold text-red-600">Total: GH₵ {total.toFixed(2)}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {expenses.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No expenses recorded</div>
          ) : (
            <ul>
              {expenses.map((e, i) => (
                <li key={e.id} className={`flex items-center px-5 py-3 ${i > 0 ? 'border-t' : ''}`}>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{e.description}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(e.created_at).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  <span className="font-bold text-red-600 mr-4">GH₵ {Number(e.amount).toFixed(2)}</span>
                  <button onClick={() => handleDelete(e.id)} className="text-red-400 hover:text-red-600 text-sm">Del</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
