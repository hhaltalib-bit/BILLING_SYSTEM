'use client'

import { useCallback, useEffect, useState } from 'react'
import { getActivityFeed, type ActivityItem, type ActivityKind } from './actions'
import { useT } from '@/lib/i18n'
import { useFormatters } from '@/lib/useFormatters'

const ICON: Record<ActivityKind, string> = { income: '💰', expense: '💸', transfer: '🔄', gold: '🥇' }
const LABEL: Record<ActivityKind, string> = { income: 'دخل', expense: 'صرف', transfer: 'تحويل', gold: 'شراء ذهب' }
const COLOR: Record<ActivityKind, string> = {
  income: 'var(--accent-green)', expense: 'var(--accent-red)', transfer: 'var(--accent-blue)', gold: 'var(--accent-gold)',
}

export default function ActivityPage() {
  const t = useT()
  const fmt = useFormatters()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setItems(await getActivityFeed())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const onChanged = () => { load() }
    window.addEventListener('finova:data-changed', onChanged)
    return () => window.removeEventListener('finova:data-changed', onChanged)
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-secondary)' }}>
        {t('جارٍ التحميل...')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('📜 سجل النشاط')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('كل الحركات ومشتريات الذهب، الأحدث أولاً')}</p>
      </div>

      {error && (
        <div className="card text-sm flex items-center justify-between gap-3" role="alert" style={{ color: 'var(--accent-red)' }}>
          <span>❌ {error}</span>
          <button onClick={() => { setLoading(true); load() }} style={{ background: 'none', border: '1px solid currentColor', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', color: 'inherit' }}>↻</button>
        </div>
      )}

      {!error && items.length === 0 ? (
        <div className="card text-center py-12" style={{ color: 'var(--text-secondary)' }}>
          <div className="text-4xl mb-3" aria-hidden="true">📜</div>
          <div className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{t('لا يوجد نشاط بعد')}</div>
          <p className="text-sm">{t('أضف حركة أو شراء ذهب ليظهر هنا')}</p>
        </div>
      ) : (
        <ol className="card" style={{ listStyle: 'none', margin: 0 }}>
          {items.map((it) => {
            const sign = it.kind === 'income' ? '+' : it.kind === 'expense' || it.kind === 'gold' ? '-' : ''
            return (
              <li
                key={`${it.kind}-${it.id}`}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: '1px solid var(--border-color)', gap: '12px' }}
              >
                <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: COLOR[it.kind] + '22', fontSize: '18px' }}
                    aria-hidden="true"
                  >
                    {ICON[it.kind]}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>
                      {t(it.description ?? LABEL[it.kind])}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="sr-only">{t(LABEL[it.kind])} · </span>
                      <time dateTime={it.created_at}>{fmt.date(it.created_at, true)}</time>
                      {it.category && it.description !== it.category && ` · ${t(it.category)}`}
                      {it.mithqal !== null && ` · ${fmt.mithqal(it.mithqal)}`}
                    </div>
                  </div>
                </div>
                <div className="font-semibold text-sm flex-shrink-0" data-sensitive style={{ color: COLOR[it.kind], whiteSpace: 'nowrap' }}>
                  {sign}{fmt.money(it.amount, it.currency)}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
