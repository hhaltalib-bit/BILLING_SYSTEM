'use client'

import { forwardRef } from 'react'
import { useT } from '@/lib/i18n'
import { useFormatters } from '@/lib/useFormatters'
import { WALLET_META } from '@/lib/constants'
import type { WalletType } from '@/lib/types'
import type { Transaction } from '@/types/transaction'
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Pencil, Trash2 } from 'lucide-react'

interface Props {
  tx: Transaction
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
  highlighted?: boolean
}

const typeIcon = {
  income:   <ArrowDownLeft  className="w-4 h-4" />,
  expense:  <ArrowUpRight   className="w-4 h-4" />,
  transfer: <ArrowLeftRight className="w-4 h-4" />,
}
const typeColor = {
  income:   'var(--accent-green)',
  expense:  'var(--accent-red)',
  transfer: 'var(--accent-blue)',
}
const typeLabel = {
  income:   'دخل',
  expense:  'صرف',
  transfer: 'تحويل',
}

const actionBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '32px', height: '32px', borderRadius: '8px',
  background: 'none', cursor: 'pointer',
}

export const TransactionRow = forwardRef<HTMLDivElement, Props>(function TransactionRow(
  { tx, onEdit, onDelete, highlighted = false }, ref,
) {
  const fmt = useFormatters()
  const t = useT()

  const color = typeColor[tx.type]
  const sign  = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''
  const walletName = (type: string | null) =>
    type && type in WALLET_META ? t(WALLET_META[type as WalletType].label_ar) : (type ?? '')

  return (
    <div
      ref={ref}
      className="flex items-center justify-between py-3"
      style={{
        borderBottom: '1px solid var(--border-color)',
        gap: '12px',
        borderRadius: highlighted ? '8px' : undefined,
        outline: highlighted ? '2px solid var(--accent-blue)' : undefined,
        backgroundColor: highlighted ? 'var(--bg-primary)' : undefined,
        paddingInline: highlighted ? '8px' : undefined,
        transition: 'background-color 0.3s, outline-color 0.3s',
      }}
    >
      <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '22', color }}
        >
          {typeIcon[tx.type]}
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>
            {t(tx.note ?? tx.category_name ?? typeLabel[tx.type])}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {fmt.date(tx.date)}
            {tx.category_name && ` · ${t(tx.category_name)}`}
            {tx.is_salary && ` · ${t('راتب شهر')} ${fmt.month(tx.budget_month)}`}
            {tx.type === 'transfer' && tx.from_wallet_type && tx.to_wallet_type &&
              ` · ${walletName(tx.from_wallet_type)} → ${walletName(tx.to_wallet_type)}`}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="font-semibold text-sm" data-sensitive style={{ color, marginInlineEnd: '8px', whiteSpace: 'nowrap' }}>
          {sign}{fmt.money(tx.amount, tx.currency)}
        </div>
        <button
          type="button"
          onClick={() => onEdit(tx)}
          title={t('تعديل')}
          aria-label={t('تعديل')}
          style={{ ...actionBtn, border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(tx)}
          title={t('حذف')}
          aria-label={t('حذف')}
          style={{ ...actionBtn, border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
})
