'use client'

import { NumericInput } from '@/components/ui/NumericInput'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getSettingsData, updateProfile, updateSystemSettings, getWallets, updateWalletBalance, resetUserData, type SettingsWallet } from './actions'
import { useT } from '@/lib/i18n'
import { useAppStore } from '@/store/useAppStore'
import type { SystemSettings, UserProfile } from '@/types/settings'

export default function SettingsPage() {
  const t = useT()
  const { theme, lang, privacyMode, compactMode,
          setTheme, setLang, togglePrivacy, toggleCompact, setSalary: setSalaryAmount } = useAppStore()

  const [profile,   setProfile]   = useState<UserProfile>({ full_name: '', salary_iqd: 0 })
  const [settings,  setSettings]  = useState<SystemSettings>({ usd_to_iqd: 1310, gold_local_premium_percent: 0 })
  const [isAdmin,   setIsAdmin]   = useState(false)
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(true)
  const [msg,       setMsg]       = useState('')
  const [isPending, startTransition] = useTransition()
  const [wallets,     setWallets]     = useState<SettingsWallet[]>([])
  const [walletEdits, setWalletEdits] = useState<Record<string, string>>({})
  const [walletMsg,   setWalletMsg]   = useState('')
  const [savingWallet, setSavingWallet] = useState<string | null>(null)

  // ── Danger zone ──
  const router = useRouter()
  const [showDanger,  setShowDanger]  = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [resetting,   setResetting]   = useState(false)
  const [resetMsg,    setResetMsg]    = useState('')
  const [resetOk,     setResetOk]     = useState(false)
  const CONFIRM_WORD = lang === 'en' ? 'reset' : 'مسح'
  const confirmMatches = confirmText.trim().toLowerCase() === CONFIRM_WORD

  async function handleReset() {
    if (!confirmMatches || resetting) return
    setResetting(true)
    setResetMsg('')
    try {
      const { userId } = await resetUserData()
      // Clear the onboarding flag so the welcome popup shows again
      try { localStorage.removeItem(`finova_onboarding_done_${userId}`) } catch { /* storage blocked */ }
      setSalaryAmount(0)
      setResetOk(true)
      setResetMsg(t('تم مسح جميع البيانات بنجاح'))
      setTimeout(() => { router.push('/dashboard'); router.refresh() }, 1500)
    } catch (err) {
      setResetOk(false)
      setResetMsg(err instanceof Error ? err.message : String(err))
      setResetting(false)
    }
  }

  async function load() {
    try {
      const d = await getSettingsData()
      setProfile(d.profile)
      setSettings(d.settings)
      setIsAdmin(d.isAdmin)
      setEmail(d.email)
      if (d.profile.salary_iqd > 0) setSalaryAmount(d.profile.salary_iqd)

      const ws = await getWallets()
      setWallets(ws)
      const edits: Record<string, string> = {}
      ws.forEach((w) => { edits[w.id] = String(w.balance) })
      setWalletEdits(edits)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await updateProfile(profile)
        setSalaryAmount(profile.salary_iqd)
        setMsg(t('✅ تم حفظ الملف الشخصي'))
        setTimeout(() => setMsg(''), 3000)
      } catch (err) {
        setMsg('❌ ' + (err instanceof Error ? err.message : String(err)))
      }
    })
  }

  async function handleWalletSave(w: SettingsWallet) {
    const val = parseFloat(walletEdits[w.id] ?? '0') || 0
    setSavingWallet(w.id)
    try {
      await updateWalletBalance(w.id, val)
      setWallets((prev) => prev.map((x) => (x.id === w.id ? { ...x, balance: val } : x)))
      setWalletMsg(`✅ ${t('تم تحديث')} ${t(w.name)}`)
      setTimeout(() => setWalletMsg(''), 3000)
    } catch (err) {
      setWalletMsg('❌ ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSavingWallet(null)
    }
  }

  function handleSettingsSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await updateSystemSettings(settings)
        setMsg(t('✅ تم حفظ الإعدادات'))
        setTimeout(() => setMsg(''), 3000)
      } catch (err) {
        setMsg('❌ ' + (err instanceof Error ? err.message : String(err)))
      }
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)',
  }
  const saveBtn: React.CSSProperties = {
    padding: '10px 24px', borderRadius: '8px', border: 'none',
    cursor: isPending ? 'not-allowed' : 'pointer',
    backgroundColor: 'var(--accent-blue)', color: '#fff', fontWeight: 600,
    opacity: isPending ? 0.7 : 1,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-secondary)' }}>
      {t('جارٍ التحميل...')}
    </div>
  )

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('الإعدادات')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('إدارة حسابك وتفضيلاتك')}</p>
      </div>

      {msg && (
        <div className="card py-3 text-center text-sm" style={{ color: 'var(--text-primary)' }}>{msg}</div>
      )}

      {/* ── Profile ─────────────────────────────── */}
      <div className="card">
        <h2 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('الملف الشخصي')}</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label style={labelStyle}>{t('البريد الإلكتروني')}</label>
            <input value={email} disabled style={{ ...inputStyle, opacity: 0.6 }} />
          </div>
          <div>
            <label style={labelStyle}>{t('الاسم الكامل')}</label>
            <input
              type="text" value={profile.full_name ?? ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder={t('الاسم الكامل')}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t('الراتب الشهري (دينار)')}</label>
            <NumericInput
              value={profile.salary_iqd ? String(profile.salary_iqd) : ''}
              onChange={(raw) => setProfile({ ...profile, salary_iqd: parseFloat(raw) || 0 })}
              placeholder="0"
              style={inputStyle}
            />
          </div>
          <button type="submit" disabled={isPending} style={saveBtn}>
            {isPending ? t('جارٍ الحفظ...') : t('حفظ الملف')}
          </button>
        </form>
      </div>

      {/* ── Wallets ─────────────────────────────── */}
      <div className="card">
        <h2 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t('👛 المحافظ والأرصدة')}</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          {t('حدّث رصيدك الحالي لكل محفظة')}
        </p>
        <div className="space-y-3">
          {wallets.map((w) => (
            <div key={w.id} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t(w.name)}</div>
                <NumericInput
                  value={walletEdits[w.id] ?? ''}
                  onChange={(raw) => setWalletEdits({ ...walletEdits, [w.id]: raw })}
                  style={inputStyle}
                  data-sensitive
                />
              </div>
              <div className="text-xs pt-5" style={{ color: 'var(--text-secondary)', minWidth: '36px' }}>
                {w.currency}
              </div>
              <button
                onClick={() => handleWalletSave(w)}
                disabled={savingWallet === w.id}
                style={{
                  marginTop: '20px', padding: '8px 14px', borderRadius: '8px',
                  border: 'none', cursor: savingWallet === w.id ? 'not-allowed' : 'pointer',
                  backgroundColor: 'var(--accent-blue)', color: '#fff', fontSize: '12px', fontWeight: 600,
                  opacity: savingWallet === w.id ? 0.7 : 1,
                }}
              >
                {t('حفظ')}
              </button>
            </div>
          ))}
        </div>
        {walletMsg && (
          <div className="mt-3 text-sm text-center" style={{ color: 'var(--text-primary)' }}>{walletMsg}</div>
        )}
      </div>

      {/* ── Appearance ──────────────────────────── */}
      <div className="card">
        <h2 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('المظهر')}</h2>
        <div className="space-y-3">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{t('الوضع الليلي')}</span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                cursor: 'pointer', position: 'relative',
                backgroundColor: theme === 'dark' ? 'var(--accent-blue)' : 'var(--border-color)',
                transition: 'background-color 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: '2px',
                insetInlineStart: theme === 'dark' ? '22px' : '2px',
                width: '20px', height: '20px', borderRadius: '50%',
                backgroundColor: '#fff', transition: 'inset-inline-start 0.2s',
              }} />
            </button>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between">
            <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>اللغة / Language</span>
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
            >
              {lang === 'ar' ? 'English' : 'عربي'}
            </button>
          </div>

          {/* Privacy */}
          <div className="flex items-center justify-between">
            <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{t('وضع الخصوصية')}</span>
            <button
              onClick={togglePrivacy}
              style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                cursor: 'pointer', position: 'relative',
                backgroundColor: privacyMode ? 'var(--accent-blue)' : 'var(--border-color)',
              }}
            >
              <span style={{
                position: 'absolute', top: '2px',
                insetInlineStart: privacyMode ? '22px' : '2px',
                width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff',
              }} />
            </button>
          </div>

          {/* Compact */}
          <div className="flex items-center justify-between">
            <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{t('الوضع المضغوط')}</span>
            <button
              onClick={toggleCompact}
              style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                cursor: 'pointer', position: 'relative',
                backgroundColor: compactMode ? 'var(--accent-blue)' : 'var(--border-color)',
              }}
            >
              <span style={{
                position: 'absolute', top: '2px',
                insetInlineStart: compactMode ? '22px' : '2px',
                width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff',
              }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── System Settings (admin only) ─────────── */}
      {isAdmin && (
        <div className="card" style={{ borderColor: 'var(--accent-gold)' }}>
          <h2 className="font-bold mb-1" style={{ color: 'var(--accent-gold)' }}>{t('⚙️ إعدادات النظام')}</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>{t('مرئي للمسؤولين فقط')}</p>
          <form onSubmit={handleSettingsSave} className="space-y-4">
            <div>
              <label style={labelStyle}>{t('سعر صرف الدولار (IQD)')}</label>
              <NumericInput
                value={String(settings.usd_to_iqd)}
                onChange={(raw) => setSettings({ ...settings, usd_to_iqd: parseFloat(raw) || 1310 })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('علاوة سعر الذهب المحلي (%)')}</label>
              <input
                type="number" min="0" step="any"
                value={settings.gold_local_premium_percent}
                onChange={(e) => setSettings({ ...settings, gold_local_premium_percent: parseFloat(e.target.value) || 0 })}
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={isPending} style={{ ...saveBtn, backgroundColor: 'var(--accent-gold)' }}>
              {isPending ? t('جارٍ الحفظ...') : t('حفظ الإعدادات')}
            </button>
          </form>
        </div>
      )}

      {/* ── Danger Zone ── */}
      <div className="card" style={{ border: '2px solid var(--accent-red)', marginTop: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '24px' }} aria-hidden="true">⚠️</span>
          <h2 className="text-xl font-bold" style={{ color: 'var(--accent-red)' }}>
            {t('منطقة الخطر')}
          </h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          {t('مسح جميع البيانات المالية (المعاملات، الذهب، الأهداف، الميزانية) وإعادة الأرصدة إلى صفر. لا يمكن التراجع عن هذا الإجراء.')}
        </p>

        {!showDanger ? (
          <button
            onClick={() => setShowDanger(true)}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: 'none',
              backgroundColor: 'var(--accent-red)', color: '#fff',
              fontWeight: 700, cursor: 'pointer', fontSize: '14px',
            }}
          >
            🗑️ {t('مسح جميع البيانات')}
          </button>
        ) : (
          <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '12px', padding: '20px' }}>
            <label htmlFor="reset-confirm" className="text-sm font-bold" style={{ display: 'block', color: 'var(--accent-red)', marginBottom: '12px' }}>
              {t('اكتب')} &quot;<strong>{CONFIRM_WORD}</strong>&quot; {t('للتأكيد')}:
            </label>
            <input
              id="reset-confirm"
              type="text"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              disabled={resetting}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: '2px solid var(--accent-red)', backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontSize: '15px',
                marginBottom: '12px', boxSizing: 'border-box',
              }}
            />
            {resetMsg && (
              <p role={resetOk ? 'status' : 'alert'} className="text-sm" style={{ color: resetOk ? 'var(--accent-green)' : 'var(--accent-red)', marginBottom: '8px' }}>
                {resetMsg}
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleReset}
                disabled={!confirmMatches || resetting}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: 'none',
                  backgroundColor: confirmMatches && !resetting ? 'var(--accent-red)' : 'var(--border-color)',
                  color: '#fff', fontWeight: 700,
                  cursor: confirmMatches && !resetting ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                }}
              >
                {resetting ? t('جاري المسح...') : `🗑️ ${t('تأكيد المسح')}`}
              </button>
              <button
                onClick={() => { setShowDanger(false); setConfirmText(''); setResetMsg(''); setResetOk(false) }}
                disabled={resetting}
                style={{
                  padding: '10px 20px', borderRadius: '10px',
                  border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                  color: 'var(--text-secondary)', cursor: resetting ? 'not-allowed' : 'pointer', fontSize: '14px',
                }}
              >
                {t('إلغاء')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
