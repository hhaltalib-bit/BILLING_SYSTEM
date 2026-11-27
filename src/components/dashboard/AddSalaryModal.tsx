'use client'

import { NumericInput } from '@/components/ui/NumericInput'
import { useT } from '@/lib/i18n'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSalary } from '@/app/(dashboard)/settings/actions'
import { useAppStore } from '@/store/useAppStore'
import { useFormatters } from '@/lib/useFormatters'
import { X } from 'lucide-react'

interface Props { onClose: () => void; currentSalary?: number }

export function AddSalaryModal({ onClose, currentSalary = 0 }: Props) {
  const t = useT()
  const fmt = useFormatters()
  const router = useRouter()
  const [amount, setAmount] = useState(currentSalary > 0 ? String(currentSalary) : '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()
  const setSalary = useAppStore((s) => s.setSalary)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px',
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(amount)
    if (!val || val <= 0) { setError(t('أدخل مبلغاً صحيحاً')); return }
    startTransition(async () => {
      try {
        const res = await updateSalary(val)
        setSalary(val)
        setError('')
        if ('noSalarySet' in res) { setError(t('لم تضبط راتبك بعد — اذهب للإعدادات')); return }
        // The salary counts toward res.budgetMonth (next month when paid on/after the 25th)
        const already = 'alreadyPaid' in res
        const month = fmt.month(res.budgetMonth)
        setSuccess(already
          ? `✅ ${t('تم تحديث الراتب — راتب هذا الشهر مسجّل مسبقاً:')} ${month}`
          : `✅ ${t('تم إضافة راتب شهر')} ${month}`)
        router.refresh() // re-render server pages (salary bar, wallets, transactions)
        setTimeout(onClose, already ? 1500 : 1200)
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
      <div className="card" role="dialog" aria-modal="true" aria-label={t('تحديث الراتب')} style={{ width: '100%', maxWidth: '400px', margin: '16px' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('💰 تحديث الراتب')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {t('الراتب الشهري (دينار عراقي)')}
            </label>
            <NumericInput
              value={amount}
              onChange={setAmount}
              placeholder={t('مثال: 500000')}
              style={inputStyle}
              autoFocus
            />
          </div>
          {error && <p style={{ color: 'var(--accent-red)', fontSize: '13px' }}>{error}</p>}
          {success && <p role="status" style={{ color: 'var(--accent-green)', fontSize: '13px', fontWeight: 600 }}>{success}</p>}
          <button type="submit" disabled={isPending || !!success} style={{
            width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
            cursor: isPending ? 'not-allowed' : 'pointer',
            backgroundColor: 'var(--accent-green)', color: '#fff', fontWeight: 600,
            opacity: isPending ? 0.7 : 1,
          }}>
            {isPending ? t('جارٍ الحفظ...') : t('حفظ')}
          </button>
        </form>
      </div>
    </div>
  )
}
