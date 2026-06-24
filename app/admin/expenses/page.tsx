'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Wallet, CheckCircle2, XCircle } from 'lucide-react'

interface Expense { id: string; description: string; amount: number; created_at: string }
type Filter = 'today' | 'week' | 'month' | 'all'
interface Msg { type: 'success' | 'error'; text: string }

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState({ description: '', amount: '' })
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<Filter>('today')
  const [msg, setMsg] = useState<Msg | null>(null)

  const load = useCallback(async (f: Filter = filter) => {
    const r = await fetch(`/api/expenses?filter=${f}`)
    const d = await r.json()
    setExpenses(d.expenses ?? [])
  }, [filter])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id)
    })
    load()
  }, [])

  useEffect(() => { load(filter) }, [filter])

  async function handleAdd() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true); setMsg(null)
    const res = await fetch('/api/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: form.description, amount: form.amount, recorded_by: userId }),
    })
    const d = await res.json()
    if (d.error) setMsg({ type: 'error', text: d.error })
    else { setMsg({ type: 'success', text: 'Recorded' }); setForm({ description: '', amount: '' }); load() }
    setSaving(false); setTimeout(() => setMsg(null), 3000)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    load()
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const FILTERS: { v: Filter; l: string }[] = [
    { v: 'today', l: 'Today' }, { v: 'week', l: 'This Week' },
    { v: 'month', l: 'This Month' }, { v: 'all', l: 'All Time' },
  ]

  return (
    <div style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontWeight: 900, fontSize: '1.75rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Expenses</h1>
      <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 4, marginBottom: '1.5rem' }}>Track all business costs</p>

      {/* Add form */}
      <div style={{ background: '#fff', border: '2px solid var(--red)', borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 10 }}>
          <Wallet size={15} /> Record Expense
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. Cooking gas, Supplies, Staff meal"
            className="input" style={{ flex: 1, minWidth: 200 }} autoFocus />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)' }}>GH₵</span>
              <input type="number" min="0" step="0.01" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="0.00" className="input" style={{ width: 130, paddingLeft: '2.6rem' }} />
            </div>
            <button onClick={handleAdd} disabled={saving || !form.description.trim() || !form.amount} className="btn btn-danger">
              {saving ? '…' : 'Record'}
            </button>
          </div>
        </div>
        {msg && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 700, color: msg.type === 'success' ? 'var(--green)' : 'var(--red)' }}>
            {msg.type === 'success' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {msg.text}
          </div>
        )}
      </div>

      {/* Filter + total */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)} className="btn btn-sm" style={{
              background: filter === f.v ? 'var(--red)' : 'transparent',
              color: filter === f.v ? '#fff' : 'var(--text-2)',
              border: `1.5px solid ${filter === f.v ? 'var(--red)' : 'var(--border-2)'}`,
            }}>{f.l}</button>
          ))}
        </div>
        <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-2)' }}>Total:</span>
          <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--red)' }}>GH₵{total.toFixed(2)}</span>
        </div>
      </div>

      {/* List */}
      <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Wallet size={32} strokeWidth={1.5} />
            No expenses for this period
          </div>
        ) : expenses.map((e, i) => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Wallet size={18} color="var(--red)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{e.description}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>
                {new Date(e.created_at).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
            <span style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--red)' }}>GH₵{Number(e.amount).toFixed(2)}</span>
            <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontWeight: 700, fontSize: '0.85rem' }}
              onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.color = 'var(--red)'}
              onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.color = 'var(--text-3)'}>Del</button>
          </div>
        ))}
      </div>
    </div>
  )
}
