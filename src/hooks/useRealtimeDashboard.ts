'use client'

import { useEffect, useCallback } from 'react'
import { createClient as createClientSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function useRealtimeDashboard(userId: string) {
  const router   = useRouter()
  const supabase = createClientSupabaseClient()

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'wallets',
        filter: `user_id=eq.${userId}`,
      }, refresh)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'transactions',
        filter: `user_id=eq.${userId}`,
      }, refresh)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, refresh, supabase])
}
