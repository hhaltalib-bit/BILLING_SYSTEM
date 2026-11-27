'use server'

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'

// Activity feed = transactions + gold purchases, newest first by created_at
// (when the entry was recorded). The activity_log table exists in the schema
// but nothing writes to it, so the feed is built from the source tables.

export type ActivityKind = 'income' | 'expense' | 'transfer' | 'gold'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  /** note, else category name, else null (UI falls back to the kind label) */
  description: string | null
  category: string | null
  amount: number
  currency: 'IQD' | 'USD'
  /** gold only: quantity in mithqal */
  mithqal: number | null
  created_at: string
}

const LIMIT = 200

export async function getActivityFeed(): Promise<ActivityItem[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [txRes, goldRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, type, amount, currency, note, created_at, categories(name_ar)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(LIMIT),
    supabase
      .from('gold_purchases')
      .select('id, quantity_mithqal, total_paid_iqd, purchase_price_iqd, note, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(LIMIT),
  ])
  if (txRes.error) throw new Error(txRes.error.message)
  if (goldRes.error) throw new Error(goldRes.error.message)

  type TxRow = { id: string; type: 'income' | 'expense' | 'transfer'; amount: number | string; currency: 'IQD' | 'USD'; note: string | null; created_at: string; categories: { name_ar: string } | null }
  type GoldRow = { id: string; quantity_mithqal: number | string; total_paid_iqd: number | string | null; purchase_price_iqd: number | string; note: string | null; created_at: string }

  const tx: ActivityItem[] = ((txRes.data ?? []) as unknown as TxRow[]).map((r) => ({
    id:          r.id,
    kind:        r.type,
    description: r.note ?? r.categories?.name_ar ?? null,
    category:    r.categories?.name_ar ?? null,
    amount:      Number(r.amount),
    currency:    r.currency,
    mithqal:     null,
    created_at:  r.created_at,
  }))

  const gold: ActivityItem[] = ((goldRes.data ?? []) as GoldRow[]).map((r) => ({
    id:          r.id,
    kind:        'gold',
    description: r.note,
    category:    null,
    amount:      Number(r.total_paid_iqd ?? r.purchase_price_iqd),
    currency:    'IQD',
    mithqal:     Number(r.quantity_mithqal),
    created_at:  r.created_at,
  }))

  return [...tx, ...gold]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    .slice(0, LIMIT)
}
