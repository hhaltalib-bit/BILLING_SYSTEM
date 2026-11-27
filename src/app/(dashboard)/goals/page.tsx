'use client'

import { NumericInput } from '@/components/ui/NumericInput'
import { useState, useEffect, useCallback } from 'react'
import { getBudgetPageData, addSavingsGoal, addToSavingsGoal, deleteSavingsGoal } from '@/app/(dashboard)/budget/actions'
import { useFormatters } from '@/lib/useFormatters'
import { useT } from '@/lib/i18n'
import { Plus, Trash2, Target } from 'lucide-react'

interface Goal {
  id: string
  name: string
  target_amount: number
  saved_amount: number
  currency: 'IQD' | 'USD'
}


export default function GoalsPage() {
  const nf = useFormatters()
  const fmt = (g: Goal, n: number) => (g.currency === 'USD' ? nf.usd(n) : nf.iqd(n))
  const t = useT()
  const [goals,     setGoals]     = useState<Goal[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({})

  // Add goal form state
  const [newName,   setNewName]   = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [formError, setFormError] = useState('')
  const [saving,    setSaving]    = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await getBudgetPageData()
      // budget actions expose the saved amount as current_amount
      setGoals((d.savingsGoals ?? []).map((g) => ({
        id: g.id, name: g.name, target_amount: g.target_amount,
        saved_amount: g.current_amount, currency: g.currency,
      })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) { setFormError(t('أدخل اسم الهدف')); return }
    const target = parseFloat(newTarget)
    if (!target || target <= 0) { setFormError(t('أدخل المبلغ المستهدف')); return }
    setSaving(true)
    try {
      await addSavingsGoal({ name: newName, target_amount: target, currency: 'IQD' })
      setNewName(''); setNewTarget(''); setShowAdd(false); setFormError('')
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleAddAmount(goal: Goal) {
    const amt = parseFloat(addAmounts[goal.id] ?? '0')
    if (!amt || amt <= 0) return
    try {
      await addToSavingsGoal(goal.id, amt)
      setAddAmounts({ ...addAmounts, [goal.id]: '' })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('حذف هذا الهدف؟'))) return
    try {
      await deleteSavingsGoal(id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('🎯 الأهداف المالية')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('تتبع مدخراتك وأهدافك')}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--accent-blue)', color: '#fff', fontWeight: 600, fontSize: '14px' }}
        >
          <Plus className="w-4 h-4" /> {t('إضافة هدف')}
        </button>
      </div>

      {/* Add Goal Form */}
      {showAdd && (
        <div className="card">
          <h2 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('هدف جديد')}</h2>
          <form onSubmit={handleAddGoal} className="space-y-3">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('اسم الهدف (مثال: سفر، سيارة، طوارئ)')} style={inputStyle} />
            <NumericInput value={newTarget} onChange={setNewTarget} placeholder={t('المبلغ المستهدف بالدينار')} style={inputStyle} />
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

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="card text-center py-16" style={{ color: 'var(--text-secondary)' }}>
          <Target className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-blue)' }} />
          <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('لا توجد أهداف بعد')}</div>
          <p className="text-sm">{t('اضغط "إضافة هدف" لإنشاء هدف مالي جديد')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const pct = goal.target_amount > 0 ? Math.min((goal.saved_amount / goal.target_amount) * 100, 100) : 0
            const color = pct >= 100 ? 'var(--accent-green)' : pct >= 70 ? 'var(--accent-gold)' : 'var(--accent-blue)'
            const remaining = goal.target_amount - goal.saved_amount

            return (
              <div key={goal.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{goal.name}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      <span data-sensitive>{fmt(goal, goal.saved_amount)}</span>
                      {' / '}
                      <span data-sensitive>{fmt(goal, goal.target_amount)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color }}>{nf.pct(pct, 0)}</span>
                    <button aria-label={t('حذف')} title={t('حذف')} onClick={() => handleDelete(goal.id)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: '4px', backgroundColor: color, transition: 'width 0.3s' }} />
                </div>

                {/* Add amount */}
                {pct < 100 && (
                  <div className="flex gap-2 items-center">
                    <NumericInput
                      value={addAmounts[goal.id] ?? ''}
                      onChange={(raw) => setAddAmounts({ ...addAmounts, [goal.id]: raw })}
                      placeholder={`${t('أضف مبلغاً')} (${t('متبقي')}: ${fmt(goal, remaining)})`}
                      style={{ ...inputStyle, flex: 1, fontSize: '13px', padding: '8px 10px' }}
                    />
                    <button
                      onClick={() => handleAddAmount(goal)}
                      style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: color, color: '#fff', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      {t('إضافة')}
                    </button>
                  </div>
                )}

                {pct >= 100 && (
                  <div className="text-center text-sm font-bold" style={{ color: 'var(--accent-green)' }}>
                    {t('🎉 تم تحقيق الهدف!')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
