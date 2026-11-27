'use client'

import { useFormatters } from '@/lib/useFormatters'
import { useT } from '@/lib/i18n'
import { ChangeBadge } from '@/components/ui/ChangeBadge'
import type { MonthComparison } from '@/types/dashboard'

interface Props {
  month: MonthComparison
  /** optional ℹ️ tooltip per stat, keyed by stat */
  tooltips?: Partial<Record<'income' | 'expense' | 'net', React.ReactNode>>
}

/** This month's income, expenses and net (month-to-date), each vs the same days last month. */
export function MonthSummaryCard({ month, tooltips = {} }: Props) {
  const fmt = useFormatters()
  const t = useT()
  const { current, previous } = month

  const stats: { key: 'income' | 'expense' | 'net'; label: string; value: number; prev: number; color: string; invert: boolean }[] = [
    { key: 'income',  label: 'دخل الشهر',   value: current.income,  prev: previous.income,  color: 'var(--accent-green)', invert: false },
    { key: 'expense', label: 'مصروف الشهر', value: current.expense, prev: previous.expense, color: 'var(--accent-red)',   invert: true },
    { key: 'net',     label: 'صافي الشهر',  value: current.net,     prev: previous.net,     color: current.net >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', invert: false },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((s) => (
        <div key={s.key} className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t(s.label)}</span>
            {tooltips[s.key]}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: '4px' }}>
            <span data-sensitive style={{ fontWeight: 700, fontSize: '22px', color: s.color }}>
              {s.key === 'net' && s.value > 0 ? '+' : ''}{fmt.iqd(Math.round(s.value))}
            </span>
            <ChangeBadge current={s.value} previous={s.prev} invert={s.invert} />
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t('مقارنة بنفس الفترة من الشهر الماضي')}: <span data-sensitive>{fmt.iqd(Math.round(s.prev))}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
