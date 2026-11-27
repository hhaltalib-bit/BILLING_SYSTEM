export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurringTransaction {
  id: string
  name: string
  amount: number
  currency: string
  frequency: RecurringFrequency
  next_due_date: string
  category_id: string | null
  wallet_id: string | null
  notes: string | null
}
