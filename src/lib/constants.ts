import type { WalletType } from './types'

// Wallet display metadata
export const WALLET_META: Record<WalletType, { label_ar: string; label_en: string; currency: 'IQD' | 'USD'; color: string }> = {
  cash_iqd:    { label_ar: 'النقد (د.ع)',   label_en: 'Cash IQD',    currency: 'IQD', color: '#3b82f6' },
  cash_usd:    { label_ar: 'النقد ($)',      label_en: 'Cash USD',    currency: 'USD', color: '#10b981' },
  savings_iqd: { label_ar: 'المدخرات (د.ع)', label_en: 'Savings IQD', currency: 'IQD', color: '#8b5cf6' },
  savings_usd: { label_ar: 'المدخرات ($)',   label_en: 'Savings USD', currency: 'USD', color: '#f59e0b' },
}

// App navigation routes
export const ROUTES = {
  login:        '/login',
  dashboard:    '/dashboard',
  transactions: '/transactions',
  analytics:    '/analytics',
  budget:       '/budget',
  goals:        '/goals',
  recurring:    '/recurring',
  gold:         '/gold',
  activity:     '/activity',
  settings:     '/settings',
  admin:        '/admin',
} as const

// Gold constants
export const GOLD_TROY_OZ_TO_GRAMS = 31.1035
export const GOLD_MITHQAL_TO_GRAMS = 4.68

// Default system values
export const DEFAULT_USD_TO_IQD         = 1310
export const DEFAULT_GOLD_LOCAL_PREMIUM = 21.0
