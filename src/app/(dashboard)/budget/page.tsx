'use client'

import { useState, useEffect } from 'react'
import { getBudgetPageData } from './actions'
import { BudgetCard }           from '@/components/budget/BudgetCard'
import { SavingsGoalCard }      from '@/components/budget/SavingsGoalCard'
import { AddBudgetModal }       from '@/components/budget/AddBudgetModal'
import { AddSavingsGoalModal }  from '@/components/budget/AddSavingsGoalModal'
import type { BudgetLimit, SavingsGoal } from '@/types/budget'
import { Plus } from 'lucide-react'
import { useT } from '@/lib/i18n'

type Modal = 'budget' | 'savings' | null

export default function BudgetPage() {
  const t = useT()
  const [budgets,  setBudgets]  = useState<BudgetLimit[]>([])
  const [goals,    setGoals]    = useState<SavingsGoal[]>([])
  const [cats,     setCats]     = useState<{ id: string; name: string }[]>([])
  const [modal,    setModal]    = useState<Modal>(null)
  const [loading,  setLoading]  = useState(true)

  async function load() {
    try {
      const data = await getBudgetPageData()
      setBudgets(data.budgetLimits)
      setGoals(data.savingsGoals)
      setCats(data.categories)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const btnStyle = (color = 'var(--accent-blue)'): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '9px 16px', borderRadius: '10px', border: 'none',
    cursor: 'pointer', backgroundColor: color, color: '#fff',
    fontWeight: 600, fontSize: '13px',
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-secondary)' }}>
      {t('جارٍ التحميل...')}
    </div>
  )

  return (
    <div className="space-y-8">

      {/* ── Budget Limits ─────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('حدود الميزانية')}</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('إنفاقك الشهري مقابل الحدود المحددة')}</p>
          </div>
          <button style={btnStyle()} onClick={() => setModal('budget')}>
            <Plus className="w-4 h-4" /> {t('إضافة حد')}
          </button>
        </div>

        {budgets.length === 0 ? (
          <div className="card text-center py-10" style={{ color: 'var(--text-secondary)' }}>
            {t('لا توجد حدود ميزانية — اضغط "إضافة حد" للبدء')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {budgets.map((b) => (
              <BudgetCard key={b.id} budget={b} onChanged={load} />
            ))}
          </div>
        )}
      </section>

      {/* ── Savings Goals ─────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('الأهداف الادخارية')}</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('تتبع تقدمك نحو أهدافك المالية')}</p>
          </div>
          <button style={btnStyle('var(--accent-gold)')} onClick={() => setModal('savings')}>
            <Plus className="w-4 h-4" /> {t('إضافة هدف')}
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="card text-center py-10" style={{ color: 'var(--text-secondary)' }}>
            {t('لا توجد أهداف ادخارية — اضغط "إضافة هدف" للبدء')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map((g) => (
              <SavingsGoalCard key={g.id} goal={g} onChanged={load} />
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {modal === 'budget' && (
        <AddBudgetModal categories={cats} onClose={() => { setModal(null); load() }} />
      )}
      {modal === 'savings' && (
        <AddSavingsGoalModal onClose={() => { setModal(null); load() }} />
      )}
    </div>
  )
}
