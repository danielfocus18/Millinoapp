'use client'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const navItems = [
  { href: '/pos',              label: 'POS Terminal',  icon: '🛒' },
  { href: '/admin',            label: 'Dashboard',     icon: '📊' },
  { href: '/admin/orders',     label: 'Orders',        icon: '🧾' },
  { href: '/admin/products',   label: 'Products',      icon: '📦' },
  { href: '/admin/categories', label: 'Categories',    icon: '🏷️' },
  { href: '/admin/expenses',   label: 'Expenses',      icon: '💸' },
  { href: '/admin/reports',    label: 'Reports',       icon: '📈' },
]

export function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{ background: 'var(--surface-sidebar)', width: 220, minHeight: '100vh' }} className="flex flex-col flex-shrink-0">
      {/* Brand with real logo */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#fff' }}>
            <Image src="/logo.png" alt="Millino Chops" width={44} height={44} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">Millino Chops</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Eatery POS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
              style={{
                background: active ? 'rgba(234,88,12,0.20)' : 'transparent',
                color: active ? '#FDA274' : '#A8A29E',
                fontWeight: active ? 600 : 400,
                fontSize: '0.875rem',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span className="text-base w-5 flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--brand-orange)' }} />}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {userName && (
          <div className="px-3 py-2 mb-1">
            <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signed in as</div>
            <div className="text-white text-sm font-semibold mt-0.5 truncate">{userName}</div>
          </div>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
          style={{ color: '#F87171', fontSize: '0.875rem' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.10)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <span className="w-5">↩</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
