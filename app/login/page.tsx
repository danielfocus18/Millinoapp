'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/pos')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--surface-base)' }}>
      {/* Left panel – brand */}
      <div
        className="hidden lg:flex flex-col justify-between w-96 p-10 flex-shrink-0"
        style={{ background: 'var(--surface-sidebar)' }}
      >
        <div>
          <div
            className="w-14 h-14 flex items-center justify-center text-white font-black text-2xl"
            style={{ background: 'var(--brand-orange)', borderRadius: 14 }}
          >M</div>
        </div>
        <div>
          <h2 className="text-white font-bold text-3xl leading-tight mb-3">
            Millino<br />Chops
          </h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Eatery Point of Sale.<br />
            Built for speed, designed for simplicity.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: '⚡', text: 'Fast order processing' },
              { icon: '📊', text: 'Real-time sales reports' },
              { icon: '💰', text: 'Discount & expense tracking' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3" style={{ color: '#A8A29E', fontSize: '0.875rem' }}>
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ color: '#57534E', fontSize: '0.75rem' }}>© {new Date().getFullYear()} Millino Chops</div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div
              className="w-10 h-10 flex items-center justify-center text-white font-black"
              style={{ background: 'var(--brand-orange)', borderRadius: 10 }}
            >M</div>
            <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Millino Chops</span>
          </div>

          <h1 className="font-bold text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
          <p className="mb-8" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sign in to your POS account</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm"
                style={{ background: '#FEF2F2', color: 'var(--brand-red)', border: '1px solid #FECACA' }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
