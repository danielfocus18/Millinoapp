'use client'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const navItems = [
  { href: '/pos',             label: 'POS Terminal',   icon: '🛒', desc: 'Sell' },
  { href: '/admin',           label: 'Dashboard',      icon: '📊', desc: 'Overview' },
  { href: '/admin/orders',    label: 'Orders',         icon: '🧾', desc: 'History' },
  { href: '/admin/products',  label: 'Products',       icon: '📦', desc: 'Inventory' },
  { href: '/admin/categories',label: 'Categories',     icon: '🏷️', desc: 'Groups' },
  { href: '/admin/expenses',  label: 'Expenses',       icon: '💸', desc: 'Costs' },
  { href: '/admin/reports',   label: 'Reports',        icon: '📈', desc: 'Analytics' },
]

export function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      style={{ background: 'var(--surface-sidebar)', width: '220px', minHeight: '100vh' }}
      className="flex flex-col flex-shrink-0"
    >
      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            style={{ background: 'var(--brand-orange)', borderRadius: 10 }}
            className="w-10 h-10 flex items-center justify-center text-white font-black text-lg"
          >M</div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">Millino Chops</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Eatery POS</div>
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
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span className="text-base w-5 flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--brand-orange)' }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-white/10">
        {userName && (
          <div className="px-3 py-2 mb-2">
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signed in as</div>
            <div className="text-white text-sm font-medium mt-0.5 truncate">{userName}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
          style={{ color: '#F87171', fontSize: '0.875rem' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.10)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <span className="text-base w-5">↩</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
