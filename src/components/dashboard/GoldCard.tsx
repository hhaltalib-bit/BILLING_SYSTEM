'use client'

import { useT } from '@/lib/i18n'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

import { useFormatters } from '@/lib/useFormatters'
import type { GoldSummary } from '@/types/dashboard'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props { gold: GoldSummary }

export function GoldCard({ gold }: Props) {
  const fmt = useFormatters()
  const t = useT()
  const isProfit = gold.profit_loss >= 0
  const hasPrice = gold.current_gold_price_iqd > 0

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('محفظة الذهب')}</span>
        <span className="flex items-center gap-2">
          <span style={{ fontSize: '1.4rem' }} aria-hidden="true">🥇</span>
          <InfoTooltip text="قيمة ما تملكه من ذهب بسعر السوق الحالي، والربح أو الخسارة مقارنة بما دفعته." />
        </span>
      </div>

      <div className="text-xl font-bold mb-2" data-sensitive style={{ color: 'var(--accent-gold)' }}>
        {fmt.mithqal(gold.total_mithqal)}
      </div>

      <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
        {t('القيمة الحالية')}:{' '}
        <span data-sensitive style={{ color: 'var(--text-primary)' }}>
          {hasPrice ? fmt.iqd(gold.current_value_iqd) : '—'}
        </span>
      </div>

      {hasPrice && (
      <div className="flex items-center gap-1 text-sm">
        {isProfit
          ? <TrendingUp   className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
          : <TrendingDown className="w-4 h-4" style={{ color: 'var(--accent-red)'   }} />
        }
        <span data-sensitive style={{ color: isProfit ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          {isProfit ? '+' : ''}{fmt.iqd(gold.profit_loss)} ({fmt.pct(gold.profit_loss_percent)})
        </span>
      </div>
      )}

      <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
        {t('سعر المثقال')}:{' '}
        <span data-sensitive>{hasPrice ? fmt.iqd(gold.current_gold_price_iqd) : '—'}</span>
      </div>
    </div>
  )
}
