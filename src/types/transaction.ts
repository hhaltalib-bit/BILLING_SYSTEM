export type TxType = 'income' | 'expense' | 'transfer'
export type Currency = 'IQD' | 'USD'

export interface Category {
  id: string
  name: string
  type: TxType | 'both'
}

export interface Transaction {
  id: string
  amount: number
  currency: Currency
  type: TxType
  note: string | null
  category_id: string | null
  category_name: string | null
  from_wallet_id: string | null
  to_wallet_id: string | null
  from_wallet_type: string | null
  to_wallet_type: string | null
  /** Transaction date (YYYY-MM-DD) — what the user sees and edits */
  date: string
  /** YYYY-MM-01 of the budget month this counts toward (migration 005) */
  budget_month: string
  /** salary payment (counts toward next month when paid on/after the 25th) */
  is_salary: boolean
  created_at: string
  /** true when this row's effect is included in wallet balances (migration 004) */
  balance_applied: boolean
}

export interface Wallet {
  id: string
  wallet_type: string
  balance: number
  currency: Currency
  label: string
}
