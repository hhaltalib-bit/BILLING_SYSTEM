'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { theme, lang, privacyMode, compactMode } = useAppStore()

  // Load persisted preferences (theme, lang, …) after mount. The store uses
  // skipHydration so server HTML and the first client render match.
  useEffect(() => {
    useAppStore.persist.rehydrate()
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('data-theme', theme)
    html.setAttribute('lang', lang)
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
    html.setAttribute('data-privacy', String(privacyMode))
    html.setAttribute('data-compact', String(compactMode))
  }, [theme, lang, privacyMode, compactMode])

  return <>{children}</>
}
