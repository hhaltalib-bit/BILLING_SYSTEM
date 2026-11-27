'use server'

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { todayISO, monthStartOf, addMonths } from '@/lib/budgetMonth'
import { DEFAULT_USD_TO_IQD } from '@/lib/constants'

export async function getAnalyticsData() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: settings } = await supabase
    .from('system_settings')
    .select('usd_to_iqd')
    .eq('id', 1)
    .maybeSingle()
  const usdToIqd = Number(settings?.usd_to_iqd ?? DEFAULT_USD_TO_IQD)

  // Last 6 budget months, including the current one. Grouped by
  // transactions.budget_month: a salary paid on Nov 27 counts in December,
  // and next month's salary (already received) is not shown until it starts.
  const thisMonthStart = monthStartOf(todayISO())
  const sixMonthsAgo   = addMonths(thisMonthStart, -5)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, type, amount, currency, date, budget_month, category_id, categories(name_ar)')
    .eq('user_id', user.id)
    .gte('budget_month', sixMonthsAgo)
    .lte('budget_month', thisMonthStart)
    .order('budget_month', { ascending: true })

  type TxRow = { id: string; type: string; amount: number | string; currency: string; date: string; budget_month: string; category_id: string | null; categories: { name_ar: string } | null }
  const txs = (transactions ?? []) as unknown as TxRow[]

  // Monthly totals (income vs expense)
  const monthlyMap: Record<string, { income: number; expense: number; label: string; key: string }> = {}
  txs.forEach((tx) => {
    // budget_month is a plain DATE (YYYY-MM-01) — parse its parts, not as UTC midnight
    const [y, m] = tx.budget_month.split('-').map(Number)
    const key = `${y}-${String(m).padStart(2, '0')}`
    const label = new Date(y, m - 1, 1).toLocaleDateString('ar-IQ', { month: 'short', year: '2-digit' })
    if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expense: 0, label, key }
    const amt = tx.currency === 'USD' ? Number(tx.amount) * usdToIqd : Number(tx.amount)
    if (tx.type === 'income')  monthlyMap[key].income  += amt
    if (tx.type === 'expense') monthlyMap[key].expense += amt
  })
  const monthly = Object.values(monthlyMap)

  // Category breakdown (expenses only, this budget month)
  const categoryMap: Record<string, { name: string; total: number }> = {}
  txs
    .filter((tx) => tx.type === 'expense' && tx.budget_month === thisMonthStart)
    .forEach((tx) => {
      const catName = tx.categories?.name_ar ?? 'أخرى'
      if (!categoryMap[catName]) categoryMap[catName] = { name: catName, total: 0 }
      const amt = tx.currency === 'USD' ? Number(tx.amount) * usdToIqd : Number(tx.amount)
      categoryMap[catName].total += amt
    })
  const categoryBreakdown = Object.values(categoryMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // Totals
  const totalIncome  = txs.filter((t) => t.type === 'income').reduce((s, t) => s + (t.currency === 'USD' ? Number(t.amount) * usdToIqd : Number(t.amount)), 0)
  const totalExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.currency === 'USD' ? Number(t.amount) * usdToIqd : Number(t.amount)), 0)

  return { monthly, categoryBreakdown, totalIncome, totalExpense, usdToIqd }
}
