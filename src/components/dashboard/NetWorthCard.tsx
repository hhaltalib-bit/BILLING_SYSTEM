'use client'

import { useT } from '@/lib/i18n'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

import { useFormatters } from '@/lib/useFormatters'

interface Props {
  netWorthIQD: number
  salaryAmount: number
}

export function NetWorthCard({ netWorthIQD, salaryAmount }: Props) {
  const fmt = useFormatters()
  const t = useT()
  const salaryPercent =
    salaryAmount > 0 ? Math.min((netWorthIQD / salaryAmount) * 100, 999) : 0

  return (
    <div className="card md:col-span-2">
      <div className="flex items-center justify-between gap-2 text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
        <span>{t('صافي الثروة')}</span>
        <InfoTooltip text="مجموع أرصدة محافظك الأربع، بعد تحويل الدولار للدينار بسعر الصرف الحالي. لا يشمل قيمة الذهب." />
      </div>
      <div className="text-3xl font-bold mb-4" data-sensitive style={{ color: 'var(--accent-gold)' }}>
        {fmt.iqd(netWorthIQD)}
      </div>

      {salaryAmount > 0 && (
        <>
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            <span>{t('نسبة من الراتب')}</span>
            <span data-sensitive>{fmt.pct(salaryPercent)}</span>
          </div>
          <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--border-color)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${Math.min(salaryPercent, 100)}%`, backgroundColor: 'var(--accent-gold)' }}
            />
          </div>
        </>
      )}
    </div>
  )
}
