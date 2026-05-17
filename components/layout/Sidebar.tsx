'use client'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/admin',             icon: '📊', label: 'Dashboard'  },
  { href: '/pos',               icon: '🛒', label: 'POS Terminal' },
  { href: '/admin/orders',      icon: '🧾', label: 'Orders'      },
  { href: '/admin/products',    icon: '📦', label: 'Products'    },
  { href: '/admin/categories',  icon: '🏷️', label: 'Categories' },
  { href: '/admin/expenses',    icon: '💸', label: 'Expenses'    },
  { href: '/admin/reports',     icon: '📈', label: 'Reports'     },
]

export function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <aside style={{ width: 220, background: 'var(--ink)', minHeight: '100vh', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <Image src="/logo.png" alt="Millino Chops" width={42} height={42} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
          </div>
          <div>
            <div style={{ fontWeight: 900, color: '#fff', fontSize: '0.85rem', letterSpacing: '0.03em' }}>MILLINO</div>
            <div style={{ fontWeight: 900, color: 'var(--orange)', fontSize: '0.85rem', letterSpacing: '0.03em', marginTop: -2 }}>CHOPS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.625rem', overflowY: 'auto' }}>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <button key={item.href} onClick={() => router.push(item.href)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '0.625rem 0.75rem', borderRadius: 10, marginBottom: 2,
              background: active ? 'rgba(240,90,40,0.18)' : 'transparent',
              color: active ? '#FDA274' : '#7C6050',
              fontWeight: active ? 700 : 500, fontSize: '0.875rem',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <span style={{ fontSize: '1rem', width: 20, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {active && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--orange)', flexShrink: 0 }} />}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '0.75rem 0.625rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {userName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.8rem', flexShrink: 0 }}>
              {userName[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
              <div style={{ color: '#7C6050', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manager</div>
            </div>
          </div>
        )}
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '0.625rem 0.75rem', borderRadius: 10,
          background: 'transparent', color: '#F87171',
          fontWeight: 600, fontSize: '0.875rem', border: 'none', cursor: 'pointer',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.10)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <span style={{ fontSize: '1rem' }}>↩</span> Sign Out
        </button>
      </div>
    </aside>
  )
}
