'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppStore } from '@/lib/types'

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme:         'dark',
      lang:          'ar',
      privacyMode:   false,
      compactMode:   false,
      salaryAmount:  0,

      setTheme:      (t) => set({ theme: t }),
      setLang:       (l) => {
        set({ lang: l })
        // AppProvider also syncs these on change; set them immediately so the
        // layout flips direction in the same frame as the text.
        if (typeof document !== 'undefined') {
          document.documentElement.lang = l === 'en' ? 'en' : 'ar'
          document.documentElement.dir  = l === 'en' ? 'ltr' : 'rtl'
        }
      },
      togglePrivacy: ()  => set((s) => ({ privacyMode: !s.privacyMode })),
      toggleCompact: ()  => set((s) => ({ compactMode: !s.compactMode })),
      setSalary:     (amount) => set({ salaryAmount: amount }),
    }),
    {
      name: 'finova-app-store',
      // Rehydrated in AppProvider after mount → no SSR hydration mismatch
      skipHydration: true,
      // Only persist these keys to localStorage
      partialize: (s) => ({
        theme:        s.theme,
        lang:         s.lang,
        compactMode:  s.compactMode,
        salaryAmount: s.salaryAmount,
        // privacyMode intentionally NOT persisted (resets on page reload)
      }),
    }
  )
)
