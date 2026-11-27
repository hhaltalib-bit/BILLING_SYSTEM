'use client'

import { useT } from '@/lib/i18n'

import { useFormatters } from '@/lib/useFormatters'
import type { RecentTransaction } from '@/types/dashboard'
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react'

interface Props { transactions: RecentTransaction[] }

const typeIcon = {
  income:   <ArrowDownLeft    className="w-4 h-4" />,
  expense:  <ArrowUpRight     className="w-4 h-4" />,
  transfer: <ArrowLeftRight   className="w-4 h-4" />,
}

const typeLabel = {
  income:   'دخل',
  expense:  'صرف',
  transfer: 'تحويل',
}

const typeColor = {
  income:   'var(--accent-green)',
  expense:  'var(--accent-red)',
  transfer: 'var(--accent-blue)',
}

export function RecentTransactions({ transactions }: Props) {
  const fmt = useFormatters()
  const t = useT()
  return (
    <div className="card col-span-full">
      <div className="text-sm mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
        {t('آخر المعاملات')}
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          {t('لا توجد معاملات بعد')}
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const formatted = tx.currency === 'IQD' ? fmt.iqd(tx.amount) : fmt.usd(tx.amount)
            const color     = typeColor[tx.type]
            const sign      = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: color + '22', color }}
                  >
                    {typeIcon[tx.type]}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t(tx.description ?? tx.category_name ?? typeLabel[tx.type])}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {fmt.date(tx.date)}
                      {tx.category_name && ` · ${t(tx.category_name)}`}
                    </div>
                  </div>
                </div>
                <div className="font-semibold text-sm" data-sensitive style={{ color }}>
                  {sign}{formatted}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
