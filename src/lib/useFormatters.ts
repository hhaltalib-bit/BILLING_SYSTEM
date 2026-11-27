'use client'

import { useAppStore } from '@/store/useAppStore'
import { formatIQD, formatUSD, formatMithqal, formatNumber, formatDate, formatPercent, formatMonth } from './utils'

/** Number/date formatters bound to the current UI language.
 *  const fmt = useFormatters();  fmt.iqd(1500000) → '١٬٥٠٠٬٠٠٠ د.ع' | '1,500,000 IQD' */
export function useFormatters() {
  const lang = useAppStore((s) => s.lang)
  return {
    iqd:     (n: number) => formatIQD(n, lang),
    usd:     (n: number) => formatUSD(n, lang),
    /** amount in its own currency */
    money:   (n: number, currency: 'IQD' | 'USD') => (currency === 'USD' ? formatUSD(n, lang) : formatIQD(n, lang)),
    mithqal: (n: number) => formatMithqal(n, lang),
    num:     (n: number) => formatNumber(n, lang),
    date:    (s: string, withTime = false) => formatDate(s, lang, withTime),
    /** "2026-12-01" → "December 2026" */
    month:   (s: string) => formatMonth(s, lang),
    /** n is already a percentage (34.5 → 34.5%) */
    pct:     (n: number, digits = 1) => formatPercent(n, lang, digits),
    lang,
  }
}
