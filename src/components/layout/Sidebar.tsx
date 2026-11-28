'use client'

import { NavLink } from '@/components/ui/NavLink'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import {
  LayoutDashboard, ArrowLeftRight, BarChart3, PieChart,
  Target, RefreshCw, Gem, ScrollText, Settings, ShieldCheck,
} from 'lucide-react'

const NAV_ITEMS = [
  { key: 'dashboard',    icon: LayoutDashboard, href: ROUTES.dashboard    },
  { key: 'transactions', icon: ArrowLeftRight,  href: ROUTES.transactions },
  { key: 'analytics',   icon: BarChart3,        href: ROUTES.analytics    },
  { key: 'budget',      icon: PieChart,         href: ROUTES.budget       },
  { key: 'goals',       icon: Target,           href: ROUTES.goals        },
  { key: 'recurring',   icon: RefreshCw,        href: ROUTES.recurring    },
  { key: 'gold',        icon: Gem,              href: ROUTES.gold         },
  { key: 'activity',    icon: ScrollText,       href: ROUTES.activity     },
  { key: 'settings',    icon: Settings,         href: ROUTES.settings     },
] as const

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const { t } = useTranslation()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const mobileItems = [
    ...NAV_ITEMS.map((i) => ({ key: i.key as string, icon: i.icon, href: i.href as string, color: 'var(--accent-blue)' })),
    ...(isAdmin ? [{ key: 'admin', icon: ShieldCheck, href: ROUTES.admin as string, color: 'var(--gold)' }] : []),
  ]

  return (
    <>
    {/* Mobile: bottom navigation (shown ≤768px via CSS — no hydration flash) */}
    <nav className="mobile-nav" aria-label="Finova">
      {mobileItems.map(({ key, icon: Icon, href, color }) => {
        const active = isActive(href)
        return (
          <NavLink
            key={key}
            href={href}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '2px', padding: '8px 10px', borderRadius: '10px',
              color: active ? color : 'var(--text-secondary)',
              textDecoration: 'none', fontSize: '10px', minWidth: '56px',
              flex: '1 0 auto', whiteSpace: 'nowrap',
              backgroundColor: active ? 'rgba(59,130,246,0.1)' : 'transparent',
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span>{t(key as Parameters<typeof t>[0])}</span>
          </NavLink>
        )
      })}
    </nav>

    <aside className="sidebar" style={{
      width: 'var(--sidebar)',
      minHeight: '100vh',
      backgroundColor: 'var(--s1)',
      borderInlineEnd: '1px solid var(--s4)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      insetInlineStart: 0,
      zIndex: 40,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        height: 'var(--topbar)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid var(--s4)',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--accent)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 16,
          color: '#fff',
          fontFamily: 'IBM Plex Mono, monospace',
          flexShrink: 0,
        }}>F</div>
        <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>Finova</span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV_ITEMS.map(({ key, icon: Icon, href }) => {
          const active = isActive(href)
          return (
            <NavLink key={key} href={href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              marginBottom: 2,
              color: active ? 'var(--accent)' : 'var(--text2)',
              backgroundColor: active ? 'rgba(59,130,246,0.1)' : 'transparent',
              fontWeight: active ? 600 : 400,
              fontSize: 14,
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}>
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              <span>{t(key)}</span>
            </NavLink>
          )
        })}

        {/* Admin link */}
        {isAdmin && (
          <>
            <div style={{ height: 1, background: 'var(--s4)', margin: '8px 4px' }} />
            <NavLink href={ROUTES.admin} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              color: pathname.startsWith(ROUTES.admin) ? 'var(--gold)' : 'var(--text2)',
              backgroundColor: pathname.startsWith(ROUTES.admin) ? 'rgba(245,158,11,0.1)' : 'transparent',
              fontWeight: pathname.startsWith(ROUTES.admin) ? 600 : 400,
              fontSize: 14,
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}>
              <ShieldCheck size={18} />
              <span>{t('admin')}</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Version */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--s4)',
        fontSize: 11,
        color: 'var(--text2)',
        fontFamily: 'IBM Plex Mono, monospace',
      }}>
        Finova v1.0.0
      </div>
    </aside>
    </>
  )
}
