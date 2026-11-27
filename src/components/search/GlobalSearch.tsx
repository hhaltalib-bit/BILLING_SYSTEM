'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getSearchTransactions } from '@/app/(dashboard)/transactions/actions'
import { useFormatters } from '@/lib/useFormatters'
import { useT } from '@/lib/i18n'
import { toRawNumber } from '@/components/ui/NumericInput'
import type { Transaction } from '@/types/transaction'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const MAX_RESULTS = 8

// Module-level cache: loaded on first open, cleared whenever data changes.
let cache: Transaction[] | null = null
let inflight: Promise<Transaction[]> | null = null
function loadAll(): Promise<Transaction[]> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = getSearchTransactions()
      .then((rows) => { cache = rows; return rows })
      .finally(() => { inflight = null })
  }
  return inflight
}
if (typeof window !== 'undefined') {
  window.addEventListener('finova:data-changed', () => { cache = null })
}

export function GlobalSearch({ isOpen, onClose }: Props) {
  const t = useT()
  const fmt = useFormatters()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>(cache ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [active, setActive] = useState(0)

  // Reset + load when opened
  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setActive(0)
    setError('')
    const id = setTimeout(() => inputRef.current?.focus(), 30)
    if (!cache) setLoading(true)
    loadAll()
      .then(setTransactions)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
    return () => clearTimeout(id)
  }, [isOpen])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    // Digits typed in any script, with or without separators: "١٬٥٠٠" → "1500"
    const qDigits = /[0-9٠-٩۰-۹]/.test(q) ? toRawNumber(q) : ''
    return transactions.filter((tx) => {
      const texts = [tx.note, tx.note && t(tx.note), tx.category_name, tx.category_name && t(tx.category_name), fmt.date(tx.date)]
      if (texts.some((s) => s && s.toLowerCase().includes(q))) return true
      if (qDigits) {
        if (String(tx.amount).includes(qDigits)) return true
        if (tx.date.replace(/-/g, '').includes(qDigits.replace(/\./g, '')) || tx.date.includes(q)) return true
      }
      return false
    }).slice(0, MAX_RESULTS)
  }, [query, transactions, t, fmt])

  useEffect(() => { setActive(0) }, [query])

  function open(tx: Transaction) {
    onClose()
    router.push(`/transactions?highlight=${encodeURIComponent(tx.id)}&at=${Date.now()}`)
  }

  // Keyboard handling on window (capture phase) while open, so Escape and the
  // arrow keys work even when focus has left the input (e.g. after clicking
  // inside the panel). Ctrl/⌘+K toggling is owned by the Topbar.
  const keyState = useRef({ results, active, open, onClose })
  keyState.current = { results, active, open, onClose }
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      const { results, active, open, onClose } = keyState.current
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
      else if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); setActive((i) => (i + 1) % results.length) }
      else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setActive((i) => (i - 1 + results.length) % results.length) }
      else if (e.key === 'Enter' && results[active]) { e.preventDefault(); open(results[active]) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [isOpen])

  if (!isOpen) return null

  const typeColor = (type: string) =>
    type === 'income' ? 'var(--accent-green)' : type === 'expense' ? 'var(--accent-red)' : 'var(--accent-blue)'
  const typeLabel = (type: string) =>
    type === 'income' ? t('دخل') : type === 'expense' ? t('صرف') : t('تحويل')

  const q = query.trim()

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000 }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('بحث')}
        style={{
          position: 'fixed', top: '12%', left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: '580px', zIndex: 1001,
          backgroundColor: 'var(--bg-secondary)', borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }} aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ابحث عن حركة، فئة، مبلغ...')}
            aria-label={t('بحث')}
            aria-controls="global-search-results"
            aria-activedescendant={results[active] ? `gs-${results[active].id}` : undefined}
            autoComplete="off"
            style={{
              flex: 1, minWidth: 0, border: 'none', backgroundColor: 'transparent',
              color: 'var(--text-primary)', fontSize: '16px', outline: 'none',
            }}
          />
          <kbd style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Esc</kbd>
        </div>

        {error ? (
          <div role="alert" style={{ padding: '24px', textAlign: 'center', color: 'var(--accent-red)', fontSize: '14px' }}>{error}</div>
        ) : loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>{t('جارٍ التحميل...')}</div>
        ) : q.length === 0 ? (
          <div style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
            {t('اكتب للبحث في جميع الحركات')}
          </div>
        ) : (
          <div id="global-search-results" role="listbox" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {results.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('لا توجد نتائج')}</div>
            ) : results.map((tx, i) => (
              <div
                key={tx.id}
                id={`gs-${tx.id}`}
                role="option"
                aria-selected={i === active}
                onClick={() => open(tx)}
                onMouseEnter={() => setActive(i)}
                style={{
                  padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  backgroundColor: i === active ? 'var(--bg-primary)' : 'transparent',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: typeColor(tx.type), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t(tx.note || tx.category_name || typeLabel(tx.type))}
                    </span>
                    <span data-sensitive style={{ fontWeight: 700, color: typeColor(tx.type), fontSize: '14px', whiteSpace: 'nowrap' }}>
                      {fmt.money(tx.amount, tx.currency)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {tx.category_name && <span>{t(tx.category_name)} · </span>}
                    {fmt.date(tx.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
