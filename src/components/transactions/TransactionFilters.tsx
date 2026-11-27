'use client'

import { useT } from '@/lib/i18n'
import { categoryEmoji } from '@/lib/categoryIcons'
import type { Category, Transaction } from '@/types/transaction'

export interface FilterState {
  dateFrom: string               // YYYY-MM-DD or ''
  dateTo: string                 // YYYY-MM-DD or ''
  type: 'all' | 'income' | 'expense' | 'transfer'
  categoryId: string             // '' = all
}

export const EMPTY_FILTERS: FilterState = { dateFrom: '', dateTo: '', type: 'all', categoryId: '' }

export function hasActiveFilters(f: FilterState): boolean {
  return !!(f.dateFrom || f.dateTo || f.type !== 'all' || f.categoryId)
}

/** Dates are compared as YYYY-MM-DD strings (the transaction's own date, inclusive). */
export function applyFilters(transactions: Transaction[], f: FilterState): Transaction[] {
  return transactions.filter((tx) => {
    if (f.type !== 'all' && tx.type !== f.type) return false
    if (f.categoryId && tx.category_id !== f.categoryId) return false
    if (f.dateFrom && tx.date < f.dateFrom) return false
    if (f.dateTo && tx.date > f.dateTo) return false
    return true
  })
}

interface Props {
  filters: FilterState
  categories: Category[]
  onChange: (filters: FilterState) => void
  onClear: () => void
}

export function TransactionFilters({ filters, categories, onChange, onClear }: Props) {
  const t = useT()

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: '8px',
    border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: '13px',
  }

  return (
    <div
      role="group"
      aria-label={t('تصفية الحركات')}
      style={{
        display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
        padding: '14px', backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px', marginBottom: '12px',
      }}
    >
      <input
        type="date"
        value={filters.dateFrom}
        max={filters.dateTo || undefined}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
        title={t('من تاريخ')}
        aria-label={t('من تاريخ')}
        style={inputStyle}
      />
      <span aria-hidden="true" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>→</span>
      <input
        type="date"
        value={filters.dateTo}
        min={filters.dateFrom || undefined}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
        title={t('إلى تاريخ')}
        aria-label={t('إلى تاريخ')}
        style={inputStyle}
      />

      <select
        value={filters.type}
        onChange={(e) => onChange({ ...filters, type: e.target.value as FilterState['type'] })}
        aria-label={t('النوع')}
        style={inputStyle}
      >
        <option value="all">{t('كل الأنواع')}</option>
        <option value="income">{t('دخل')}</option>
        <option value="expense">{t('صرف')}</option>
        <option value="transfer">{t('تحويل')}</option>
      </select>

      {categories.length > 0 && (
        <select
          value={filters.categoryId}
          onChange={(e) => onChange({ ...filters, categoryId: e.target.value })}
          aria-label={t('الفئة')}
          style={inputStyle}
        >
          <option value="">{t('كل الفئات')}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{categoryEmoji(c.icon)} {t(c.name)}</option>)}
        </select>
      )}

      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={onClear}
          style={{
            padding: '8px 14px', borderRadius: '8px',
            border: '1px solid var(--border-color)', backgroundColor: 'transparent',
            color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px',
          }}
        >
          ✕ {t('مسح الفلاتر')}
        </button>
      )}
    </div>
  )
}
