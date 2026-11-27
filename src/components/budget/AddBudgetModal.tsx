'use client'

import { NumericInput } from '@/components/ui/NumericInput'
import { useT } from '@/lib/i18n'

import { useState, useTransition } from 'react'
import { addBudgetLimit } from '@/app/(dashboard)/budget/actions'
import { X } from 'lucide-react'

interface Category { id: string; name: string }
interface Props { categories: Category[]; onClose: () => void }

export function AddBudgetModal({ categories, onClose }: Props) {
  const t = useT()
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [amount,     setAmount]     = useState('')
  const [currency,   setCurrency]   = useState<'IQD' | 'USD'>('IQD')
  const [period,     setPeriod]     = useState<'monthly' | 'weekly'>('monthly')
  const [error,      setError]      = useState('')
  const [isPending,  startTransition] = useTransition()

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px',
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError(t('أدخل مبلغاً صحيحاً')); return }
    if (!categoryId)      { setError(t('اختر الفئة'));           return }

    startTransition(async () => {
      try {
        await addBudgetLimit({ category_id: categoryId, limit_amount: amt, currency, period })
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card" role="dialog" aria-modal="true" aria-label={t('إضافة حد ميزانية')} style={{ width: '100%', maxWidth: '420px', margin: '16px' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('إضافة حد ميزانية')}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('الفئة')}</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
              {categories.map((c) => <option key={c.id} value={c.id}>{t(c.name)}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('الحد الأقصى')}</label>
              <NumericInput value={amount} onChange={setAmount} placeholder="0" style={inputStyle} required />
            </div>
            <div style={{ width: '90px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('العملة')}</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as 'IQD' | 'USD')} style={inputStyle}>
                <option value="IQD">IQD</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('الفترة')}</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value as 'monthly' | 'weekly')} style={inputStyle}>
              <option value="monthly">{t('شهري')}</option>
            </select>
          </div>

          {error && <p style={{ color: 'var(--accent-red)', fontSize: '13px' }}>{error}</p>}

          <button type="submit" disabled={isPending} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--accent-blue)', color: '#fff', fontWeight: 600, opacity: isPending ? 0.7 : 1 }}>
            {isPending ? t('جارٍ الحفظ...') : t('حفظ')}
          </button>
        </form>
      </div>
    </div>
  )
}
