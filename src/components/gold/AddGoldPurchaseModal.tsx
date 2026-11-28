'use client'

import { NumericInput } from '@/components/ui/NumericInput'
import { useT } from '@/lib/i18n'

import { useState, useTransition } from 'react'
import { addGoldPurchase } from '@/app/(dashboard)/gold/actions'
import { GOLD_MITHQAL_TO_GRAMS } from '@/lib/constants'
import { X } from 'lucide-react'

interface Props { onClose: () => void }

/** Round to `digits` decimals and return a raw number string ("" for empty / invalid input). */
function toRaw(n: number, digits: number): string {
  if (!Number.isFinite(n)) return ''
  return String(Number(n.toFixed(digits)))
}

export function AddGoldPurchaseModal({ onClose }: Props) {
  const t = useT()
  const today = new Date().toISOString().split('T')[0]
  // Mithqal and grams stay in sync; mithqal (4 decimals, matching NUMERIC(10,4)) is what gets saved.
  const [qty,      setQty]      = useState('')
  const [grams,    setGrams]    = useState('')
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

  function handleMithqalChange(raw: string) {
    setQty(raw)
    setGrams(raw === '' ? '' : toRaw(parseFloat(raw) * GOLD_MITHQAL_TO_GRAMS, 2))
  }

  function handleGramsChange(raw: string) {
    setGrams(raw)
    setQty(raw === '' ? '' : toRaw(parseFloat(raw) / GOLD_MITHQAL_TO_GRAMS, 4))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = parseFloat(qty)
    const p = parseFloat(price)
    if (!q || q <= 0) { setError(t('أدخل الكمية بالمثقال أو الغرام')); return }
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
      className="modal-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card modal-card" role="dialog" aria-modal="true" aria-label={t('إضافة شراء ذهب')} style={{ width: '100%', maxWidth: '440px', margin: '16px' }}>
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
            <label style={labelStyle}>{t('الكمية')}</label>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label htmlFor="gold-qty-mithqal" style={{ ...labelStyle, fontSize: '12px' }}>{t('مثقال')}</label>
                <NumericInput id="gold-qty-mithqal" value={qty} onChange={handleMithqalChange} placeholder={t('مثال: 5.5')} style={inputStyle} required />
              </div>
              <span aria-hidden="true" style={{ paddingBottom: '10px', color: 'var(--text-secondary)', fontSize: '18px' }}>⇄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label htmlFor="gold-qty-grams" style={{ ...labelStyle, fontSize: '12px' }}>{t('غرام')}</label>
                <NumericInput id="gold-qty-grams" value={grams} onChange={handleGramsChange} placeholder={t('مثال: 25.74')} style={inputStyle} />
              </div>
            </div>
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
