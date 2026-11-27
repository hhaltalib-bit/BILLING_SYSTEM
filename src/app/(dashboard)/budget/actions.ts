'use server'

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { todayISO, monthStartOf } from '@/lib/budgetMonth'
import { DEFAULT_USD_TO_IQD } from '@/lib/constants'
import type { BudgetLimit, SavingsGoal } from '@/types/budget'

// Adapted to the Part 1 schema (supabase/schema.sql):
//   budget_limits: amount_iqd + month + year  (monthly caps, stored in IQD,
//                  UNIQUE per user/category/month/year)
//   savings_goals: saved_amount
//   categories:    global defaults (user_id IS NULL) + user's own

type SupabaseServer = Awaited<ReturnType<typeof createServerSupabaseClient>>

async function getUsdToIqd(supabase: SupabaseServer): Promise<number> {
  const { data } = await supabase
    .from('system_settings')
    .select('usd_to_iqd')
    .eq('id', 1)
    .maybeSingle()
  return Number(data?.usd_to_iqd ?? DEFAULT_USD_TO_IQD)
}

// Current budget month in the users' local calendar (Iraq)
function currentMonth() {
  const start = monthStartOf(todayISO())          // YYYY-MM-01
  const [year, month] = start.split('-').map(Number)
  return { month, year, start }
}

// ── Fetch ────────────────────────────────────────────────────

export async function getBudgetPageData() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const usdToIqd = await getUsdToIqd(supabase)
  const { month, year, start } = currentMonth()

  // Budget limits for the current month, with category name
  const { data: limitsData } = await supabase
    .from('budget_limits')
    .select('id, amount_iqd, category_id, categories(name_ar)')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)

  // Current budget month spending per category (transactions.budget_month), in IQD
  const { data: spendData } = await supabase
    .from('transactions')
    .select('category_id, amount, currency')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .eq('budget_month', start)

  // Build spending map
  const spendMap: Record<string, number> = {}
  for (const tx of (spendData ?? []) as { category_id: string | null; amount: number | string; currency: 'IQD' | 'USD' }[]) {
    if (!tx.category_id) continue
    const iqd = tx.currency === 'USD' ? Number(tx.amount) * usdToIqd : Number(tx.amount)
    spendMap[tx.category_id] = (spendMap[tx.category_id] ?? 0) + iqd
  }

  type LimitRow = { id: string; amount_iqd: number | string; category_id: string; categories: { name_ar: string } | null }
  const budgetLimits: BudgetLimit[] = ((limitsData ?? []) as unknown as LimitRow[]).map((l) => {
    const limit   = Number(l.amount_iqd)
    const spent   = spendMap[l.category_id] ?? 0
    const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
    return {
      id:            l.id,
      category_id:   l.category_id,
      category_name: l.categories?.name_ar ?? l.category_id,
      limit_amount:  limit,
      currency:      'IQD',
      period:        'monthly',
      spent,
      percent,
    }
  })

  // Savings goals
  const { data: goalsData } = await supabase
    .from('savings_goals')
    .select('id, name, target_amount, saved_amount, currency, deadline, is_completed')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  type GoalRow = {
    id: string; name: string; target_amount: number | string; saved_amount: number | string | null
    currency: 'IQD' | 'USD'; deadline: string | null; is_completed: boolean | null
  }
  const savingsGoals: SavingsGoal[] = ((goalsData ?? []) as GoalRow[]).map((g) => {
    const target = Number(g.target_amount)
    const saved  = Number(g.saved_amount ?? 0)
    return {
      id:             g.id,
      name:           g.name,
      target_amount:  target,
      current_amount: saved,
      currency:       g.currency,
      deadline:       g.deadline ?? null,
      percent:        target > 0 ? Math.min((saved / target) * 100, 100) : 0,
      is_completed:   g.is_completed ?? false,
    }
  })

  // Categories for budget form (defaults + user's own)
  const { data: catsData } = await supabase
    .from('categories')
    .select('id, name_ar')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('name_ar')

  const categories = ((catsData ?? []) as { id: string; name_ar: string }[]).map((c) => ({ id: c.id, name: c.name_ar }))

  return { budgetLimits, savingsGoals, categories }
}

// ── Add Budget Limit ─────────────────────────────────────────

export async function addBudgetLimit(input: {
  category_id: string
  limit_amount: number
  currency: 'IQD' | 'USD'
  period: 'monthly' | 'weekly'
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (input.period !== 'monthly') throw new Error('الميزانية الأسبوعية غير مدعومة حالياً')

  const usdToIqd   = await getUsdToIqd(supabase)
  const amountIqd  = input.currency === 'USD' ? input.limit_amount * usdToIqd : input.limit_amount
  const { month, year } = currentMonth()

  const { error } = await supabase.from('budget_limits').insert({
    user_id:     user.id,
    category_id: input.category_id,
    amount_iqd:  Math.round(amountIqd * 100) / 100,
    month,
    year,
  })

  if (error) {
    if (error.code === '23505') throw new Error('يوجد حد لهذه الفئة في هذا الشهر بالفعل')
    throw new Error(error.message)
  }
  revalidatePath('/budget')
}

// ── Delete Budget Limit ───────────────────────────────────────

export async function deleteBudgetLimit(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('budget_limits').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/budget')
}

// ── Add Savings Goal ─────────────────────────────────────────

export async function addSavingsGoal(input: {
  name: string
  target_amount: number
  currency: 'IQD' | 'USD'
  deadline?: string
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('savings_goals').insert({
    user_id:       user.id,
    name:          input.name,
    target_amount: input.target_amount,
    currency:      input.currency,
    deadline:      input.deadline ?? null,
    saved_amount:  0,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/budget')
}

// ── Add to Savings Goal ───────────────────────────────────────

export async function addToSavingsGoal(id: string, amount: number) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: goal } = await supabase
    .from('savings_goals')
    .select('saved_amount, target_amount')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!goal) throw new Error('Goal not found')

  const newAmount    = Number(goal.saved_amount ?? 0) + amount
  const is_completed = newAmount >= Number(goal.target_amount)

  const { error } = await supabase
    .from('savings_goals')
    .update({ saved_amount: newAmount, is_completed })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/budget')
}

// ── Delete Savings Goal ───────────────────────────────────────

export async function deleteSavingsGoal(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('savings_goals').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/budget')
}
