'use client'

import { useState, useEffect, useRef } from 'react'
import { TransactionRow } from './TransactionRow'
import { DeleteTransactionModal } from './DeleteTransactionModal'
import { EditTransactionModal } from './EditTransactionModal'
import type { Transaction, Category } from '@/types/transaction'
import { useT } from '@/lib/i18n'
import { useFormatters } from '@/lib/useFormatters'
import { TransactionFilters, EMPTY_FILTERS, applyFilters, type FilterState } from './TransactionFilters'

interface Props {
  transactions: Transaction[]
  categories: Category[]
  /** transaction to scroll to and highlight (from the global search) */
  highlightId?: string | null
  /** changes on every new highlight request, even for the same id */
  highlightKey?: string
}

export function TransactionsList({ transactions, categories, highlightId = null, highlightKey = '' }: Props) {
  const t = useT()
  const fmt = useFormatters()
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [editTarget,   setEditTarget]   = useState<Transaction | null>(null)

  const filtered = applyFilters(transactions, filters)

  // ── Highlight a transaction picked in the global search ──
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const [flashId, setFlashId] = useState<string | null>(null)
  const handledKey = useRef('')

  useEffect(() => {
    if (!highlightId || handledKey.current === highlightKey) return
    if (!transactions.some((tx) => tx.id === highlightId)) return   // wait for data
    handledKey.current = highlightKey
    // make sure the row is not hidden by the current filters
    if (!applyFilters(transactions, filters).some((tx) => tx.id === highlightId)) setFilters(EMPTY_FILTERS)
    setFlashId(highlightId)
  }, [highlightId, highlightKey, transactions, filters])

  useEffect(() => {
    if (!flashId) return
    rowRefs.current.get(flashId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = setTimeout(() => setFlashId(null), 4000)
    return () => clearTimeout(timer)
  }, [flashId])

  // The transactions page (and the search cache) reload on this event.
  function changed() {
    window.dispatchEvent(new Event('finova:data-changed'))
  }

  return (
    <div className="card">
      <TransactionFilters
        filters={filters}
        categories={categories}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      {/* Result count */}
      <p className="text-xs" style={{ color: 'var(--text-secondary)', marginBottom: '8px' }} aria-live="polite">
        {filtered.length === transactions.length
          ? `${fmt.num(transactions.length)} ${t('حركة')}`
          : `${fmt.num(filtered.length)} ${t('من')} ${fmt.num(transactions.length)} ${t('حركة')}`}
      </p>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div className="text-center py-10" style={{ color: 'var(--text-secondary)' }}>
          {transactions.length > 0 ? t('لا توجد نتائج') : t('لا توجد معاملات')}
        </div>
      ) : (
        filtered.map((tx) => (
          <TransactionRow
            key={tx.id}
            ref={(el) => { if (el) rowRefs.current.set(tx.id, el); else rowRefs.current.delete(tx.id) }}
            tx={tx}
            highlighted={tx.id === flashId}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        ))
      )}

      {deleteTarget && (
        <DeleteTransactionModal
          transaction={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={changed}
        />
      )}
      {editTarget && (
        <EditTransactionModal
          transaction={editTarget}
          categories={categories}
          onClose={() => setEditTarget(null)}
          onSaved={changed}
        />
      )}
    </div>
  )
}
