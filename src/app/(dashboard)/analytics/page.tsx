'use client'

import { useState, useEffect } from 'react'
import { getAnalyticsData } from './actions'
import { useFormatters } from '@/lib/useFormatters'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useT } from '@/lib/i18n'

import { useAppStore } from '@/store/useAppStore'

interface MonthData { income: number; expense: number; label: string; key: string }
interface CatData   { name: string; total: number }

// key is YYYY-MM; format in the active UI language (server label is always Arabic)
function monthLabel(key: string, lang: 'ar' | 'en'): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-IQ', { month: 'short', year: '2-digit' })
}

export default function AnalyticsPage() {
  const fmt = useFormatters()
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const [monthly,   setMonthly]   = useState<MonthData[]>([])
  const [catData,   setCatData]   = useState<CatData[]>([])
  const [totals,    setTotals]    = useState({ income: 0, expense: 0 })
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  useEffect(() => {
    getAnalyticsData().then((d) => {
      setMonthly(d.monthly)
      setCatData(d.categoryBreakdown)
      setTotals({ income: d.totalIncome, expense: d.totalExpense })
    }).catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-secondary)' }}>
      {t('جارٍ التحميل...')}
    </div>
  )

  const maxBar = Math.max(...monthly.flatMap((m) => [m.income, m.expense]), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('📊 التحليلات')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('آخر 6 أشهر')}</p>
        {error && <p className="text-sm mt-2" style={{ color: 'var(--accent-red)' }}>❌ {error}</p>}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent-green)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('إجمالي الدخل')}</span>
          </div>
          <div className="text-xl font-bold" data-sensitive style={{ color: 'var(--accent-green)' }}>
            {fmt.iqd(totals.income)}
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-5 h-5" style={{ color: 'var(--accent-red)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('إجمالي المصاريف')}</span>
          </div>
          <div className="text-xl font-bold" data-sensitive style={{ color: 'var(--accent-red)' }}>
            {fmt.iqd(totals.expense)}
          </div>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      {monthly.length > 0 && (
        <div className="card">
          <h2 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('الدخل مقابل المصاريف شهرياً')}</h2>
          <div className="flex items-end gap-4" style={{ height: '180px', overflowX: 'auto' }}>
            {monthly.map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-1" style={{ minWidth: '56px', height: '100%', justifyContent: 'flex-end' }}>
                <div className="flex items-end gap-1" style={{ height: '150px', width: '100%', justifyContent: 'center' }}>
                  <div
                    title={`${t('دخل')}: ${fmt.iqd(m.income)}`}
                    style={{ width: '20px', borderRadius: '4px 4px 0 0', backgroundColor: 'var(--accent-green)', height: `${(m.income / maxBar) * 140}px`, minHeight: '2px', opacity: 0.85 }}
                  />
                  <div
                    title={`${t('صرف')}: ${fmt.iqd(m.expense)}`}
                    style={{ width: '20px', borderRadius: '4px 4px 0 0', backgroundColor: 'var(--accent-red)', height: `${(m.expense / maxBar) * 140}px`, minHeight: '2px', opacity: 0.85 }}
                  />
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{monthLabel(m.key, lang)}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--accent-green)' }} /> {t('دخل')}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--accent-red)' }} /> {t('مصاريف')}
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {catData.length > 0 && (
        <div className="card">
          <h2 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('المصاريف حسب الفئة (هذا الشهر)')}</h2>
          <div className="space-y-3">
            {catData.map((cat, i) => {
              const maxCat = catData[0]?.total ?? 1
              const pct = (cat.total / maxCat) * 100
              const colors = ['var(--accent-blue)', 'var(--accent-gold)', 'var(--accent-green)', 'var(--accent-red)', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16']
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: 'var(--text-primary)' }}>{t(cat.name)}</span>
                    <span data-sensitive style={{ color: 'var(--text-secondary)' }}>{fmt.iqd(cat.total)}</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-primary)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: '3px', backgroundColor: colors[i % colors.length] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {monthly.length === 0 && catData.length === 0 && (
        <div className="card text-center py-16" style={{ color: 'var(--text-secondary)' }}>
          <div className="text-5xl mb-4">📊</div>
          <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('لا توجد بيانات بعد')}</div>
          <p className="text-sm">{t('أضف بعض المعاملات لرؤية التحليلات')}</p>
        </div>
      )}
    </div>
  )
}
