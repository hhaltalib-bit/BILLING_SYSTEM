'use client'

import { useState, useEffect } from 'react'
import { getGoldPageData } from './actions'
import { GoldSummaryCard }      from '@/components/gold/GoldSummaryCard'
import { GoldPurchaseRow }      from '@/components/gold/GoldPurchaseRow'
import { AddGoldPurchaseModal } from '@/components/gold/AddGoldPurchaseModal'
import type { GoldPageData } from '@/types/gold'
import { Plus } from 'lucide-react'
import { useT } from '@/lib/i18n'

export default function GoldPage() {
  const t = useT()
  const [data,      setData]      = useState<GoldPageData | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading,   setLoading]   = useState(true)

  async function load() {
    try {
      const d = await getGoldPageData()
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-secondary)' }}>
      {t('جارٍ التحميل...')}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('محفظة الذهب')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('تتبع مشترياتك من الذهب')}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--accent-gold)', color: '#fff', fontWeight: 600, fontSize: '14px' }}
        >
          <Plus className="w-4 h-4" /> {t('إضافة شراء')}
        </button>
      </div>

      {/* Summary Card */}
      {data && data.purchases.length > 0 ? (
        <>
          <GoldSummaryCard data={data} onRefreshed={load} />

          {/* Purchases List */}
          <div className="card">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('سجل المشتريات')}
            </div>
            {data.purchases.map((p) => (
              <GoldPurchaseRow key={p.id} purchase={p} onDeleted={load} />
            ))}
          </div>
        </>
      ) : (
        <div className="card text-center py-16" style={{ color: 'var(--text-secondary)' }}>
          <div className="text-5xl mb-4">🥇</div>
          <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {t('لا توجد مشتريات ذهب')}
          </div>
          <p className="text-sm">{t('اضغط "إضافة شراء" لتسجيل أول عملية شراء')}</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddGoldPurchaseModal onClose={() => { setShowModal(false); load() }} />
      )}
    </div>
  )
}
