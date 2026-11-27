'use client'
import { useAppStore } from '@/store/useAppStore'
import { translations, type LangKey } from '@/lib/i18n'

export function useTranslation() {
  const lang = useAppStore((s) => s.lang)
  const t = (key: LangKey): string => translations[lang][key]
  return { t, lang }
}
