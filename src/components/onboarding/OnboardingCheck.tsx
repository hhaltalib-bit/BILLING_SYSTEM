'use client'

import { useState, useEffect } from 'react'
import { WelcomeSetupModal } from './WelcomeSetupModal'
import { createClient } from '@/lib/supabase/client'

const doneKeyFor = (userId: string) => `finova_onboarding_done_${userId}`

// localStorage can throw (private mode, blocked storage) — treat failures as "unknown".
function readDone(key: string): boolean {
  try { return !!localStorage.getItem(key) } catch { return false }
}
function markDone(key: string) {
  try { localStorage.setItem(key, '1') } catch { /* ignore */ }
}

/** Shows the welcome/setup modal once for a brand-new user
 *  (all wallet balances 0 AND no transactions). */
export function OnboardingCheck() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      setUserId(user.id)

      const doneKey = doneKeyFor(user.id)
      if (readDone(doneKey)) return

      const [walletsRes, txRes] = await Promise.all([
        supabase.from('wallets').select('balance').eq('user_id', user.id),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      if (cancelled) return
      // On a query error, don't guess — skip this time and re-check on the next load.
      if (walletsRes.error || txRes.error) return

      const allZero = (walletsRes.data ?? []).every((w) => Number(w.balance) === 0)
      const noTx    = (txRes.count ?? 0) === 0

      if (allZero && noTx) {
        setShowOnboarding(true)
      } else {
        // User already has data — mark as onboarded so we don't check again
        markDone(doneKey)
      }
    }

    check()
    return () => { cancelled = true }
  }, [])

  function handleComplete() {
    if (userId) markDone(doneKeyFor(userId))
    setShowOnboarding(false)
  }

  if (!showOnboarding) return null
  return <WelcomeSetupModal onComplete={handleComplete} />
}
