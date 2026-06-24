'use client'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Zap, Tag, TrendingUp, Wallet, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) { setError(authErr.message); setLoading(false); return }
    const res = await fetch(`/api/users?id=${authData.user.id}`)
    const { profile } = await res.json()
    if (!profile) {
      // Auto-create as manager and redirect
      await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: authData.user.id, email, role: 'manager' }) })
      router.push('/admin'); return
    }
    router.push(profile.role === 'manager' ? '/admin' : '/pos')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#FBF7F4' }}>

      {/* ── LEFT BRAND PANEL ── */}
      <div style={{
        width: 420, flexShrink: 0, background: '#18120E',
        display: 'flex', flexDirection: 'column',
        padding: '3rem 2.5rem',
        position: 'relative', overflow: 'hidden',
      }} className="hidden lg:flex flex-col">

        {/* Decorative orange glow blob */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(240,90,40,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(240,90,40,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo — large and prominent */}
        <div style={{ marginBottom: 'auto' }}>
          <div style={{
            width: 100, height: 100, borderRadius: 24,
            background: '#fff', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(240,90,40,0.3)',
            marginBottom: '2rem',
          }}>
            <Image src="/logo.png" alt="Millino Chops" width={100} height={100}
              style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 900, fontSize: '2.5rem', color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Millino
            </div>
            <div style={{ fontWeight: 900, fontSize: '2.5rem', color: '#F05A28', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Chops
            </div>
          </div>

          <div style={{ color: '#7C6050', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
            Eatery Point of Sale.<br />
            Built for speed, designed for simplicity.
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { Icon: Zap, text: 'Fast order processing' },
              { Icon: Tag, text: 'Normal, Discount & Free pricing' },
              { Icon: TrendingUp, text: 'Sales reports & analytics' },
              { Icon: Wallet, text: 'Profit & expense tracking' },
            ].map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <f.Icon size={18} color="#FDA274" style={{ flexShrink: 0 }} />
                <span style={{ color: '#A8917E', fontSize: '0.875rem' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ color: '#3D2B1F', fontSize: '0.75rem', marginTop: '3rem' }}>
          © {new Date().getFullYear()} Millino Chops
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2.5rem' }} className="lg:hidden">
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fff', overflow: 'hidden', boxShadow: '0 4px 16px rgba(240,90,40,0.2)' }}>
              <Image src="/logo.png" alt="Millino Chops" width={52} height={52} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#18120E', lineHeight: 1 }}>Millino Chops</div>
              <div style={{ fontSize: '0.75rem', color: '#A8917E', marginTop: 2 }}>Eatery POS</div>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontWeight: 900, fontSize: '1.875rem', color: '#18120E', letterSpacing: '-0.02em', marginBottom: 6 }}>
              Welcome back
            </h1>
            <p style={{ color: '#A8917E', fontSize: '0.9rem' }}>
              Sign in to your Millino Chops workspace
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="label">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="you@example.com"
                required autoFocus
                style={{ fontSize: '1rem', padding: '0.75rem 1rem' }}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input" placeholder="••••••••"
                required
                style={{ fontSize: '1rem', padding: '0.75rem 1rem' }}
              />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '0.75rem 1rem', color: '#DC2626', fontSize: '0.875rem', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary"
              style={{ padding: '0.875rem', fontSize: '1rem', fontWeight: 800, borderRadius: 12, marginTop: 4, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {loading ? 'Signing in…' : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </form>

          {/* Subtle divider line */}
          <div style={{ margin: '2rem 0', height: 1, background: '#EDE0D6' }} />

          {/* Minimal, non-sensitive footer note */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: '#C4A898' }}>
              Millino Chops POS · Staff access only
            </p>
            <p style={{ fontSize: '0.75rem', color: '#D6C4B8', marginTop: 4 }}>
              Contact your manager if you need access
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
