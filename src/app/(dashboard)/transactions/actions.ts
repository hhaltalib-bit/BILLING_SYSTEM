'use server'

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { WALLET_META } from '@/lib/constants'
import type { WalletType } from '@/lib/types'
import type { TxType, Currency, Transaction, Wallet, Category } from '@/types/transaction'

// Adapted to the Part 1 schema (supabase/schema.sql):
//   wallets.type (currency derived from WALLET_META)
//   categories.name_ar / name_en / icon  (no `type` column → every category is 'both')
//   transactions.wallet_from_id / wallet_to_id

const WALLET_ORDER: WalletType[] = ['cash_iqd', 'cash_usd', 'savings_iqd', 'savings_usd']

// ── Fetch ────────────────────────────────────────────────────

// Wallets + categories for the Add Transaction form
async function loadFormData(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const walletLabels: Record<string, string> = {
    cash_iqd:    'النقد الديناري',
    cash_usd:    'النقد الدولاري',
    savings_iqd: 'الادخار بالدينار',
    savings_usd: 'الادخار بالدولار',
  }

  // Wallets
  const { data: walletsData } = await supabase
    .from('wallets')
    .select('id, type, balance')
    .eq('user_id', userId)

  const wallets: Wallet[] = ((walletsData ?? []) as { id: string; type: WalletType; balance: number | string }[])
    .sort((a, b) => WALLET_ORDER.indexOf(a.type) - WALLET_ORDER.indexOf(b.type))
    .map((w) => ({
      id:          w.id,
      wallet_type: w.type,
      balance:     Number(w.balance),
      currency:    WALLET_META[w.type].currency,
      label:       walletLabels[w.type] ?? w.type,
    }))

  const categories = await loadCategories(supabase, userId)

  return { wallets, categories }
}

// Categories: global defaults (user_id IS NULL) + the user's own.
// Order: defaults A–Z, then the user's own A–Z, with "Other" last.
async function loadCategories(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name_ar, icon, user_id')
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order('name_ar')
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as { id: string; name_ar: string; icon: string | null; user_id: string | null }[]
  const rank = (c: { name_ar: string; user_id: string | null }) => (c.name_ar === 'أخرى' ? 2 : c.user_id ? 1 : 0)
  return rows
    .sort((a, b) => rank(a) - rank(b) || a.name_ar.localeCompare(b.name_ar, 'ar'))
    .map((c) => ({ id: c.id, name: c.name_ar, type: 'both', icon: c.icon ?? 'tag', is_custom: c.user_id !== null }))
}

/** All categories visible to the user (Settings → Categories). */
export async function getCategories(): Promise<Category[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return loadCategories(supabase, user.id)
}

/** Lightweight: only what the Add Transaction modal needs (no transaction list). */
export async function getTransactionFormData(): Promise<{ wallets: Wallet[]; categories: Category[] }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return loadFormData(supabase, user.id)
}


// Up to this many transactions are loaded for the list, its filters and search.
const TX_LIMIT = 500

const TX_SELECT = `
  id, amount, currency, type, note, date, budget_month, is_salary, created_at, balance_applied,
  category_id, wallet_from_id, wallet_to_id,
  categories(name_ar),
  from_wallet:wallets!transactions_wallet_from_id_fkey(type),
  to_wallet:wallets!transactions_wallet_to_id_fkey(type)
`

async function loadTransactions(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string): Promise<Transaction[]> {
  const { data: txData, error } = await supabase
    .from('transactions')
    .select(TX_SELECT)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(TX_LIMIT)
  if (error) throw new Error(error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase nested joins have complex inferred types
  return (txData ?? []).map((tx: any) => ({
    id:               tx.id,
    amount:           Number(tx.amount),
    currency:         tx.currency as Currency,
    type:             tx.type as TxType,
    note:             tx.note ?? null,
    category_id:      tx.category_id ?? null,
    category_name:    tx.categories?.name_ar ?? null,
    from_wallet_id:   tx.wallet_from_id ?? null,
    to_wallet_id:     tx.wallet_to_id ?? null,
    from_wallet_type: tx.from_wallet?.type ?? null,
    to_wallet_type:   tx.to_wallet?.type   ?? null,
    date:             tx.date ?? String(tx.created_at).slice(0, 10),
    budget_month:     tx.budget_month ?? `${String(tx.date ?? tx.created_at).slice(0, 7)}-01`,
    is_salary:        !!tx.is_salary,
    created_at:       tx.created_at,
    balance_applied:  !!tx.balance_applied,
  }))
}

/** Transactions for the global search (Ctrl+K), loaded lazily when it opens. */
export async function getSearchTransactions(): Promise<Transaction[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return loadTransactions(supabase, user.id)
}

export async function getTransactionsPageData() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [{ wallets, categories }, transactions] = await Promise.all([
    loadFormData(supabase, user.id),
    loadTransactions(supabase, user.id),
  ])
  return { wallets, categories, transactions }
}

// ── Add Transaction ──────────────────────────────────────────

export interface AddTransactionInput {
  type: TxType
  amount: number
  currency: Currency
  from_wallet_id: string
  to_wallet_id?: string
  category_id?: string
  note?: string
}

export async function addTransaction(input: AddTransactionInput): Promise<{ id: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // The modal always sends the selected wallet as `from_wallet_id`.
  // Income flows INTO that wallet, so store it as wallet_to_id.
  const walletFrom = input.type === 'income' ? null : input.from_wallet_id
  const walletTo   = input.type === 'income' ? input.from_wallet_id
                   : input.type === 'transfer' ? (input.to_wallet_id ?? null)
                   : null

  if (!(input.amount > 0)) throw new Error('أدخل مبلغاً صحيحاً')

  // Guard: every referenced wallet must exist and belong to this user
  // (FK checks alone would accept another user's wallet id).
  const walletIds = [walletFrom, walletTo].filter((id): id is string => !!id)
  if (walletIds.length === 0) throw new Error('اختر المحفظة')
  const { data: owned } = await supabase
    .from('wallets')
    .select('id, type')
    .eq('user_id', user.id)
    .in('id', walletIds)
  if ((owned ?? []).length !== new Set(walletIds).size) throw new Error('المحفظة غير موجودة')
  if (input.type === 'transfer' && walletFrom === walletTo) throw new Error('اختر محفظتين مختلفتين')

  // If any wallet's currency differs from the transaction currency, the DB
  // trigger converts with exchange_rate — store today's rate on the row so
  // a later delete reverses exactly what was applied.
  const needsRate = (owned as { id: string; type: WalletType }[])
    .some((w) => WALLET_META[w.type].currency !== input.currency)
  let exchangeRate: number | null = null
  if (needsRate) {
    const { data: settings } = await supabase
      .from('system_settings')
      .select('usd_to_iqd')
      .eq('id', 1)
      .maybeSingle()
    exchangeRate = Number(settings?.usd_to_iqd ?? 0) || 1310
  }

  const { data: inserted, error } = await supabase.from('transactions').insert({
    exchange_rate:   exchangeRate,
    balance_applied: true,   // DB trigger (migration 004) applies it to wallet balances
    user_id:        user.id,
    type:           input.type,
    amount:         input.amount,
    currency:       input.currency,
    wallet_from_id: walletFrom,
    wallet_to_id:   walletTo,
    category_id:    input.category_id  ?? null,
    note:           input.note         ?? null,
  }).select('id').single()

  if (error) throw new Error(error.message)
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { id: (inserted as { id: string }).id }
}

// ── Delete Transaction ───────────────────────────────────────

// Wallet balance reversal is done by the DB trigger (migration 004), in the
// same statement as the delete — only for rows with balance_applied = true.
/** Everything needed to put a deleted transaction back exactly as it was. */
export interface TransactionSnapshot {
  id:              string
  type:            TxType
  amount:          number
  currency:        Currency
  wallet_from_id:  string | null
  wallet_to_id:    string | null
  category_id:     string | null
  note:            string | null
  exchange_rate:   number | null
  date:            string
  budget_month:    string
  is_salary:       boolean
  created_at:      string
  balance_applied: boolean
}

const SNAPSHOT_COLS = 'id, type, amount, currency, wallet_from_id, wallet_to_id, category_id, note, exchange_rate, date, budget_month, is_salary, created_at, balance_applied'

export async function deleteTransaction(id: string): Promise<{ success: boolean; error?: string; deleted?: TransactionSnapshot }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: deleted, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select(SNAPSHOT_COLS)

  if (error) return { success: false, error: error.message }
  if (!deleted || deleted.length === 0) return { success: false, error: 'المعاملة غير موجودة' }

  const row = deleted[0] as unknown as TransactionSnapshot
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return {
    success: true,
    deleted: {
      ...row,
      amount:        Number(row.amount),
      exchange_rate: row.exchange_rate === null ? null : Number(row.exchange_rate),
    },
  }
}

// ── Restore (Undo delete) ────────────────────────────────────
// Re-inserts a deleted transaction with its original id, date and
// balance_applied flag; the DB trigger re-applies it to wallet balances
// exactly as before. Ownership is re-checked server-side.

export async function restoreTransaction(snap: TransactionSnapshot): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  if (!['income', 'expense', 'transfer'].includes(snap.type) || !['IQD', 'USD'].includes(snap.currency) || !(snap.amount > 0)) {
    return { success: false, error: 'بيانات غير صالحة' }
  }
  const walletIds = [snap.wallet_from_id, snap.wallet_to_id].filter((w): w is string => !!w)
  if (walletIds.length > 0) {
    const { data: owned } = await supabase.from('wallets').select('id').eq('user_id', user.id).in('id', walletIds)
    if ((owned ?? []).length !== new Set(walletIds).size) return { success: false, error: 'المحفظة غير موجودة' }
  }

  const { error } = await supabase.from('transactions').insert({
    id:              snap.id,
    user_id:         user.id,
    type:            snap.type,
    amount:          snap.amount,
    currency:        snap.currency,
    wallet_from_id:  snap.wallet_from_id,
    wallet_to_id:    snap.wallet_to_id,
    category_id:     snap.category_id,
    note:            snap.note,
    exchange_rate:   snap.exchange_rate,
    date:            snap.date,
    budget_month:    snap.budget_month,   // keep the original budget month (salary → next month)
    is_salary:       snap.is_salary,
    created_at:      snap.created_at,
    balance_applied: snap.balance_applied,
  })
  if (error) return { success: false, error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

// ── Update Transaction ───────────────────────────────────────
// Only note, category and date are editable (amount / wallet / type are not):
// the trigger skips balance work for edits that do not touch money fields.

export interface UpdateTransactionInput {
  note:        string | null   // null / '' clears the note
  category_id: string | null   // null clears the category
  date:        string          // YYYY-MM-DD
}

export async function updateTransaction(id: string, input: UpdateTransactionInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { success: false, error: 'تاريخ غير صالح' }

  // Category must be a global default or one of the user's own
  if (input.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', input.category_id)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .maybeSingle()
    if (!cat) return { success: false, error: 'الفئة غير موجودة' }
  }

  const note = input.note?.trim() ? input.note.trim() : null
  const { data: updated, error } = await supabase
    .from('transactions')
    .update({ note, category_id: input.category_id || null, date: input.date })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')

  if (error) return { success: false, error: error.message }
  if (!updated || updated.length === 0) return { success: false, error: 'المعاملة غير موجودة' }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

// ── Categories (custom) ──────────────────────────────────────

const CATEGORY_NAME_MAX = 30

/** Create a custom category for the current user. Names are unique per user
 *  (case-insensitive), including against the shared defaults. */
export async function addCategory(name: string, icon: string): Promise<{ success: boolean; category?: Category; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const clean = name.trim().replace(/\s+/g, ' ')
  if (!clean) return { success: false, error: 'أدخل اسم الفئة' }
  if (clean.length > CATEGORY_NAME_MAX) return { success: false, error: 'اسم الفئة طويل جداً' }
  const emoji = (icon || '📦').trim().slice(0, 8)

  const existing = await loadCategories(supabase, user.id)
  const lower = clean.toLocaleLowerCase()
  if (existing.some((c) => c.name.toLocaleLowerCase() === lower)) return { success: false, error: 'الفئة موجودة مسبقاً' }

  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: user.id, name_ar: clean, name_en: clean, icon: emoji, is_default: false })
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/settings')
  return { success: true, category: { id: (data as { id: string }).id, name: clean, type: 'both', icon: emoji, is_custom: true } }
}

/** Delete one of the user's own categories (defaults cannot be deleted).
 *  Transactions / recurring payments using it become "no category" (migration 006);
 *  budget limits for it are removed (ON DELETE CASCADE). */
export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: deleted, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)      // own categories only — never the shared defaults
    .select('id')
  if (error) return { success: false, error: error.message }
  if (!deleted || deleted.length === 0) return { success: false, error: 'الفئة غير موجودة' }

  revalidatePath('/transactions')
  revalidatePath('/settings')
  revalidatePath('/budget')
  revalidatePath('/dashboard')
  return { success: true }
}
