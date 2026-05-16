'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'

interface AuthUser {
  id: string
  email: string
  created_at: string
}
interface ProfileUser {
  id: string
  name: string
  role: string
}
interface SetupState {
  authUsers: AuthUser[]
  profileUsers: ProfileUser[]
  loaded: boolean
  error: string
}

export default function SetupPage() {
  const [state, setState] = useState<SetupState>({ authUsers: [], profileUsers: [], loaded: false, error: '' })
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  async function loadData() {
    const res = await fetch('/api/setup')
    const data = await res.json()
    if (data.error) {
      setState(s => ({ ...s, error: data.error, loaded: true }))
    } else {
      setState({ authUsers: data.authUsers ?? [], profileUsers: data.profileUsers ?? [], loaded: true, error: '' })
    }
  }

  useEffect(() => { loadData() }, [])

  async function setRole(userId: string, email: string, role: 'manager' | 'cashier') {
    setSaving(userId); setMsg('')
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, role }),
    })
    const data = await res.json()
    if (data.error) {
      setMsg('✗ ' + data.error)
    } else {
      setMsg(`✓ ${email} set as ${role}`)
      loadData()
    }
    setSaving(null)
    setTimeout(() => setMsg(''), 4000)
  }

  const { authUsers, profileUsers, loaded, error } = state

  function getProfile(userId: string) {
    return profileUsers.find(p => p.id === userId)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-sidebar)' }}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white flex-shrink-0">
            <Image src="/logo.png" alt="Millino Chops" width={56} height={56} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
          </div>
          <div>
            <h1 className="text-white font-black text-2xl">Millino Chops Setup</h1>
            <p style={{ color: '#A8A29E', fontSize: '0.875rem' }}>Assign roles to your team members</p>
          </div>
        </div>

        {/* Info box */}
        <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(234,88,12,0.15)', border: '1px solid rgba(234,88,12,0.3)' }}>
          <div className="font-bold text-sm mb-2" style={{ color: '#FDA274' }}>How this works</div>
          <div className="text-sm space-y-1" style={{ color: '#A8A29E', lineHeight: 1.7 }}>
            <div>1. Your Supabase Auth users appear below</div>
            <div>2. Click <strong style={{ color: '#fff' }}>Set as Manager</strong> or <strong style={{ color: '#fff' }}>Set as Cashier</strong> to assign roles</div>
            <div>3. Managers sign in → <strong style={{ color: '#FDA274' }}>/admin</strong> dashboard</div>
            <div>4. Cashiers sign in → <strong style={{ color: '#FDA274' }}>/pos</strong> terminal</div>
          </div>
        </div>

        {msg && (
          <div className="mb-5 px-4 py-3 rounded-lg text-sm font-medium" style={{
            background: msg.startsWith('✓') ? '#F0FDF4' : '#FEF2F2',
            color: msg.startsWith('✓') ? '#15803D' : '#DC2626',
            border: `1px solid ${msg.startsWith('✓') ? '#BBF7D0' : '#FECACA'}`
          }}>{msg}</div>
        )}

        {/* Users list */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#292524' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-white font-semibold">Auth Users</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(234,88,12,0.2)', color: '#FDA274' }}>
              {authUsers.length} found
            </span>
          </div>

          {!loaded ? (
            <div className="text-center py-10" style={{ color: '#A8A29E' }}>Loading users…</div>
          ) : error ? (
            <div className="px-5 py-6" style={{ color: '#F87171', fontSize: '0.875rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              Error: {error}
            </div>
          ) : authUsers.length === 0 ? (
            <div className="text-center py-10" style={{ color: '#A8A29E' }}>No auth users found</div>
          ) : (
            <ul>
              {authUsers.map((u, i) => {
                const profile = getProfile(u.id)
                return (
                  <li key={u.id} className="px-5 py-4" style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">{u.email}</div>
                        <div style={{ color: '#78716C', fontSize: '0.7rem', fontFamily: 'monospace', marginTop: 2 }}>
                          {u.id}
                        </div>
                        <div className="mt-2">
                          {profile ? (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{
                              background: profile.role === 'manager' ? 'rgba(234,88,12,0.20)' : 'rgba(255,255,255,0.08)',
                              color: profile.role === 'manager' ? '#FDA274' : '#A8A29E',
                            }}>
                              {profile.role === 'manager' ? '👨‍💼 Manager' : '🧑‍💻 Cashier'} — {profile.name}
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                              ⚠ No profile — must assign a role
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setRole(u.id, u.email, 'manager')}
                          disabled={saving === u.id}
                          className="btn btn-sm"
                          style={{ background: profile?.role === 'manager' ? 'var(--brand-orange)' : 'transparent', color: profile?.role === 'manager' ? '#fff' : '#FDA274', border: '1.5px solid #EA580C' }}
                        >
                          {saving === u.id ? '…' : '👨‍💼 Manager'}
                        </button>
                        <button
                          onClick={() => setRole(u.id, u.email, 'cashier')}
                          disabled={saving === u.id}
                          className="btn btn-sm"
                          style={{ background: profile?.role === 'cashier' ? 'rgba(255,255,255,0.15)' : 'transparent', color: '#A8A29E', border: '1.5px solid rgba(255,255,255,0.15)' }}
                        >
                          {saving === u.id ? '…' : '🧑‍💻 Cashier'}
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="mt-6 text-center">
          <a href="/login" className="btn btn-sm" style={{ background: 'var(--brand-orange)', color: '#fff' }}>
            → Go to Login
          </a>
        </div>

        <div className="mt-4 text-center text-xs" style={{ color: '#57534E' }}>
          millinoapp.vercel.app/setup — internal setup only
        </div>
      </div>
    </div>
  )
}
