'use client'

import { NumericInput } from '@/components/ui/NumericInput'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n'
import {
  getWallets,
  updateWalletBalance,
  setProfileSalary,
  type SettingsWallet,
} from '@/app/(dashboard)/settings/actions'

interface Props {
  onComplete: () => void
}

export function WelcomeSetupModal({ onComplete }: Props) {
  const t = useT()
  const router = useRouter()
  const [step, setStep] = useState<'welcome' | 'balances' | 'done'>('welcome')
  const [wallets, setWallets] = useState<SettingsWallet[]>([])
  const [balances, setBalances] = useState<Record<string, string>>({})
  const [salary, setSalary] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingWallets, setLoadingWallets] = useState(false)
  const [error, setError] = useState('')

  async function loadWallets() {
    setLoadingWallets(true)
    setError('')
    try {
      const ws = await getWallets()
      setWallets(ws)
      const init: Record<string, string> = {}
      ws.forEach((w) => { init[w.id] = '' })
      setBalances(init)
      setStep('balances')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingWallets(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      // Save each wallet balance (empty / 0 → leave at 0)
      for (const w of wallets) {
        const val = Number(balances[w.id] || 0)
        if (val > 0) await updateWalletBalance(w.id, val)
      }
      // Initial setup is not a salary payment: update the profile only,
      // without creating an income transaction or touching wallet balances.
      if (Number(salary) > 0) await setProfileSalary(Number(salary))

      setStep('done')
      setTimeout(() => {
        onComplete()
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '100%',
    overflowY: 'auto',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: '15px', boxSizing: 'border-box',
  }

  const errorLine = error && (
    <p role="alert" style={{ color: 'var(--accent-red)', fontSize: '13px', marginTop: '12px' }}>{error}</p>
  )

  if (step === 'welcome') return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={t('أهلاً بك في Finova')}>
      <div style={cardStyle}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>👋</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
          {t('أهلاً بك في Finova')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
          {t('قبل أن تبدأ، دعنا نضبط أرصدتك الحالية حتى تكون الحسابات دقيقة من اليوم الأول')}
        </p>
        <button
          onClick={loadWallets}
          disabled={loadingWallets}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            backgroundColor: 'var(--accent-gold)', color: '#fff',
            fontSize: '16px', fontWeight: 700,
            cursor: loadingWallets ? 'not-allowed' : 'pointer',
            opacity: loadingWallets ? 0.7 : 1,
          }}
        >
          {loadingWallets ? t('جارٍ التحميل...') : t('ابدأ الإعداد')}
        </button>
        <button
          onClick={onComplete}
          style={{
            marginTop: '12px', background: 'none', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px',
          }}
        >
          {t('تخطي — سأضيف الأرصدة لاحقاً')}
        </button>
        {errorLine}
      </div>
    </div>
  )

  if (step === 'balances') return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={t('أدخل أرصدتك الحالية')}>
      <div style={{ ...cardStyle, textAlign: 'start', maxWidth: '520px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          💰 {t('أدخل أرصدتك الحالية')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          {t('اترك الحقل فارغاً إذا كان الرصيد صفراً')}
        </p>

        {wallets.map((w) => (
          <div key={w.id} style={{ marginBottom: '16px' }}>
            <label htmlFor={`ob-${w.id}`} style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
              {t(w.name)}
            </label>
            <NumericInput
              id={`ob-${w.id}`}
              placeholder="0"
              value={balances[w.id] ?? ''}
              onChange={(raw) => setBalances((prev) => ({ ...prev, [w.id]: raw }))}
              style={inputStyle}
            />
          </div>
        ))}

        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="ob-salary" style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
            💼 {t('راتبك الشهري (دينار عراقي) — اختياري')}
          </label>
          <NumericInput
            id="ob-salary"
            placeholder="0"
            value={salary}
            onChange={setSalary}
            style={inputStyle}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            backgroundColor: saving ? 'var(--border-color)' : 'var(--accent-green)',
            color: '#fff', fontSize: '16px', fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? t('جارٍ الحفظ...') : t('حفظ وابدأ الاستخدام')}
        </button>
        <button
          onClick={onComplete}
          disabled={saving}
          style={{
            display: 'block', margin: '10px auto 0', background: 'none', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px',
          }}
        >
          {t('تخطي')}
        </button>
        {errorLine}
      </div>
    </div>
  )

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={t('تم الإعداد بنجاح!')}>
      <div style={cardStyle}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
          {t('تم الإعداد بنجاح!')}
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          {t('يمكنك تعديل الأرصدة في أي وقت من صفحة الإعدادات')}
        </p>
      </div>
    </div>
  )
}
