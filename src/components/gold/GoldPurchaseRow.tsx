'use client'

import { useT } from '@/lib/i18n'

import { useTransition } from 'react'
import { deleteGoldPurchase } from '@/app/(dashboard)/gold/actions'
import { useFormatters } from '@/lib/useFormatters'
import { Trash2 } from 'lucide-react'
import type { GoldPurchase } from '@/types/gold'

interface Props { purchase: GoldPurchase; onDeleted?: () => void }

export function GoldPurchaseRow({ purchase, onDeleted }: Props) {
  const fmt = useFormatters()
  const t = useT()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(t('حذف هذه العملية؟'))) return
    startTransition(async () => {
      await deleteGoldPurchase(purchase.id)
      onDeleted?.()
    })
  }

  const pricePerMithqal = purchase.quantity_mithqal > 0
    ? purchase.purchase_price_iqd / purchase.quantity_mithqal
    : 0

  return (
    <div
      className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid var(--border-color)', opacity: isPending ? 0.5 : 1 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
          style={{ backgroundColor: 'var(--accent-gold)22' }}
        >
          🥇
        </div>
        <div>
          <div className="text-sm font-medium" data-sensitive style={{ color: 'var(--text-primary)' }}>
            {fmt.mithqal(purchase.quantity_mithqal)} {t('بـ')} {fmt.iqd(purchase.purchase_price_iqd)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {fmt.date(purchase.purchase_date)}
            {purchase.notes && ` · ${purchase.notes}`}
            {pricePerMithqal > 0 && (
              <span data-sensitive> · {fmt.iqd(pricePerMithqal)} / {t('مثقال')}</span>
            )}
          </div>
        </div>
      </div>
      <button aria-label={t('حذف')} title={t('حذف')}
        onClick={handleDelete}
        disabled={isPending}
        style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
