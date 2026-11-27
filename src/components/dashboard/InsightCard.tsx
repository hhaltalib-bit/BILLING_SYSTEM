'use client'

import { useFormatters } from '@/lib/useFormatters'
import { useT } from '@/lib/i18n'
import type { CategorySpend } from '@/types/dashboard'

interface Props {
  /** this month's expenses by category, largest first */
  categories: CategorySpend[]
  tooltip?: React.ReactNode
}

// Keyed by the stored (Arabic) names of the default categories
const CATEGORY_EMOJI: Record<string, string> = {
  'أكل': '🍔', 'كهرباء': '💡', 'سيارة': '🚗', 'إيجار': '🏠', 'كورسات': '📚',
  'امتحانات': '📝', 'ألعاب': '🎮', 'صيانة': '🔧', 'صحة': '💊', 'ملابس': '👕', 'أخرى': '📦',
}

export function InsightCard({ categories, tooltip }: Props) {
  const fmt = useFormatters()
  const t = useT()

  const totalExpense = categories.reduce((s, c) => s + c.total, 0)
  const top = categories[0]

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }} aria-hidden="true">💡</span>
        <h3 style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{t('إنسايت الشهر')}</h3>
      </div>
      {tooltip}
    </div>
  )

  if (!top || totalExpense <= 0) {
    return (
      <div className="card">
        {header}
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('لا توجد مصاريف هذا الشهر بعد')}</p>
      </div>
    )
  }

  const topPct = (top.total / totalExpense) * 100
  const top3 = categories.slice(0, 3)
  const medals = ['🥇', '🥈', '🥉']
  const barColors = ['var(--accent-blue)', '#8b5cf6', 'var(--text-secondary)']

  return (
    <div className="card">
      {header}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div aria-hidden="true" style={{
          width: '48px', height: '48px', borderRadius: '12px',
          backgroundColor: 'var(--bg-primary)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0,
        }}>
          {CATEGORY_EMOJI[top.name] ?? '📊'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{t('أكثر فئة صرفت عليها')}</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>{t(top.name)}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span data-sensitive>{fmt.iqd(Math.round(top.total))}</span> · {fmt.pct(topPct, 0)} {t('من إنفاقك')}
          </div>
        </div>
      </div>

      {top3.length > 1 && (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}>
          {top3.map((cat, i) => {
            const pct = (cat.total / totalExpense) * 100
            return (
              <li key={cat.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    <span aria-hidden="true">{medals[i]}</span> {t(cat.name)}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{fmt.pct(pct, 0)}</span>
                </div>
                <div style={{ height: '4px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', borderRadius: '2px', width: `${pct}%`, backgroundColor: barColors[i] }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
