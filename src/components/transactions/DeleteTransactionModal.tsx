'use client'

import { useEffect, useState } from 'react'
import { deleteTransaction, restoreTransaction } from '@/app/(dashboard)/transactions/actions'
import { showUndoToast } from '@/lib/useUndoToast'
import { useFormatters } from '@/lib/useFormatters'
import { useT } from '@/lib/i18n'
import type { Transaction } from '@/types/transaction'

interface Props {
  transaction: Transaction
  onClose: () => void
  onDeleted: () => void
}

export function DeleteTransactionModal({ transaction: tx, onClose, onDeleted }: Props) {
  const t = useT()
  const fmt = useFormatters()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, onClose])

  async function handleDelete() {
    setLoading(true)
    setError('')
    try {
      const result = await deleteTransaction(tx.id)
      if (result.success) {
        const snapshot = result.deleted
        // Undo = put the exact row back (same id/date; trigger re-applies its balance effect)
        showUndoToast(t('تم حذف الحركة ✓'), snapshot && (async () => {
          const r = await restoreTransaction(snapshot)
          if (!r.success) throw new Error(t(r.error ?? 'حدث خطأ'))
        }))
        onDeleted()
        onClose()
        return
      }
      setError(t(result.error || 'حدث خطأ'))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setLoading(false)
  }

  const typeLabel = tx.type === 'income' ? t('دخل') : tx.type === 'expense' ? t('صرف') : t('تحويل')
  const typeColor = tx.type === 'income' ? 'var(--accent-green)' : tx.type === 'expense' ? 'var(--accent-red)' : 'var(--accent-blue)'

  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }
  const label: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '14px' }

  return (
    <div
      className="modal-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '16px' }}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="card modal-card" role="alertdialog" aria-modal="true" aria-label={t('حذف الحركة')} style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }} aria-hidden="true">🗑️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-red)' }}>{t('حذف الحركة')}</h2>
        </div>

        <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
          <div style={row}>
            <span style={label}>{t('النوع')}</span>
            <span style={{ color: typeColor, fontWeight: 600 }}>{typeLabel}</span>
          </div>
          <div style={row}>
            <span style={label}>{t('المبلغ')}</span>
            <span data-sensitive style={{ fontWeight: 700, color: typeColor }}>{fmt.money(tx.amount, tx.currency)}</span>
          </div>
          {tx.category_name && (
            <div style={row}>
              <span style={label}>{t('الفئة')}</span>
              <span style={{ color: 'var(--text-primary)' }}>{t(tx.category_name)}</span>
            </div>
          )}
          {tx.note && (
            <div style={row}>
              <span style={label}>{t('الملاحظة')}</span>
              <span style={{ maxWidth: '220px', textAlign: 'end', color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{t(tx.note)}</span>
            </div>
          )}
          <div style={{ ...row, marginBottom: 0 }}>
            <span style={label}>{t('التاريخ')}</span>
            <span style={{ color: 'var(--text-primary)' }}>{fmt.date(tx.date)}</span>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>
          {tx.balance_applied
            ? t('سيتم عكس تأثير هذه الحركة على رصيد المحفظة. لا يمكن التراجع عن هذا الإجراء.')
            : t('هذه الحركة لم تؤثر على رصيد المحفظة، وحذفها لن يغيّره. لا يمكن التراجع عن هذا الإجراء.')}
        </p>

        {error && <p role="alert" style={{ color: 'var(--accent-red)', textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
              backgroundColor: 'var(--accent-red)', color: '#fff', opacity: loading ? 0.7 : 1,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px',
            }}
          >
            {loading ? t('جاري الحذف...') : `🗑️ ${t('تأكيد الحذف')}`}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: '1px solid var(--border-color)', backgroundColor: 'transparent',
              color: 'var(--text-secondary)', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px',
            }}
          >
            {t('إلغاء')}
          </button>
        </div>
      </div>
    </div>
  )
}
