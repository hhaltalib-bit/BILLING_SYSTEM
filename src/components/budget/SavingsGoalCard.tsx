'use client'

import { NumericInput } from '@/components/ui/NumericInput'
import { useT } from '@/lib/i18n'

import { useState, useTransition } from 'react'
import { deleteSavingsGoal, addToSavingsGoal } from '@/app/(dashboard)/budget/actions'
import { useFormatters } from '@/lib/useFormatters'
import type { SavingsGoal } from '@/types/budget'
import { Trash2, Plus } from 'lucide-react'

interface Props { goal: SavingsGoal; onChanged?: () => void }

export function SavingsGoalCard({ goal, onChanged }: Props) {
  const t = useT()
  const [addAmount, setAddAmount]       = useState('')
  const [showAdd,   setShowAdd]         = useState(false)
  const [isPending, startTransition]    = useTransition()

  const nf = useFormatters()
  const fmt = goal.currency === 'IQD' ? nf.iqd : nf.usd

  function handleDelete() {
    if (!confirm(t('حذف هذا الهدف؟'))) return
    startTransition(async () => {
      await deleteSavingsGoal(goal.id)
      onChanged?.()
    })
  }

  function handleAdd() {
    const amt = parseFloat(addAmount)
    if (!amt || amt <= 0) return
    startTransition(async () => {
      await addToSavingsGoal(goal.id, amt)
      setAddAmount('')
      setShowAdd(false)
      onChanged?.()
    })
  }

  return (
    <div
      className="card"
      style={{
        opacity:     isPending ? 0.5 : 1,
        borderColor: goal.is_completed ? 'var(--accent-green)' : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {goal.is_completed ? '✅ ' : ''}{goal.name}
          </div>
          {goal.deadline && (
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('الموعد')}: {nf.date(goal.deadline)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!goal.is_completed && (
            <button
              aria-label={t('إضافة مبلغ')} title={t('إضافة مبلغ')}
              onClick={() => setShowAdd(!showAdd)}
              style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button aria-label={t('حذف')} title={t('حذف')} onClick={handleDelete} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full rounded-full h-2 mb-2" style={{ backgroundColor: 'var(--border-color)' }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width:           `${goal.percent}%`,
            backgroundColor: goal.is_completed ? 'var(--accent-green)' : 'var(--accent-blue)',
          }}
        />
      </div>

      {/* Amounts */}
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span data-sensitive>{fmt(goal.current_amount)}</span>
        <span data-sensitive style={{ fontWeight: 600 }}>
          {nf.pct(goal.percent, 0)} {t('من')} {fmt(goal.target_amount)}
        </span>
      </div>

      {/* Add Amount Input */}
      {showAdd && (
        <div className="flex gap-2 mt-3">
          <NumericInput
            value={addAmount}
            onChange={setAddAmount}
            placeholder={t('المبلغ')}
            style={{
              flex:            1,
              padding:         '8px 10px',
              borderRadius:    '8px',
              border:          '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color:           'var(--text-primary)',
              fontSize:        '13px',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={isPending}
            style={{
              padding:         '8px 14px',
              borderRadius:    '8px',
              border:          'none',
              cursor:          'pointer',
              backgroundColor: 'var(--accent-blue)',
              color:           '#fff',
              fontSize:        '13px',
            }}
          >
            {t('إضافة')}
          </button>
        </div>
      )}
    </div>
  )
}
