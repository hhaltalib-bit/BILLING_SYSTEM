'use client'

import { NumericInput } from '@/components/ui/NumericInput'
import { useState, useEffect, useCallback } from 'react'
import { getRecurringTransactions, addRecurringTransaction, deleteRecurringTransaction } from './actions'
import { useFormatters } from '@/lib/useFormatters'
import { useT } from '@/lib/i18n'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import type { RecurringTransaction, RecurringFrequency } from '@/types/recurring'

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  daily:   'يومي',
  weekly:  'أسبوعي',
  monthly: 'شهري',
  yearly:  'سنوي',
}

export default function RecurringPage() {
  const fmt = useFormatters()
  const t = useT()
  const [items,   setItems]   = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [tableError, setTableError] = useState(false)
  const [loadError,  setLoadError]  = useState('')

  // Form
  const [name,      setName]      = useState('')
  const [amount,    setAmount]    = useState('')
  const [currency,  setCurrency]  = useState('IQD')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [dueDate,   setDueDate]   = useState(new Date().toISOString().split('T')[0])
  const [notes,     setNotes]     = useState('')
  const [formError, setFormError] = useState('')
  const [saving,    setSaving]    = useState(false)

  const load = useCallback(async () => {
    try {
      const { items, needsMigration } = await getRecurringTransactions()
      setItems(items)
      setTableError(needsMigration)
      setLoadError('')
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm(t('حذف هذه الدفعة؟'))) return
    try {
      await deleteRecurringTransaction(id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setFormError(t('أدخل اسم الدفعة')); return }
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setFormError(t('أدخل المبلغ')); return }
    setSaving(true)
    try {
      await addRecurringTransaction({ name, amount: amt, currency, frequency, next_due_date: dueDate, notes: notes || undefined })
      setName(''); setAmount(''); setNotes(''); setShowAdd(false); setFormError('')
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-secondary)' }}>
      {t('جارٍ التحميل...')}
    </div>
  )

  if (tableError) return (
    <div className="card text-center py-16">
      <RefreshCw className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
      <div className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('جدول الدفعات المتكررة يحتاج تحديث')}</div>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        {t('شغّل الملف التالي في Supabase SQL Editor ثم أعد تحميل الصفحة:')}
      </p>
      <pre dir="ltr" style={{ textAlign: 'left', fontSize: '12px', backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', overflow: 'auto', color: 'var(--text-primary)', display: 'inline-block' }}>
supabase/migrations/003_recurring_transactions.sql
      </pre>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('🔄 الدفعات المتكررة')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('الفواتير والاشتراكات الشهرية')}</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--accent-blue)', color: '#fff', fontWeight: 600, fontSize: '14px' }}>
          <Plus className="w-4 h-4" /> {t('إضافة دفعة')}
        </button>
      </div>

      {loadError && (
        <div className="card text-sm" style={{ color: 'var(--accent-red)' }}>❌ {loadError}</div>
      )}

      {showAdd && (
        <div className="card">
          <h2 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('دفعة متكررة جديدة')}</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('اسم الدفعة (مثال: إيجار، نت، اشتراك)')} style={inputStyle} />
            <div className="flex gap-3">
              <NumericInput value={amount} onChange={setAmount} placeholder={t('المبلغ')} style={{ ...inputStyle, flex: 2 }} />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                <option value="IQD">IQD</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="flex gap-3">
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)} style={{ ...inputStyle, flex: 1 }}>
                {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
              </select>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{t('تاريخ الاستحقاق التالي')}</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('ملاحظة (اختياري)')} style={inputStyle} />
            {formError && <p style={{ color: 'var(--accent-red)', fontSize: '13px' }}>{formError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--accent-blue)', color: '#fff', fontWeight: 600 }}>
                {saving ? t('جارٍ...') : t('حفظ')}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                {t('إلغاء')}
              </button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card text-center py-16" style={{ color: 'var(--text-secondary)' }}>
          <div className="text-5xl mb-4">🔄</div>
          <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('لا توجد دفعات متكررة')}</div>
          <p className="text-sm">{t('أضف فواتيرك وأشتراكاتك الشهرية هنا')}</p>
        </div>
      ) : (
        <div className="card">
          {items.map((item, i) => (
            <div key={item.id} style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border-color)' : 'none', padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {t(FREQ_LABELS[item.frequency] ?? item.frequency)}{item.next_due_date && ` · ${t('الاستحقاق:')} ${fmt.date(item.next_due_date)}`}
                  {item.notes && ` · ${item.notes}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold" data-sensitive style={{ color: 'var(--accent-red)' }}>
                  -{item.currency === 'IQD' ? fmt.iqd(item.amount) : fmt.usd(item.amount)}
                </span>
                <button aria-label={t('حذف')} title={t('حذف')} onClick={() => handleDelete(item.id)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
