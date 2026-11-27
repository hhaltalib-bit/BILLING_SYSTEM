export interface BudgetLimit {
  id: string
  category_id: string
  category_name: string
  limit_amount: number
  currency: 'IQD' | 'USD'
  period: 'monthly' | 'weekly'
  spent: number
  percent: number
}

export interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  currency: 'IQD' | 'USD'
  deadline: string | null
  percent: number
  is_completed: boolean
}
