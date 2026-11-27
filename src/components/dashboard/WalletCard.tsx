'use client'

import { useT } from '@/lib/i18n'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

import { useAppStore } from '@/store/useAppStore'
import { useFormatters } from '@/lib/useFormatters'
import type { WalletSummary } from '@/types/dashboard'
import { Banknote, PiggyBank } from 'lucide-react'

interface Props { wallet: WalletSummary }

const walletIcons: Record<string, React.ReactNode> = {
  cash_iqd:    <Banknote  className="w-6 h-6" />,
  cash_usd:    <Banknote  className="w-6 h-6" />,
  savings_iqd: <PiggyBank className="w-6 h-6" />,
  savings_usd: <PiggyBank className="w-6 h-6" />,
}

const walletTips: Record<string, string> = {
  cash_iqd: 'إجمالي النقد المتاح بالدينار العراقي. يتحدث تلقائياً عند كل حركة دخل أو مصروف أو تحويل.',
  cash_usd: 'إجمالي النقد المتاح بالدولار الأمريكي. يُحوّل للدينار بسعر الصرف الحالي في صافي الثروة.',
  savings_iqd: 'مبالغ تضعها جانباً للادخار بالدينار. لا تُحتسب كمصروف يومي.',
  savings_usd: 'مدخرات بالدولار. مفيدة للحفاظ على القيمة ضد تقلبات الصرف.',
}

const walletColors: Record<string, string> = {
  cash_iqd:    'var(--accent-blue)',
  cash_usd:    'var(--accent-green)',
  savings_iqd: 'var(--accent-blue)',
  savings_usd: 'var(--accent-green)',
}

export function WalletCard({ wallet }: Props) {
  const fmt = useFormatters()
  const t = useT()
  // read privacyMode — data-sensitive blur is applied via CSS globally
  useAppStore((s) => s.privacyMode)

  const formatted =
    wallet.currency === 'IQD' ? fmt.iqd(wallet.balance) : fmt.usd(wallet.balance)
  const color = walletColors[wallet.wallet_type] ?? 'var(--accent-blue)'

  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t(wallet.label)}
        </span>
        <span className="flex items-center gap-2">
          <span style={{ color }}>{walletIcons[wallet.wallet_type]}</span>
          {walletTips[wallet.wallet_type] && <InfoTooltip text={walletTips[wallet.wallet_type]} />}
        </span>
      </div>
      <div className="text-2xl font-bold" data-sensitive style={{ color: 'var(--text-primary)' }}>
        {formatted}
      </div>
      <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
        {wallet.currency === 'IQD' ? t('دينار عراقي') : t('دولار أمريكي')}
      </div>
    </div>
  )
}
