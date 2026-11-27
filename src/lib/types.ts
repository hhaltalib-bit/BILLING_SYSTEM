// ── Database row types ──────────────────────────────────────

export type WalletType = 'cash_iqd' | 'cash_usd' | 'savings_iqd' | 'savings_usd'
export type Currency   = 'IQD' | 'USD'
export type TxType     = 'income' | 'expense' | 'transfer'
export type UserRole   = 'admin' | 'user'
export type Frequency  = 'monthly' | 'yearly'

export interface Profile {
  id:          string
  username:    string
  full_name:   string | null
  occupation:  string | null
  role:        UserRole
  salary_iqd:  number
  created_at:  string
  updated_at:  string
}

export interface Wallet {
  id:         string
  user_id:    string
  type:       WalletType
  balance:    number
  created_at: string
  updated_at: string
}

export interface Category {
  id:         string
  user_id:    string | null
  name_ar:    string
  name_en:    string
  icon:       string
  is_default: boolean
  created_at: string
}

export interface Transaction {
  id:             string
  user_id:        string
  type:           TxType
  amount:         number
  currency:       Currency
  wallet_from_id: string | null
  wallet_to_id:   string | null
  category_id:    string | null
  note:           string | null
  exchange_rate:  number | null
  date:           string
  created_at:     string
  updated_at:     string
  // Joined fields (optional, from queries with select *)
  category?:      Category
  wallet_from?:   Wallet
  wallet_to?:     Wallet
}

export interface RecurringExpense {
  id:           string
  user_id:      string
  name:         string
  amount:       number
  currency:     Currency
  wallet_id:    string | null
  category_id:  string | null
  frequency:    Frequency
  day_of_month: number | null
  next_date:    string | null
  is_active:    boolean
  created_at:   string
  category?:    Category
}

export interface BudgetLimit {
  id:          string
  user_id:     string
  category_id: string
  amount_iqd:  number
  month:       number
  year:        number
  created_at:  string
  category?:   Category
}

export interface SavingsGoal {
  id:             string
  user_id:        string
  name:           string
  target_amount:  number
  currency:       Currency
  saved_amount:   number
  deadline:       string | null
  is_shared:      boolean
  shared_with_id: string | null
  is_completed:   boolean
  created_at:     string
  updated_at:     string
}

export interface GoldPurchase {
  id:                  string
  user_id:             string
  quantity_mithqal:    number
  purchase_price_iqd:  number
  total_paid_iqd:      number
  note:                string | null
  purchased_at:        string
  created_at:          string
}

export interface GoldPriceCache {
  id:         number
  xau_usd:    number
  fetched_at: string
}

export interface SystemSettings {
  id:                 number
  usd_to_iqd:         number
  gold_local_premium: number
  updated_at:         string
  updated_by:         string | null
}

export interface ActivityLog {
  id:          string
  user_id:     string
  action:      string
  entity_type: string | null
  entity_id:   string | null
  details:     Record<string, unknown> | null
  created_at:  string
}

export interface SharedWallet {
  id:          string
  owner_id:    string
  partner_id:  string
  wallet_type: Currency
  balance:     number
  name:        string | null
  created_at:  string
  updated_at:  string
}

// ── Computed / UI types ────────────────────────────────────

// Gold row with computed live values (calculated in component)
export interface GoldPurchaseWithLive extends GoldPurchase {
  current_price_iqd:   number  // current mithqal price in IQD
  current_value_iqd:   number  // quantity × current price
  profit_loss_iqd:     number  // current_value - total_paid
  profit_loss_percent: number  // (P&L / total_paid) × 100
}

// Summary of all gold holdings
export interface GoldSummary {
  total_mithqal:       number
  total_invested_iqd:  number
  total_value_iqd:     number
  total_profit_loss:   number
  profit_loss_percent: number
}

// App language setting
export type AppLang = 'ar' | 'en'

// Zustand store shape
export interface AppStore {
  theme:         'dark' | 'light'
  lang:          AppLang
  privacyMode:   boolean
  compactMode:   boolean
  salaryAmount:  number
  setTheme:      (t: 'dark' | 'light') => void
  setLang:       (l: AppLang) => void
  togglePrivacy: () => void
  toggleCompact: () => void
  setSalary:     (amount: number) => void
}
