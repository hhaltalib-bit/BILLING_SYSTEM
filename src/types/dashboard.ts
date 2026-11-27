export interface WalletSummary {
  id: string
  wallet_type: 'cash_iqd' | 'cash_usd' | 'savings_iqd' | 'savings_usd'
  balance: number
  currency: 'IQD' | 'USD'
  label: string
}

export interface GoldSummary {
  total_mithqal: number
  total_cost_iqd: number
  current_value_iqd: number
  profit_loss: number
  profit_loss_percent: number
  current_gold_price_iqd: number
}

export interface RecentTransaction {
  id: string
  amount: number
  currency: 'IQD' | 'USD'
  type: 'income' | 'expense' | 'transfer'
  description: string | null
  category_name: string | null
  category_color: string | null
  wallet_type: string
  /** transaction date (YYYY-MM-DD) */
  date: string
  created_at: string
}

/** Income / expense / net for a period, all converted to IQD. */
export interface PeriodTotals {
  income: number
  expense: number
  net: number
}

export interface MonthComparison {
  /** this month, day 1 → today */
  current: PeriodTotals
  /** last month, day 1 → same day-of-month (fair month-to-date comparison) */
  previous: PeriodTotals
}

export interface ForecastData {
  dailyRate: number
  projectedTotalSpend: number
  projectedBalance: number
  daysLeft: number
  /** day of the month on which the salary is used up at the current rate (null = no spending) */
  daysUntilBroke: number | null
  /** this budget month's salary: received (recorded for this budget_month) or expected (profile) */
  salary: number
  salarySource: 'received' | 'expected'
  /** YYYY-MM-01 of the budget month being forecast */
  budgetMonth: string
  totalSpentThisMonth: number
  daysPassed: number
  daysInMonth: number
}

export interface CategorySpend {
  /** Arabic category name as stored (UI translates it) */
  name: string
  total: number
}

export interface DashboardData {
  wallets: WalletSummary[]
  gold: GoldSummary | null
  recentTransactions: RecentTransaction[]
  netWorthIQD: number
  salaryAmount: number
  month: MonthComparison
  forecast: ForecastData
  /** this month's expenses by category, largest first */
  categorySpend: CategorySpend[]
}
