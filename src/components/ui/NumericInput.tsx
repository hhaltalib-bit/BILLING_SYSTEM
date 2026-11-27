'use client'

import { useLayoutEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'

type NativeProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'>

interface Props extends NativeProps {
  /** Raw number string: Western digits, optional single '.', no separators. */
  value: string
  /** Receives the raw string (e.g. "1500000" or "5.25"). */
  onChange: (raw: string) => void
  /** Allow a fractional part (default true). Set false for whole-number amounts. */
  allowDecimal?: boolean
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

/** Any typed/pasted text → raw "1234.5" (Western digits, one '.', nothing else). */
export function toRawNumber(text: string, allowDecimal = true): string {
  const western = text
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/٫/g, '.')                                  // Arabic decimal separator
  let out = ''
  let seenDot = false
  for (const ch of western) {
    if (ch >= '0' && ch <= '9') out += ch
    else if (ch === '.' && allowDecimal && !seenDot) { out += '.'; seenDot = true }
    // everything else (grouping separators ",", "٬", "،", spaces, letters) is dropped
  }
  return out
}

/** Raw "1500000.5" → "1,500,000.5" (en) or "١٬٥٠٠٬٠٠٠٫٥" (ar). Keeps a trailing '.' while typing. */
export function formatRawNumber(raw: string, lang: 'ar' | 'en'): string {
  if (raw === '') return ''
  const dot = raw.indexOf('.')
  const intPart  = dot === -1 ? raw : raw.slice(0, dot)
  const fracPart = dot === -1 ? null : raw.slice(dot + 1)
  const locale = lang === 'en' ? 'en-US' : 'ar-IQ'

  const intDisplay = intPart === ''
    ? (fracPart !== null ? new Intl.NumberFormat(locale).format(0) : '')
    : new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(intPart))
  if (fracPart === null) return intDisplay

  const sep  = lang === 'en' ? '.' : '٫'
  const frac = lang === 'en' ? fracPart : fracPart.replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)])
  return intDisplay + sep + frac
}

/** Count of digits / decimal separators in s (what the caret position is anchored to). */
function significantCount(s: string): number {
  return (s.match(/[0-9٠-٩۰-۹.٫]/g) ?? []).length
}

/**
 * Text input for money / quantities that shows grouping separators while typing
 * (1500000 → 1,500,000 / ١٬٥٠٠٬٠٠٠) and reports the raw number string to the parent.
 */
export function NumericInput({ value, onChange, allowDecimal = true, style, ...rest }: Props) {
  const lang = useAppStore((s) => s.lang)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingCaret = useRef<number | null>(null)

  const display = formatRawNumber(value, lang)

  // After a reformat, put the caret back after the same number of significant chars.
  useLayoutEffect(() => {
    const el = inputRef.current
    const target = pendingCaret.current
    if (!el || target === null || document.activeElement !== el) return
    pendingCaret.current = null
    let count = 0, pos = 0
    while (pos < display.length && count < target) {
      if (/[0-9٠-٩۰-۹.٫]/.test(display[pos])) count++
      pos++
    }
    el.setSelectionRange(pos, pos)
  }, [display])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const typed = e.target.value
    const caret = e.target.selectionStart ?? typed.length
    pendingCaret.current = significantCount(typed.slice(0, caret))
    onChange(toRawNumber(typed, allowDecimal))
  }

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      dir="ltr"
      value={display}
      onChange={handleChange}
      style={{ textAlign: 'start', ...style }}
    />
  )
}
