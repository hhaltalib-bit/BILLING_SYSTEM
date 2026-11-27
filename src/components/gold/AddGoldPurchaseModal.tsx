'use client'

import { NumericInput } from '@/components/ui/NumericInput'
import { useT } from '@/lib/i18n'

import { useState, useTransition } from 'react'
import { addGoldPurchase } from '@/app/(dashboard)/gold/actions'
import { X } from 'lucide-react'

interface Props { onClose: () => void }

export function AddGoldPurchaseModal({ onClose }: Props) {
  const t = useT()
  const today = new Date().toISOString().split('T')[0]
  const [qty,      setQty]      = useState('')
  const [price,    setPrice]    = useState('')
  const [date,     setDate]     = useState(today)
  const [notes,    setNotes]    = useState('')
  const [error,    setError]    = useState('')
  const [isPending, startTransition] = useTransition()

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)',
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = parseFloat(qty)
    const p = parseFloat(price)
    if (!q || q <= 0) { setError(t('أدخل الكمية بالمثاقيل'));   return }
    if (!p || p <= 0) { setError(t('أدخل سعر الشراء بالدينار')); return }

    startTransition(async () => {
      try {
        await addGoldPurchase({
          quantity_mithqal:   q,
          purchase_price_iqd: p,
          purchase_date:      date,
          notes:              notes || undefined,
        })
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
      <div className="card" role="dialog" aria-modal="true" aria-label={t('إضافة شراء ذهب')} style={{ width: '100%', maxWidth: '440px', margin: '16px' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('🥇 إضافة شراء ذهب')}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={labelStyle}>{t('الكمية (مثاقيل)')}</label>
            <NumericInput value={qty} onChange={setQty} placeholder={t('مثال: 5.5')} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>{t('سعر الشراء الإجمالي (دينار)')}</label>
            <NumericInput value={price} onChange={setPrice} placeholder="0" style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>{t('تاريخ الشراء')}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>{t('ملاحظة (اختياري)')}</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('مثال: من السوق المركزي')} style={inputStyle} />
          </div>

          {error && <p style={{ color: 'var(--accent-red)', fontSize: '13px' }}>{error}</p>}

          <button type="submit" disabled={isPending} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--accent-gold)', color: '#fff', fontWeight: 600, opacity: isPending ? 0.7 : 1 }}>
            {isPending ? t('جارٍ الحفظ...') : t('حفظ')}
          </button>
        </form>
      </div>
    </div>
  )
}
