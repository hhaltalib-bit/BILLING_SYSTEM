'use server'

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { refreshGoldPriceCache } from '@/lib/gold-price'
import { revalidatePath } from 'next/cache'
import { calculateGoldPriceIQD } from '@/lib/utils'
import { DEFAULT_USD_TO_IQD, DEFAULT_GOLD_LOCAL_PREMIUM } from '@/lib/constants'
import type { GoldPageData, GoldPurchase } from '@/types/gold'

// Adapted to the Part 1 schema (supabase/schema.sql):
//   gold_purchases:   quantity_mithqal, purchase_price_iqd (per mithqal),
//                     total_paid_iqd (total), note, purchased_at
//   gold_price_cache: xau_usd, fetched_at (single row id=1)
//   system_settings:  usd_to_iqd, gold_local_premium
// The UI's `purchase_price_iqd` is the TOTAL price paid (see AddGoldPurchaseModal),
// so it maps to total_paid_iqd.

type PurchaseRow = {
  id: string
  quantity_mithqal: number | string
  total_paid_iqd: number | string
  purchased_at: string
  note: string | null
}

export async function getGoldPageData(): Promise<GoldPageData> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Purchases
  const { data: purchasesData } = await supabase
    .from('gold_purchases')
    .select('id, quantity_mithqal, total_paid_iqd, purchased_at, note')
    .eq('user_id', user.id)
    .order('purchased_at', { ascending: false })

  const purchases: GoldPurchase[] = ((purchasesData ?? []) as PurchaseRow[]).map((p) => ({
    id:                 p.id,
    quantity_mithqal:   Number(p.quantity_mithqal),
    purchase_price_iqd: Number(p.total_paid_iqd),
    purchase_date:      p.purchased_at,
    notes:              p.note ?? null,
  }))

  // Latest gold price from cache (single row)
  const { data: priceData } = await supabase
    .from('gold_price_cache')
    .select('xau_usd, fetched_at')
    .eq('id', 1)
    .maybeSingle()

  // System settings for exchange rate & premium
  const { data: settings } = await supabase
    .from('system_settings')
    .select('usd_to_iqd, gold_local_premium')
    .eq('id', 1)
    .maybeSingle()

  const usdToIqd      = Number(settings?.usd_to_iqd         ?? DEFAULT_USD_TO_IQD)
  const localPremium  = Number(settings?.gold_local_premium ?? DEFAULT_GOLD_LOCAL_PREMIUM)
  const priceUsdPerOz = Number(priceData?.xau_usd ?? 0)

  // calculateGoldPriceIQD returns price per mithqal in IQD
  const pricePerMithqal = priceUsdPerOz > 0
    ? calculateGoldPriceIQD(priceUsdPerOz, usdToIqd, localPremium)
    : 0

  const totalMithqal = purchases.reduce((s, p) => s + p.quantity_mithqal, 0)
  const totalCost    = purchases.reduce((s, p) => s + p.purchase_price_iqd, 0)
  const currentValue = totalMithqal * pricePerMithqal
  const profitLoss   = currentValue - totalCost
  const profitLossPct = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0

  return {
    purchases,
    total_mithqal:                 totalMithqal,
    total_cost_iqd:                totalCost,
    current_value_iqd:             currentValue,
    profit_loss:                   profitLoss,
    profit_loss_percent:           profitLossPct,
    current_price_per_mithqal_iqd: pricePerMithqal,
    last_price_update:             priceData?.fetched_at ?? null,
  }
}

export async function addGoldPurchase(input: {
  quantity_mithqal: number
  purchase_price_iqd: number   // total paid, IQD
  purchase_date: string        // YYYY-MM-DD
  notes?: string
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const perMithqal = Math.round((input.purchase_price_iqd / input.quantity_mithqal) * 100) / 100

  const { error } = await supabase.from('gold_purchases').insert({
    user_id:            user.id,
    quantity_mithqal:   input.quantity_mithqal,
    purchase_price_iqd: perMithqal,
    total_paid_iqd:     input.purchase_price_iqd,
    purchased_at:       input.purchase_date,
    note:               input.notes ?? null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/gold')
  revalidatePath('/dashboard')
}

export async function deleteGoldPurchase(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('gold_purchases')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/gold')
  revalidatePath('/dashboard')
}

export async function refreshGoldPrice() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Same logic as GET /api/gold-price, called directly (no HTTP round-trip,
  // so no app URL or auth cookies needed). Re-fetches if the cache is >1h old.
  try {
    await refreshGoldPriceCache({ maxAgeHours: 1 })
  } catch (err) {
    throw new Error(`فشل تحديث سعر الذهب: ${err instanceof Error ? err.message : String(err)}`)
  }
  revalidatePath('/gold')
  revalidatePath('/dashboard')
}
