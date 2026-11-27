export interface GoldPurchase {
  id: string
  quantity_mithqal: number
  purchase_price_iqd: number
  purchase_date: string
  notes: string | null
}

export interface GoldPageData {
  purchases: GoldPurchase[]
  total_mithqal: number
  total_cost_iqd: number
  current_value_iqd: number
  profit_loss: number
  profit_loss_percent: number
  current_price_per_mithqal_iqd: number
  last_price_update: string | null
}
