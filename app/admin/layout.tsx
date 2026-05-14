'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data } = await supabase.from('users').select('name, role').eq('id', session.user.id).single()
      if (!data || data.role !== 'manager') { router.push('/pos'); return }
      setUserName(data.name)
      setReady(true)
    })
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-base)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={userName} />
      <main className="flex-1 overflow-auto" style={{ background: 'var(--surface-base)' }}>
        {children}
      </main>
    </div>
  )
}
