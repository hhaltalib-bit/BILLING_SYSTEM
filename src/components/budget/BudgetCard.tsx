'use client'

import { useT } from '@/lib/i18n'

import { useTransition } from 'react'
import { deleteBudgetLimit } from '@/app/(dashboard)/budget/actions'
import { useFormatters } from '@/lib/useFormatters'
import type { BudgetLimit } from '@/types/budget'
import { Trash2 } from 'lucide-react'

interface Props { budget: BudgetLimit; onChanged?: () => void }

export function BudgetCard({ budget, onChanged }: Props) {
  const t = useT()
  const [isPending, startTransition] = useTransition()

  const nf = useFormatters()
  const fmt = budget.currency === 'IQD' ? nf.iqd : nf.usd

  const barColor =
    budget.percent >= 90 ? 'var(--accent-red)' :
    budget.percent >= 70 ? 'var(--accent-gold)' :
    'var(--accent-green)'

  function handleDelete() {
    if (!confirm(t('حذف هذا الحد؟'))) return
    startTransition(async () => {
      await deleteBudgetLimit(budget.id)
      onChanged?.()
    })
  }

  return (
    <div className="card" style={{ opacity: isPending ? 0.5 : 1 }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {t(budget.category_name)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {budget.period === 'monthly' ? t('شهري') : t('أسبوعي')}
          </div>
        </div>
        <button aria-label={t('حذف')} title={t('حذف')} onClick={handleDelete} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full rounded-full h-2 mb-2" style={{ backgroundColor: 'var(--border-color)' }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${budget.percent}%`, backgroundColor: barColor }}
        />
      </div>

      {/* Spent / Limit */}
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span data-sensitive>
          {t('صُرف')}: {fmt(budget.spent)}
        </span>
        <span data-sensitive style={{ color: barColor, fontWeight: 600 }}>
          {nf.pct(budget.percent, 0)} {t('من')} {fmt(budget.limit_amount)}
        </span>
      </div>
    </div>
  )
}
