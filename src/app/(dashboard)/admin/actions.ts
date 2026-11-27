'use server'

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { AdminUser } from '@/types/admin'

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('غير مصرح — مسؤولون فقط')
  return { supabase, user }
}

export async function getAdminPageData() {
  await requireAdmin()

  // Use service role key to read all users (bypasses RLS)
  const supabaseAdmin = createAdminClient()

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, salary_iqd, created_at')
    .order('created_at', { ascending: false })

  // Get emails from auth.users (admin-only via service role).
  // listUsers is paginated (50/page by default) — 1000 covers a personal app.
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(authUsers?.users?.map((u) => [u.id, u.email]) ?? [])

  type ProfileRow = { id: string; full_name: string | null; role: string; salary_iqd: number | string | null; created_at: string }
  const users: AdminUser[] = ((profiles ?? []) as ProfileRow[]).map((p) => ({
    id:         p.id,
    email:      emailMap.get(p.id) ?? '—',
    full_name:  p.full_name,
    role:       p.role as 'admin' | 'user',
    salary_iqd: Number(p.salary_iqd ?? 0),
    created_at: p.created_at,
  }))

  // Summary stats
  const { count: txCount } = await supabaseAdmin
    .from('transactions')
    .select('id', { count: 'exact', head: true })

  const { count: goldCount } = await supabaseAdmin
    .from('gold_purchases')
    .select('id', { count: 'exact', head: true })

  // wallets has no `currency` column (it's derived from `type`) — just count rows
  const { count: walletCount } = await supabaseAdmin
    .from('wallets')
    .select('id', { count: 'exact', head: true })

  return {
    users,
    stats: {
      userCount:        users.length,
      transactionCount: txCount ?? 0,
      goldCount:        goldCount ?? 0,
      walletCount:      walletCount ?? 0,
    },
  }
}

export async function setUserRole(targetUserId: string, role: 'admin' | 'user') {
  const { user } = await requireAdmin()

  // Server actions are public endpoints — validate input at runtime
  if (role !== 'admin' && role !== 'user') throw new Error('Invalid role')
  if (targetUserId === user.id && role !== 'admin') {
    throw new Error('لا يمكنك إزالة صلاحية المسؤول عن حسابك')
  }

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', targetUserId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}
