'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { getProfile } from '@/lib/getProfile'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const profile = await getProfile(session.user.id)
      if (!profile || profile.role !== 'manager') { router.push('/pos'); return }
      setUserName(profile.name)
      setReady(true)
    })
  }, [router])

  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
      <div style={{ color: 'var(--text-3)' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>

      {/* ── Desktop sidebar (always visible ≥768px) ── */}
      <div style={{ display: 'none', width: 220, flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}
        className="md:block">
        <Sidebar userName={userName} />
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40, backdropFilter: 'blur(2px)' }}
          />
          {/* Drawer */}
          <div style={{ position: 'fixed', top: 0, left: 0, height: '100vh', width: 220, zIndex: 50 }} className="sidebar-open">
            <Sidebar userName={userName} onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--surface)' }}>

        {/* Mobile top bar */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.875rem 1.25rem', background: 'var(--ink)', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, zIndex: 30 }}
          className="md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 8, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ☰
          </button>
          <img src="/logo.png" alt="Millino Chops" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <div style={{ fontWeight: 900, color: '#fff', fontSize: '0.9rem', letterSpacing: '0.04em' }}>MILLINO CHOPS</div>
          <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.75rem', color: '#7C6050' }}>Admin</div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
