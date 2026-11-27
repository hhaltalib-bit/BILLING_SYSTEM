import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDashboardData } from './actions'
import { WalletCard }         from '@/components/dashboard/WalletCard'
import { NetWorthCard }       from '@/components/dashboard/NetWorthCard'
import { GoldCard }           from '@/components/dashboard/GoldCard'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { ForecastCard }       from '@/components/dashboard/ForecastCard'
import { MonthSummaryCard }   from '@/components/dashboard/MonthSummaryCard'
import { InsightCard }        from '@/components/dashboard/InsightCard'
import { RealtimeProvider }   from '@/components/dashboard/RealtimeProvider'
import { T }                  from '@/components/ui/T'
import { InfoTooltip }        from '@/components/ui/InfoTooltip'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await getDashboardData()

  return (
    <RealtimeProvider userId={user.id}>
      <div className="space-y-6">

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            <T>لوحة التحكم</T>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            <T>نظرة عامة على وضعك المالي</T>
          </p>
        </div>

        {/* 4 Wallet Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {data.wallets.map((wallet) => (
            <WalletCard key={wallet.id} wallet={wallet} />
          ))}
        </div>

        {/* Net Worth + Gold */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NetWorthCard netWorthIQD={data.netWorthIQD} salaryAmount={data.salaryAmount} />
          {data.gold ? (
            <GoldCard gold={data.gold} />
          ) : (
            <div className="card flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
              <div className="text-center">
                <div className="flex justify-end mb-1"><InfoTooltip text="قيمة ما تملكه من ذهب بسعر السوق الحالي، والربح أو الخسارة مقارنة بما دفعته." /></div>
                <div className="text-3xl mb-2">🥇</div>
                <div className="text-sm"><T>لا توجد مشتريات ذهب</T></div>
              </div>
            </div>
          )}
        </div>

        {/* This month vs last month */}
        <MonthSummaryCard
          month={data.month}
          tooltips={{
            income:  <InfoTooltip text="إجمالي ما دخل لحساباتك هذا الشهر من رواتب ومداخيل أخرى. السهم يقارن بنفس الأيام من الشهر الماضي." />,
            expense: <InfoTooltip text="إجمالي ما أنفقته هذا الشهر (لا يشمل التحويلات بين محافظك). السهم يقارن بنفس الأيام من الشهر الماضي." />,
            net:     <InfoTooltip text="الفرق بين دخلك ومصروفك هذا الشهر. رقم موجب = وفّرت. رقم سالب = تجاوزت دخلك." />,
          }}
        />

        {/* Forecast + Insight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ForecastCard
            data={data.forecast}
            tooltip={<InfoTooltip text="تقدير بناءً على معدل إنفاقك الحالي مقارنة براتبك. يتغير كلما أضفت حركات جديدة." />}
          />
          <InsightCard
            categories={data.categorySpend}
            tooltip={<InfoTooltip text="ملخص لأبرز أنماط إنفاقك هذا الشهر. يساعدك تحديد أين يذهب معظم مالك." />}
          />
        </div>

        {/* Recent Transactions */}
        <RecentTransactions transactions={data.recentTransactions} />

      </div>
    </RealtimeProvider>
  )
}
