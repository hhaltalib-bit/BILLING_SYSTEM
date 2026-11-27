'use client'

import { useState, useTransition } from 'react'
import { refreshGoldPrice } from '@/app/(dashboard)/gold/actions'
import { useFormatters } from '@/lib/useFormatters'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import type { GoldPageData } from '@/types/gold'
import { useT } from '@/lib/i18n'

interface Props { data: GoldPageData; onRefreshed?: () => void }

export function GoldSummaryCard({ data, onRefreshed }: Props) {
  const fmt = useFormatters()
  const t = useT()
  const [isPending, startTransition] = useTransition()
  const [refreshError, setRefreshError] = useState('')
  const isProfit = data.profit_loss >= 0
  // No cached market price yet → value / P&L are unknown, not a 100% loss
  const hasPrice = data.current_price_per_mithqal_iqd > 0

  function handleRefresh() {
    startTransition(async () => {
      setRefreshError('')
      try { await refreshGoldPrice(); onRefreshed?.() }
      catch (err) { setRefreshError(err instanceof Error ? err.message : String(err)) }
    })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('🥇 ملخص محفظة الذهب')}
          </h2>
          {data.last_price_update && (
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {t('آخر تحديث')}: {fmt.date(data.last_price_update, true)}
            </div>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          title={t('تحديث سعر الذهب')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px', border: 'none',
            cursor: isPending ? 'not-allowed' : 'pointer',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-secondary)', fontSize: '13px',
          }}
        >
          <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? t('جارٍ...') : t('تحديث السعر')}
        </button>
      </div>

      {refreshError && (
        <p className="text-xs mb-3" style={{ color: 'var(--accent-red)' }}>❌ {refreshError}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('إجمالي المثاقيل')}</div>
          <div className="text-lg font-bold" data-sensitive style={{ color: 'var(--accent-gold)' }}>
            {fmt.mithqal(data.total_mithqal)}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('التكلفة الإجمالية')}</div>
          <div className="text-lg font-bold" data-sensitive style={{ color: 'var(--text-primary)' }}>
            {fmt.iqd(data.total_cost_iqd)}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('القيمة الحالية')}</div>
          <div className="text-lg font-bold" data-sensitive style={{ color: 'var(--accent-blue)' }}>
            {hasPrice ? fmt.iqd(data.current_value_iqd) : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('الربح / الخسارة')}</div>
          {!hasPrice ? (
            <div className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>—</div>
          ) : (
          <div
            className="text-lg font-bold flex items-center gap-1"
            data-sensitive
            style={{ color: isProfit ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {isProfit
              ? <TrendingUp   className="w-4 h-4" />
              : <TrendingDown className="w-4 h-4" />
            }
            {isProfit ? '+' : ''}{fmt.iqd(data.profit_loss)}
            <span className="text-xs">({fmt.pct(data.profit_loss_percent)})</span>
          </div>
          )}
        </div>
      </div>

      {!hasPrice && (
        <div className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('لا يوجد سعر سوق محفوظ بعد — اضغط')} &quot;{t('تحديث السعر')}&quot; {t('لجلب السعر الحالي')}
        </div>
      )}
      {hasPrice && (
        <div className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('سعر المثقال الحالي')}:{' '}
          <span data-sensitive style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
            {fmt.iqd(data.current_price_per_mithqal_iqd)}
          </span>
        </div>
      )}
    </div>
  )
}
