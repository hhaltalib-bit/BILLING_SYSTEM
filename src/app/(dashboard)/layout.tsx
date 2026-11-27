import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppProvider } from '@/components/layout/AppProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { OnboardingCheck } from '@/components/onboarding/OnboardingCheck'
import { UndoToastHost } from '@/components/ui/UndoToast'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <AppProvider>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
        <Sidebar isAdmin={isAdmin} />
        <div style={{
          marginInlineStart: 'var(--sidebar)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}>
          <Topbar />
          <main style={{
            marginTop: 'var(--topbar)',
            padding: '24px',
            flex: 1,
          }}>
            <OnboardingCheck />
            {children}
          </main>
        </div>
      </div>
      <UndoToastHost />
    </AppProvider>
  )
}
