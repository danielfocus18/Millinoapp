'use client'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setInfo('')

    // 1. Authenticate
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) { setError(authErr.message); setLoading(false); return }

    const uid = authData.user.id
    setInfo('Authenticated ✓ — checking role…')

    // 2. Look up profile in public.users
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', uid)
      .single()

    if (profileErr || !profile) {
      // Profile row is missing — show helpful message with the UUID
      setInfo('')
      setError(
        `Login succeeded but no profile found for your account.\n\n` +
        `Your Auth User ID is:\n${uid}\n\n` +
        `Run this in Supabase SQL Editor:\n` +
        `INSERT INTO public.users (id, name, role)\n` +
        `VALUES ('${uid}', '${email}', 'manager')\n` +
        `ON CONFLICT (id) DO UPDATE SET role = 'manager';`
      )
      setLoading(false)
      return
    }

    // 3. Route by role
    setInfo(`Welcome ${profile.name} (${profile.role}) — redirecting…`)
    if (profile.role === 'manager') {
      router.push('/admin')
    } else {
      router.push('/pos')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--surface-base)' }}>
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-96 p-10 flex-shrink-0" style={{ background: 'var(--surface-sidebar)' }}>
        <div>
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white">
            <Image src="/logo.png" alt="Millino Chops" width={64} height={64} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
          </div>
        </div>
        <div>
          <h2 className="text-white font-black text-4xl leading-tight mb-4">Millino<br />Chops</h2>
          <p style={{ color: '#A8A29E', lineHeight: 1.8, fontSize: '0.9rem' }}>
            Eatery Point of Sale.<br />Built for speed, designed for simplicity.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: '⚡', text: 'Fast order processing' },
              { icon: '🏷️', text: 'Normal, Discount & Free pricing' },
              { icon: '📈', text: 'Daily, weekly & monthly reports' },
              { icon: '💰', text: 'Profit & expense tracking' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3" style={{ color: '#A8A29E', fontSize: '0.875rem' }}>
                <span>{f.icon}</span><span>{f.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 p-4 rounded-xl" style={{ background: 'rgba(234,88,12,0.12)', border: '1px solid rgba(234,88,12,0.2)' }}>
            <div className="text-xs font-bold mb-2" style={{ color: 'var(--brand-orange)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role-based access</div>
            <div className="text-xs space-y-1.5" style={{ color: '#A8A29E' }}>
              <div>👨‍💼 <strong style={{ color: '#fff' }}>Manager</strong> → Dashboard + Full Admin + POS</div>
              <div>🧑‍💻 <strong style={{ color: '#fff' }}>Cashier</strong> → POS Terminal only</div>
            </div>
          </div>
        </div>
        <div style={{ color: '#44403C', fontSize: '0.75rem' }}>© {new Date().getFullYear()} Millino Chops</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shadow">
              <Image src="/logo.png" alt="Millino Chops" width={48} height={48} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
            </div>
            <span className="font-bold text-xl">Millino Chops</span>
          </div>

          <h1 className="font-bold text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
          <p className="mb-8" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sign in to continue to your workspace</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="you@example.com" required autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input" placeholder="••••••••" required />
            </div>

            {info && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                {info}
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: '#FEF2F2', color: 'var(--brand-red)', border: '1px solid #FECACA', whiteSpace: 'pre-wrap', fontFamily: error.includes('INSERT') ? 'monospace' : 'inherit', fontSize: error.includes('INSERT') ? '0.75rem' : '0.875rem' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div className="mt-8 p-4 rounded-xl" style={{ background: 'var(--brand-cream)', border: '1px solid #FDE68A' }}>
            <div className="font-semibold mb-2 text-sm" style={{ color: '#92400E' }}>Access levels</div>
            <div style={{ color: '#78350F', fontSize: '0.8rem', lineHeight: 1.8 }}>
              👨‍💼 <strong>Manager</strong> — Dashboard, Reports, Products, Orders, Expenses + POS<br />
              🧑‍💻 <strong>Cashier</strong> — POS Terminal only
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
