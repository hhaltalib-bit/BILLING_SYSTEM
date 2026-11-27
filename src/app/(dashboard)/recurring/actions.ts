'use server'

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RecurringTransaction, RecurringFrequency } from '@/types/recurring'

// Backed by the existing `recurring_expenses` table from schema.sql
// (next_date / note), extended by supabase/migrations/003_recurring_transactions.sql.

const FREQUENCIES: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly']

type Row = {
  id: string; name: string; amount: number | string; currency: string; frequency: string
  next_date: string | null; category_id: string | null; wallet_id: string | null; note: string | null
}

export async function getRecurringTransactions(): Promise<{ items: RecurringTransaction[]; needsMigration: boolean }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('id, name, amount, currency, frequency, next_date, category_id, wallet_id, note')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('next_date', { ascending: true })

  if (error) {
    // 42703 = undefined column (`note`) → migration 003 not applied yet
    if (error.code === '42703') return { items: [], needsMigration: true }
    throw new Error(error.message)
  }

  const items = ((data ?? []) as Row[]).map((r) => ({
    id:            r.id,
    name:          r.name,
    amount:        Number(r.amount),
    currency:      r.currency ?? 'IQD',
    frequency:     r.frequency as RecurringFrequency,
    next_due_date: r.next_date ?? '',
    category_id:   r.category_id ?? null,
    wallet_id:     r.wallet_id ?? null,
    notes:         r.note ?? null,
  }))
  return { items, needsMigration: false }
}

export async function addRecurringTransaction(input: {
  name: string
  amount: number
  currency: string
  frequency: RecurringFrequency
  next_due_date: string
  notes?: string
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (!input.name.trim())                         throw new Error('أدخل اسم الدفعة')
  if (!(input.amount > 0))                        throw new Error('أدخل المبلغ')
  if (input.currency !== 'IQD' && input.currency !== 'USD') throw new Error('عملة غير صالحة')
  if (!FREQUENCIES.includes(input.frequency))     throw new Error('تكرار غير صالح')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.next_due_date)) throw new Error('تاريخ غير صالح')

  const { error } = await supabase.from('recurring_expenses').insert({
    user_id:      user.id,
    name:         input.name.trim(),
    amount:       input.amount,
    currency:     input.currency,
    frequency:    input.frequency,
    next_date:    input.next_due_date,
    day_of_month: Number(input.next_due_date.slice(8, 10)),
    note:         input.notes ?? null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/recurring')
}

export async function deleteRecurringTransaction(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/recurring')
}
