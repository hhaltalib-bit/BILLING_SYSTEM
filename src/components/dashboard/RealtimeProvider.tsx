'use client'

import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard'

interface Props { userId: string; children: React.ReactNode }

export function RealtimeProvider({ userId, children }: Props) {
  useRealtimeDashboard(userId)
  return <>{children}</>
}
