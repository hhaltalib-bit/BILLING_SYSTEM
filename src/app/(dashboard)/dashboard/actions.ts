'use server'

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { calculateGoldPriceIQD } from '@/lib/utils'
import { WALLET_META, DEFAULT_USD_TO_IQD, DEFAULT_GOLD_LOCAL_PREMIUM } from '@/lib/constants'
import type { WalletType, Currency, TxType } from '@/lib/types'
import { todayISO, monthStartOf, addMonths } from '@/lib/budgetMonth'
import type { DashboardData, WalletSummary, GoldSummary, RecentTransaction, PeriodTotals, CategorySpend } from '@/types/dashboard'

// Adapted to the Part 1 schema (supabase/schema.sql):
//   wallets.type (no currency column — derived from WALLET_META)
//   gold_purchases.quantity_mithqal / total_paid_iqd
//   gold_price_cache.xau_usd + system_settings → per-mithqal IQD price
//   transactions.note, categories.name_ar, profiles.salary_iqd

const WALLET_ORDER: WalletType[] = ['cash_iqd', 'cash_usd', 'savings_iqd', 'savings_usd']

interface TxRow {
  id:          string
  amount:      number | string
  currency:    Currency
  type:        TxType
  note:        string | null
  created_at:  string
  date:        string | null
  category:    { name_ar: string } | null
  wallet_from: { type: WalletType } | null
  wallet_to:   { type: WalletType } | null
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // ── System settings (exchange rate + gold premium) ───────
  const { data: settings } = await supabase
    .from('system_settings')
    .select('usd_to_iqd, gold_local_premium')
    .eq('id', 1)
    .maybeSingle()

  const usdToIqd      = Number(settings?.usd_to_iqd ?? DEFAULT_USD_TO_IQD)
  const goldPremium   = Number(settings?.gold_local_premium ?? DEFAULT_GOLD_LOCAL_PREMIUM)

  // ── Wallets ──────────────────────────────────────────────
  const { data: walletsData } = await supabase
    .from('wallets')
    .select('id, type, balance')
    .eq('user_id', user.id)

  const walletLabels: Record<WalletType, string> = {
    cash_iqd:    'النقد الديناري',
    cash_usd:    'النقد الدولاري',
    savings_iqd: 'الادخار بالدينار',
    savings_usd: 'الادخار بالدولار',
  }

  const wallets: WalletSummary[] = (walletsData ?? [])
    .map((w: { id: string; type: WalletType; balance: number | string }) => ({
      id:          w.id,
      wallet_type: w.type,
      balance:     Number(w.balance),
      currency:    WALLET_META[w.type].currency,
      label:       walletLabels[w.type] ?? w.type,
    }))
    .sort((a, b) => WALLET_ORDER.indexOf(a.wallet_type) - WALLET_ORDER.indexOf(b.wallet_type))

  // Net worth: convert USD wallets to IQD then sum
  const netWorthIQD = wallets.reduce((sum, w) => {
    return sum + (w.currency === 'IQD' ? w.balance : w.balance * usdToIqd)
  }, 0)

  // ── Gold ─────────────────────────────────────────────────
  const { data: goldData } = await supabase
    .from('gold_purchases')
    .select('quantity_mithqal, total_paid_iqd')
    .eq('user_id', user.id)

  const { data: goldPriceData } = await supabase
    .from('gold_price_cache')
    .select('xau_usd')
    .eq('id', 1)
    .maybeSingle()

  let gold: GoldSummary | null = null
  if (goldData && goldData.length > 0) {
    const rows = goldData as { quantity_mithqal: number | string; total_paid_iqd: number | string }[]
    const totalMithqal  = rows.reduce((s, g) => s + Number(g.quantity_mithqal), 0)
    const totalCost     = rows.reduce((s, g) => s + Number(g.total_paid_iqd), 0)
    const xauUsd        = Number(goldPriceData?.xau_usd ?? 0)
    const currentPrice  = xauUsd > 0 ? calculateGoldPriceIQD(xauUsd, usdToIqd, goldPremium) : 0
    const currentValue  = totalMithqal * currentPrice
    const profitLoss    = currentValue - totalCost
    const profitLossPct = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0

    gold = {
      total_mithqal:          totalMithqal,
      total_cost_iqd:         totalCost,
      current_value_iqd:      currentValue,
      profit_loss:            profitLoss,
      profit_loss_percent:    profitLossPct,
      current_gold_price_iqd: currentPrice,
    }
  }

  // ── Recent Transactions ───────────────────────────────────
  // transactions has two FKs to wallets, so each join names its constraint.
  const { data: txData } = await supabase
    .from('transactions')
    .select(`
      id, amount, currency, type, note, date, created_at,
      category:categories(name_ar),
      wallet_from:wallets!transactions_wallet_from_id_fkey(type),
      wallet_to:wallets!transactions_wallet_to_id_fkey(type)
    `)
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  const recentTransactions: RecentTransaction[] = ((txData ?? []) as unknown as TxRow[]).map((tx) => ({
    id:             tx.id,
    amount:         Number(tx.amount),
    currency:       tx.currency,
    type:           tx.type,
    description:    tx.note,
    category_name:  tx.category?.name_ar ?? null,
    category_color: null, // categories table has no color column
    wallet_type:    tx.wallet_from?.type ?? tx.wallet_to?.type ?? '',
    created_at:     tx.created_at,
    date:           tx.date ?? tx.created_at.slice(0, 10),
  }))

  // ── Profile (salary) ──────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('salary_iqd')
    .eq('id', user.id)
    .single()

  const salaryAmount = Number(profile?.salary_iqd ?? 0)

  // ── This month vs last month, forecast, category insight ──
  // Grouped by transactions.budget_month (migration 005), not by date: a salary
  // paid on Nov 27 belongs to December's budget, so it is NOT November income.
  // Day counts use the users' local calendar day (Iraq); amounts are in IQD.
  const today = todayISO()
  const [y, m, d] = today.split('-').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const daysInMonth     = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const thisMonthStart  = monthStartOf(today)
  const prevMonthStart  = addMonths(thisMonthStart, -1)
  const [prevY, prevM]  = prevMonthStart.split('-').map(Number)
  const daysInPrevMonth = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate()
  // Month-to-date comparison: last month's budget up to the same day-of-month.
  // (Its salary, dated in the month before, has an earlier date and is included.)
  const prevSameDay     = `${prevY}-${pad(prevM)}-${pad(Math.min(d, daysInPrevMonth))}`

  type MonthTxRow = { amount: number | string; currency: Currency; type: TxType; date: string; budget_month: string; is_salary: boolean; category: { name_ar: string } | null }
  const { data: monthTxData, error: monthErr } = await supabase
    .from('transactions')
    .select('amount, currency, type, date, budget_month, is_salary, category:categories(name_ar)')
    .eq('user_id', user.id)
    .in('type', ['income', 'expense'])
    .in('budget_month', [prevMonthStart, thisMonthStart])
  if (monthErr) throw new Error(monthErr.message)
  const monthTx = (monthTxData ?? []) as unknown as MonthTxRow[]

  const toIqd = (tx: MonthTxRow) => (tx.currency === 'USD' ? Number(tx.amount) * usdToIqd : Number(tx.amount))
  const totals = (rows: MonthTxRow[]): PeriodTotals => {
    const income  = rows.filter((t) => t.type === 'income').reduce((s, t) => s + toIqd(t), 0)
    const expense = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + toIqd(t), 0)
    return { income, expense, net: income - expense }
  }
  const thisMonthRows = monthTx.filter((t) => t.budget_month === thisMonthStart)
  const prevMonthRows = monthTx.filter((t) => t.budget_month === prevMonthStart && t.date <= prevSameDay)
  const current  = totals(thisMonthRows)
  const previous = totals(prevMonthRows)

  // Forecast: spending pace this month projected to month end, against THIS
  // budget month's salary — the one actually received for it if recorded,
  // otherwise the expected salary from the profile. A salary already paid for
  // next month (on/after the 25th) does not count here.
  const salaryReceived = thisMonthRows.filter((t) => t.is_salary && t.type === 'income').reduce((s, t) => s + toIqd(t), 0)
  const forecastSalary = salaryReceived > 0 ? salaryReceived : salaryAmount
  const daysPassed          = d
  const totalSpentThisMonth = current.expense
  const dailyRate           = daysPassed > 0 ? totalSpentThisMonth / daysPassed : 0
  const projectedTotalSpend = dailyRate * daysInMonth

  // Category insight (this month's expenses)
  const byCategory: Record<string, number> = {}
  for (const tx of thisMonthRows) {
    if (tx.type !== 'expense') continue
    const name = tx.category?.name_ar ?? 'أخرى'
    byCategory[name] = (byCategory[name] ?? 0) + toIqd(tx)
  }
  const categorySpend: CategorySpend[] = Object.entries(byCategory)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)

  return {
    wallets,
    gold,
    recentTransactions,
    netWorthIQD,
    salaryAmount,
    month: { current, previous },
    forecast: {
      dailyRate,
      projectedTotalSpend,
      projectedBalance: forecastSalary - projectedTotalSpend,
      daysLeft:         daysInMonth - daysPassed,
      daysUntilBroke:   dailyRate > 0 ? Math.floor(forecastSalary / dailyRate) : null,
      salary:           forecastSalary,
      salarySource:     salaryReceived > 0 ? 'received' : 'expected',
      budgetMonth:      thisMonthStart,
      totalSpentThisMonth,
      daysPassed,
      daysInMonth,
    },
    categorySpend,
  }
}
