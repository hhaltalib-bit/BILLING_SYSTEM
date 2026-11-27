'use client'

import { NumericInput } from '@/components/ui/NumericInput'
import { useT } from '@/lib/i18n'

import { useState, useTransition } from 'react'
import { addSavingsGoal } from '@/app/(dashboard)/budget/actions'
import { X } from 'lucide-react'

interface Props { onClose: () => void }

export function AddSavingsGoalModal({ onClose }: Props) {
  const t = useT()
  const [name,     setName]     = useState('')
  const [amount,   setAmount]   = useState('')
  const [currency, setCurrency] = useState<'IQD' | 'USD'>('IQD')
  const [deadline, setDeadline] = useState('')
  const [error,    setError]    = useState('')
  const [isPending, startTransition] = useTransition()

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px',
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!name.trim()) { setError(t('أدخل اسم الهدف')); return }
    if (!amt || amt <= 0) { setError(t('أدخل مبلغاً صحيحاً')); return }

    startTransition(async () => {
      try {
        await addSavingsGoal({ name: name.trim(), target_amount: amt, currency, deadline: deadline || undefined })
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
      <div className="card" role="dialog" aria-modal="true" aria-label={t('إضافة هدف ادخاري')} style={{ width: '100%', maxWidth: '420px', margin: '16px' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('إضافة هدف ادخاري')}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('اسم الهدف')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('مثال: سيارة، سفر، طارئ...')} style={inputStyle} required />
          </div>

          <div className="flex gap-3">
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('المبلغ المستهدف')}</label>
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
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('الموعد النهائي (اختياري)')}</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={inputStyle} />
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
