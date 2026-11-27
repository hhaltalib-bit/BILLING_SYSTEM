import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Language-aware number formatters ─────────────────────────
// Pure functions (safe on server and client). In client components use the
// `useFormatters()` hook from '@/lib/useFormatters', which supplies the
// current UI language.  ar → Arabic-Indic digits, en → Western digits.
export type NumLang = 'ar' | 'en'
const locale = (lang: NumLang) => (lang === 'en' ? 'en-US' : 'ar-IQ')

// Format IQD — ar: ١٬٥٠٠٬٠٠٠ د.ع   en: 1,500,000 IQD
export function formatIQD(amount: number, lang: NumLang = 'ar'): string {
  const num = new Intl.NumberFormat(locale(lang), {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
  return lang === 'en' ? `${num} IQD` : `${num} د.ع`
}

// Format USD — ar: ‏١٬٢٥٠٫٠٠ US$   en: $1,250.00
export function formatUSD(amount: number, lang: NumLang = 'ar'): string {
  return new Intl.NumberFormat(locale(lang), {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format mithqal — ar: ٢٫٥ مثقال   en: 2.5 mithqal
export function formatMithqal(qty: number, lang: NumLang = 'ar'): string {
  const num = new Intl.NumberFormat(locale(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(qty)
  return lang === 'en' ? `${num} mithqal` : `${num} مثقال`
}

// Plain number with grouping separators
export function formatNumber(n: number, lang: NumLang = 'ar'): string {
  return new Intl.NumberFormat(locale(lang)).format(n)
}

/**
 * Calculate current gold price per mithqal in IQD
 *
 * Formula:
 *   gram_price_usd  = xau_usd / 31.1035       (troy oz → gram)
 *   mithqal_usd     = gram_price_usd × 4.68   (1 mithqal = 4.68g)
 *   mithqal_iqd     = mithqal_usd × usd_to_iqd
 *   with_premium    = mithqal_iqd × (1 + local_premium / 100)
 */
export function calculateGoldPriceIQD(
  xauUsd: number,
  usdToIqd: number,
  localPremiumPercent: number
): number {
  const gramUsd     = xauUsd / 31.1035
  const mithqalUsd  = gramUsd * 4.68
  const mithqalIqd  = mithqalUsd * usdToIqd
  const withPremium = mithqalIqd * (1 + localPremiumPercent / 100)
  return Math.round(withPremium)
}

// Format percentage — value is already ×100 (34.5 → ar: ٣٤٫٥٪ / en: 34.5%)
export function formatPercent(value: number, lang: NumLang = 'ar', digits = 1): string {
  return new Intl.NumberFormat(locale(lang), {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value / 100)
}

// Format date — ar: ٢٧ نوفمبر ٢٠٢٦   en: Nov 27, 2026   (withTime adds hh:mm)
// A plain DATE ("YYYY-MM-DD") is read as a local calendar date, not UTC midnight,
// so it never shifts to the previous day in timezones west of UTC.
export function formatDate(dateStr: string, lang: NumLang = 'ar', withTime = false): string {
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  const date = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat(locale(lang), {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } as const : {}),
  }).format(date)
}

// Format a month — "2026-12-01" → ar: كانون الأول ٢٠٢٦   en: December 2026
export function formatMonth(monthISO: string, lang: NumLang = 'ar'): string {
  const [y, m] = monthISO.split('-').map(Number)
  if (!y || !m) return monthISO
  return new Intl.DateTimeFormat(locale(lang), { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
}

// Clamp a value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
