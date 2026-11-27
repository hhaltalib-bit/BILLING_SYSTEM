'use client'

import { useFormatters } from '@/lib/useFormatters'
import { useT } from '@/lib/i18n'
import type { ForecastData } from '@/types/dashboard'

export function ForecastCard({ data, tooltip }: { data: ForecastData; tooltip?: React.ReactNode }) {
  const fmt = useFormatters()
  const t = useT()

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }} aria-hidden="true">🔮</span>
        <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>{t('توقع نهاية الشهر')}</h3>
      </div>
      {tooltip}
    </div>
  )

  // Without a salary there is nothing to project against
  if (data.salary <= 0) {
    return (
      <div className="card md:col-span-2">
        {header}
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('أضف راتبك الشهري لرؤية توقع نهاية الشهر')}
        </p>
      </div>
    )
  }

  const pct = Math.min(100, (data.totalSpentThisMonth / data.salary) * 100)
  const isGood = data.projectedBalance >= 0
  // salary runs out before the month ends at the current pace
  const isWarning = data.daysUntilBroke !== null && data.daysUntilBroke < data.daysInMonth
  const barColor = pct > 90 ? 'var(--accent-red)' : pct > 70 ? 'var(--accent-gold)' : 'var(--accent-green)'

  return (
    <div className="card md:col-span-2">
      {header}

      {/* Spent so far vs salary */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
          <span>{t('المصروف حتى الآن')}: <span data-sensitive>{fmt.iqd(data.totalSpentThisMonth)}</span></span>
          <span>{fmt.pct(pct, 0)}</span>
        </div>
        <div
          role="progressbar"
          aria-label={t('المصروف حتى الآن')}
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}
        >
          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '4px', transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          <span>{t('اليوم')} {fmt.num(data.daysPassed)} / {fmt.num(data.daysInMonth)}</span>
          <span>
            {t(data.salarySource === 'received' ? 'راتب الشهر المستلم' : 'الراتب المتوقع')} ({fmt.month(data.budgetMonth)}):{' '}
            <span data-sensitive>{fmt.iqd(data.salary)}</span>
          </span>
        </div>
      </div>

      {/* Projection */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        <div style={{
          backgroundColor: 'var(--bg-primary)', borderRadius: '10px', padding: '12px',
          border: `1px solid ${isGood ? 'var(--accent-green)' : 'var(--accent-red)'}`,
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{t('المتوقع يتبقى نهاية الشهر')}</div>
          <div data-sensitive style={{ fontWeight: 700, fontSize: '15px', color: isGood ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {isGood && data.projectedBalance > 0 ? '+' : ''}{fmt.iqd(Math.round(data.projectedBalance))}
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{t('معدل الإنفاق اليومي')}</div>
          <div data-sensitive style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{fmt.iqd(Math.round(data.dailyRate))}</div>
        </div>
      </div>

      {isWarning && data.daysUntilBroke !== null && (
        <div role="alert" style={{
          marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
          backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)',
          fontSize: '13px', color: 'var(--accent-red)',
        }}>
          ⚠️ {t('بناءً على معدل إنفاقك، الراتب سيخلص في')} {fmt.num(data.daysUntilBroke)} {t('يوم من بداية الشهر')}
          {data.daysUntilBroke < data.daysPassed
            ? ` (${t('تجاوزت المعدل الآمن')})`
            : ` — ${fmt.num(data.daysUntilBroke - data.daysPassed)} ${t('يوم متبقي')}`}
        </div>
      )}
    </div>
  )
}
