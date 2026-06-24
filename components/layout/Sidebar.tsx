'use client'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, ShoppingCart, Receipt, Package, Tags, Wallet, TrendingUp,
  LogOut, X,
} from 'lucide-react'

const NAV = [
  { href: '/admin',             icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/pos',               icon: ShoppingCart,     label: 'POS Terminal' },
  { href: '/admin/orders',      icon: Receipt,          label: 'Orders'       },
  { href: '/admin/products',    icon: Package,          label: 'Products'     },
  { href: '/admin/categories',  icon: Tags,              label: 'Categories'   },
  { href: '/admin/expenses',    icon: Wallet,            label: 'Expenses'     },
  { href: '/admin/reports',     icon: TrendingUp,        label: 'Reports'      },
]

interface SidebarProps {
  userName?: string
  onClose?: () => void
}

export function Sidebar({ userName, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  function navigate(href: string) {
    router.push(href)
    onClose?.()
  }

  return (
    <aside style={{
      width: 220, background: 'var(--ink)', height: '100%',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <Image src="/logo.png" alt="Millino Chops" width={40} height={40} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
          </div>
          <div>
            <div style={{ fontWeight: 900, color: '#fff', fontSize: '0.82rem', letterSpacing: '0.03em', lineHeight: 1 }}>MILLINO</div>
            <div style={{ fontWeight: 900, color: 'var(--orange)', fontSize: '0.82rem', letterSpacing: '0.03em', marginTop: 1 }}>CHOPS</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#A8917E', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto' }}>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <button key={item.href} onClick={() => navigate(item.href)} style={{
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
              <Icon size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {active && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--orange)', flexShrink: 0 }} />}
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {userName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.8rem', flexShrink: 0 }}>
              {userName[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
              <div style={{ color: '#7C6050', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manager</div>
            </div>
          </div>
        )}
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '0.625rem 0.75rem', borderRadius: 10,
          background: 'transparent', color: '#F87171',
          fontWeight: 600, fontSize: '0.875rem', border: 'none', cursor: 'pointer',
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.10)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <LogOut size={18} strokeWidth={2} /> Sign Out
        </button>
      </div>
    </aside>
  )
}
