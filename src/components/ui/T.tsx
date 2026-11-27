'use client'

import { useT } from '@/lib/i18n'

/** Translated text for use inside server components: <T>لوحة التحكم</T> */
export function T({ children }: { children: string }) {
  const t = useT()
  return <>{t(children)}</>
}
