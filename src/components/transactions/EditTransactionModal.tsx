'use client'

import { useEffect, useState } from 'react'
import { updateTransaction } from '@/app/(dashboard)/transactions/actions'
import { useT } from '@/lib/i18n'
import { categoryEmoji } from '@/lib/categoryIcons'
import type { Transaction, Category } from '@/types/transaction'

interface Props {
  transaction: Transaction
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

export function EditTransactionModal({ transaction: tx, categories, onClose, onSaved }: Props) {
  const t = useT()
  const [note, setNote] = useState(tx.note ?? '')
  const [categoryId, setCategoryId] = useState(tx.category_id ?? '')
  const [date, setDate] = useState(tx.date)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, onClose])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!date) { setError(t('تاريخ غير صالح')); return }
    setLoading(true)
    setError('')
    try {
      const result = await updateTransaction(tx.id, {
        note,
        category_id: tx.type === 'transfer' ? null : (categoryId || null),
        date,
      })
      if (result.success) {
        onSaved()
        onClose()
        return
      }
      setError(t(result.error || 'حدث خطأ'))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: '15px', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }

  return (
    <div
      className="modal-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '16px' }}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <form onSubmit={handleSave} className="card modal-card" role="dialog" aria-modal="true" aria-label={t('تعديل الحركة')} style={{ width: '100%', maxWidth: '440px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>✏️ {t('تعديل الحركة')}</h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', backgroundColor: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '8px' }}>
          ⚠️ {t('يمكن تعديل الملاحظة والفئة والتاريخ فقط. لتغيير المبلغ أو المحفظة، احذف الحركة وأضفها من جديد.')}
        </p>

        {tx.type !== 'transfer' && categories.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="edit-tx-category" style={labelStyle}>{t('الفئة')}</label>
            <select id="edit-tx-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
              <option value="">{t('بدون فئة')}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{categoryEmoji(c.icon)} {t(c.name)}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label htmlFor="edit-tx-note" style={labelStyle}>{t('الملاحظة')}</label>
          <input
            id="edit-tx-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('اختياري')}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="edit-tx-date" style={labelStyle}>{t('التاريخ')}</label>
          <input id="edit-tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} required />
        </div>

        {error && <p role="alert" style={{ color: 'var(--accent-red)', marginBottom: '12px', fontSize: '14px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
              backgroundColor: 'var(--accent-blue)', color: '#fff', opacity: loading ? 0.7 : 1,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px',
            }}
          >
            {loading ? t('جارٍ الحفظ...') : `💾 ${t('حفظ التعديلات')}`}
          </button>
          <button
            type="button"
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
      </form>
    </div>
  )
}
