'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Expense { id: string; description: string; amount: number; created_at: string }

type Filter = 'today' | 'week' | 'month' | 'all'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState({ description: '', amount: '' })
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<Filter>('today')
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load(f: Filter = filter) {
    let query = supabase.from('expenses').select('*').order('created_at', { ascending: false })
    const now = new Date()
    if (f === 'today') { const s = new Date(now); s.setHours(0,0,0,0); query = query.gte('created_at', s.toISOString()) }
    else if (f === 'week') { const s = new Date(now); s.setDate(now.getDate()-7); query = query.gte('created_at', s.toISOString()) }
    else if (f === 'month') { const s = new Date(now); s.setDate(1); s.setHours(0,0,0,0); query = query.gte('created_at', s.toISOString()) }
    const { data } = await query
    setExpenses(data ?? [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setUserId(session.user.id) })
    load()
  }, [])

  useEffect(() => { load(filter) }, [filter])

  async function handleAdd() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    await supabase.from('expenses').insert({ description: form.description.trim(), amount: parseFloat(form.amount), recorded_by: userId })
    setForm({ description: '', amount: '' }); setSaving(false); load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense record?')) return
    setDeleting(id)
    await supabase.from('expenses').delete().eq('id', id)
    setDeleting(null); load()
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const filters: { value: Filter; label: string }[] = [
    { value: 'today', label: 'Today' }, { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' }, { value: 'all', label: 'All' },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Expenses</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Track business costs and outgoings</p>
      </div>

      {/* Add form */}
      <div className="card p-5 mb-6" style={{ borderLeft: '4px solid var(--brand-red)' }}>
        <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Record Expense</h2>
        <div className="flex gap-3 flex-wrap">
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Description (e.g. Gas, Supplies)" className="input flex-1 min-w-48" autoFocus />
          <div className="flex gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>GH₵</span>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="0.00" className="input" style={{ width: 130, paddingLeft: '2.5rem' }} />
            </div>
            <button onClick={handleAdd} disabled={saving || !form.description.trim() || !form.amount} className="btn btn-danger">
              {saving ? '…' : 'Record'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter + summary */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1.5">
          {filters.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} className="btn btn-sm"
              style={{ background: filter === f.value ? 'var(--brand-red)' : 'transparent', color: filter === f.value ? '#fff' : 'var(--text-secondary)', border: `1.5px solid ${filter === f.value ? 'var(--brand-red)' : 'var(--border)'}` }}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="card px-4 py-2 flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total:</span>
          <span className="font-black text-lg" style={{ color: 'var(--brand-red)' }}>GH₵{total.toFixed(2)}</span>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {expenses.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No expenses recorded for this period</div>
        ) : (
          <ul>
            {expenses.map((e, i) => (
              <li key={e.id} className="flex items-center px-5 py-4 gap-4" style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: '#FEF2F2' }}>💸</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{e.description}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {new Date(e.created_at).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                <span className="font-black text-base" style={{ color: 'var(--brand-red)' }}>GH₵{Number(e.amount).toFixed(2)}</span>
                <button onClick={() => handleDelete(e.id)} disabled={deleting === e.id}
                  className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.color = 'var(--danger)'}
                  onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
                  {deleting === e.id ? '…' : 'Del'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
