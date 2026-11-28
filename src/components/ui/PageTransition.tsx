'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useT } from '@/lib/i18n'

/** Overlay shown between a NavLink click and the new route rendering. */
export function PageTransition() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const t = useT()

  // New page rendered — stop the loading state
  useEffect(() => {
    setLoading(false)
  }, [pathname])

  // NavLink dispatches this event when navigation starts
  useEffect(() => {
    function handleNavStart() {
      setLoading(true)
    }
    window.addEventListener('finova:nav-start', handleNavStart)
    return () => window.removeEventListener('finova:nav-start', handleNavStart)
  }, [])

  // Safety net: never leave the overlay stuck if a navigation is aborted
  useEffect(() => {
    if (!loading) return
    const id = setTimeout(() => setLoading(false), 10000)
    return () => clearTimeout(id)
  }, [loading])

  if (!loading) return null

  return (
    <>
      {/* Blur overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        backgroundColor: 'var(--bg-primary)',
        opacity: 0.7,
        backdropFilter: 'blur(4px)',
        animation: 'finovaFadeIn 0.15s ease',
      }} />

      {/* Loading indicator */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed', inset: 0, zIndex: 9001,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '16px', pointerEvents: 'none',
        }}
      >
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid var(--border-color)',
          borderTop: '3px solid var(--accent-blue)',
          borderRadius: '50%',
          animation: 'finovaSpin 0.7s linear infinite',
        }} />
        <p style={{
          color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500,
          animation: 'finovaFadeIn 0.2s ease',
        }}>
          {t('جاري تحميل الصفحة')}
        </p>
      </div>

      <style>{`
        @keyframes finovaSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes finovaFadeIn {
          from { opacity: 0; }
        }
      `}</style>
    </>
  )
}
