'use server'

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { todayISO, budgetMonthFor } from '@/lib/budgetMonth'
import { WALLET_META } from '@/lib/constants'
import type { WalletType } from '@/lib/types'
import type { SystemSettings, UserProfile } from '@/types/settings'

// Adapted to the Part 1 schema: system_settings.gold_local_premium
// (exposed to the UI as gold_local_premium_percent). The single row (id=1)
// is seeded by schema.sql and RLS only allows admins to UPDATE it, so we
// update rather than upsert (upsert would need an INSERT policy).

export async function getSettingsData() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, salary_iqd, role')
    .eq('id', user.id)
    .single()

  const { data: settings } = await supabase
    .from('system_settings')
    .select('usd_to_iqd, gold_local_premium')
    .eq('id', 1)
    .maybeSingle()

  return {
    profile: {
      full_name:  profile?.full_name  ?? '',
      salary_iqd: Number(profile?.salary_iqd ?? 0),
    } as UserProfile,
    settings: {
      usd_to_iqd:                 Number(settings?.usd_to_iqd         ?? 1310),
      gold_local_premium_percent: Number(settings?.gold_local_premium ?? 0),
    } as SystemSettings,
    isAdmin: profile?.role === 'admin',
    email: user.email ?? '',
  }
}

export async function updateProfile(input: { full_name: string | null; salary_iqd: number }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: input.full_name, salary_iqd: input.salary_iqd })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/dashboard')
}

export async function updateSystemSettings(input: SystemSettings) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('غير مصرح')

  const { data: updated, error } = await supabase
    .from('system_settings')
    .update({
      usd_to_iqd:         input.usd_to_iqd,
      gold_local_premium: input.gold_local_premium_percent,
      updated_at:         new Date().toISOString(),
      updated_by:         user.id,
    })
    .eq('id', 1)
    .select('id')

  if (error) throw new Error(error.message)
  if (!updated || updated.length === 0) throw new Error('لم يتم العثور على صف الإعدادات (id=1)')
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/gold')
  revalidatePath('/transactions')
  revalidatePath('/budget')
}

// ── Salary on the profile only — no income transaction, no wallet change ──
// Used by onboarding (initial setup is not a salary payment). Kept separate
// from updateProfile so it never overwrites full_name.
export async function setProfileSalary(salary_iqd: number) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (!Number.isFinite(salary_iqd) || salary_iqd < 0) throw new Error('مبلغ غير صالح')

  const { error } = await supabase
    .from('profiles')
    .update({ salary_iqd })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/dashboard')
}

// ── Salary only (used by the topbar "Add Salary" modal) ─────
// Separate from updateProfile so setting the salary never touches full_name.
//
// The salary funds the NEXT month when paid on/after SALARY_CUTOFF_DAY:
// paid 2026-11-27 → budget_month 2026-12-01 (December's salary).
// The duplicate guard is per budget month: "has December's salary already
// been recorded?", not "was a salary recorded in November?".
//
// One-click: called with no amount, it pays the salary saved in Settings
// (profiles.salary_iqd). Passing an amount first saves it as the new salary.
export type UpdateSalaryResult =
  | { success: true; budgetMonth: string; transactionId: string }
  | { alreadyPaid: true; budgetMonth: string }
  | { noSalarySet: true }

export async function updateSalary(amount?: number): Promise<UpdateSalaryResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (amount !== undefined) {
    if (!Number.isFinite(amount) || amount < 0) throw new Error('مبلغ غير صالح')
    const { error } = await supabase.from('profiles').update({ salary_iqd: amount }).eq('id', user.id)
    if (error) throw new Error(error.message)
  }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('salary_iqd')
    .eq('id', user.id)
    .single()
  if (profErr) throw new Error(profErr.message)

  const salary_iqd = Number(profile?.salary_iqd ?? 0)
  if (!(salary_iqd > 0)) return { noSalarySet: true }

  const today       = todayISO()                      // users' local day (Iraq)
  const budgetMonth = budgetMonthFor(today, true)     // YYYY-MM-01 of the month this salary funds

  const { data: existing, error: dupErr } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_salary', true)
    .eq('budget_month', budgetMonth)
    .limit(1)
  if (dupErr) throw new Error(dupErr.message)

  if (existing && existing.length > 0) {
    revalidatePath('/settings')
    revalidatePath('/dashboard')
    revalidatePath('/transactions')
    return { alreadyPaid: true, budgetMonth }
  }

  // Into the user's IQD wallet. wallets has no currency column — IQD wallets
  // are cash_iqd / savings_iqd; prefer cash_iqd.
  const { data: iqdWallets, error: wErr } = await supabase
    .from('wallets')
    .select('id, type')
    .eq('user_id', user.id)
    .in('type', ['cash_iqd', 'savings_iqd'])
    .order('created_at', { ascending: true })

  if (wErr) throw new Error(wErr.message)
  const wallet = iqdWallets?.find((w) => w.type === 'cash_iqd') ?? iqdWallets?.[0]
  if (!wallet) throw new Error('لا توجد محفظة بالدينار العراقي')

  const { data: inserted, error: txErr } = await supabase.from('transactions').insert({
    user_id:         user.id,
    type:            'income',
    amount:          salary_iqd,
    currency:        'IQD',
    wallet_to_id:    wallet.id,       // income flows INTO the wallet
    note:            'راتب شهري',
    date:            today,
    is_salary:       true,
    budget_month:    budgetMonth,
    // The DB trigger (migration 004) credits the wallet atomically.
    balance_applied: true,
  }).select('id').single()
  if (txErr) throw new Error(txErr.message)

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  return { success: true, budgetMonth, transactionId: (inserted as { id: string }).id }
}

// ── Wallet balances (initial setup / manual correction) ─────
// wallets has no name/currency columns — both are derived from `type`.

export interface SettingsWallet {
  id:       string
  type:     WalletType
  name:     string
  balance:  number
  currency: 'IQD' | 'USD'
}

const WALLET_ORDER: WalletType[] = ['cash_iqd', 'cash_usd', 'savings_iqd', 'savings_usd']

export async function getWallets(): Promise<SettingsWallet[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('wallets')
    .select('id, type, balance')
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  return ((data ?? []) as { id: string; type: WalletType; balance: number | string }[])
    .sort((a, b) => WALLET_ORDER.indexOf(a.type) - WALLET_ORDER.indexOf(b.type))
    .map((w) => ({
      id:       w.id,
      type:     w.type,
      name:     WALLET_META[w.type].label_ar,
      balance:  Number(w.balance),
      currency: WALLET_META[w.type].currency,
    }))
}

export async function updateWalletBalance(walletId: string, balance: number) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (!Number.isFinite(balance)) throw new Error('رصيد غير صالح')

  const { data: updated, error } = await supabase
    .from('wallets')
    .update({ balance })
    .eq('id', walletId)
    .eq('user_id', user.id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!updated || updated.length === 0) throw new Error('المحفظة غير موجودة')
  revalidatePath('/settings')
  revalidatePath('/dashboard')
}

// ── Danger zone: wipe the user's financial data ─────────────
// Keeps the account, profile name, wallets (balances → 0) and custom categories.
// Each step is checked so a failure stops the reset and is reported, rather
// than silently leaving the data half-deleted with a "success" message.
// Order: transactions first (they reference wallets/categories).
export async function resetUserData(): Promise<{ success: true; userId: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  for (const table of ['transactions', 'gold_purchases', 'budget_limits', 'savings_goals', 'recurring_expenses'] as const) {
    const { error } = await supabase.from(table).delete().eq('user_id', user.id)
    if (error) throw new Error(`${table}: ${error.message}`)
  }

  const { error: wErr } = await supabase.from('wallets').update({ balance: 0 }).eq('user_id', user.id)
  if (wErr) throw new Error(`wallets: ${wErr.message}`)

  const { error: pErr } = await supabase.from('profiles').update({ salary_iqd: 0 }).eq('id', user.id)
  if (pErr) throw new Error(`profiles: ${pErr.message}`)

  revalidatePath('/', 'layout')
  return { success: true, userId: user.id }
}
