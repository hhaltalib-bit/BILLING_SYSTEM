'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/hooks/useTranslation'
import { createClient } from '@/lib/supabase/client'
import { getTransactionFormData } from '@/app/(dashboard)/transactions/actions'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import { updateSalary } from '@/app/(dashboard)/settings/actions'
import { deleteTransaction } from '@/app/(dashboard)/transactions/actions'
import { showUndoToast } from '@/lib/useUndoToast'
import { formatMonth } from '@/lib/utils'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { useT } from '@/lib/i18n'
import type { Wallet, Category } from '@/types/transaction'
import {
  Sun, Moon, Eye, EyeOff, LayoutGrid,
  Plus, DollarSign, LogOut, Search
} from 'lucide-react'

interface TopbarProps {
  onAddTransaction?: () => void
  onAddSalary?: () => void
}

export function Topbar({ onAddTransaction, onAddSalary }: TopbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t, lang } = useTranslation()
  const tr = useT()
  const {
    theme, setTheme,
    setLang,
    privacyMode, togglePrivacy,
    compactMode, toggleCompact,
  } = useAppStore()

  // Built-in modals, used when the parent does not pass handlers
  const [addingSalary, setAddingSalary] = useState(false)
  const [showTx, setShowTx] = useState(false)
  const [txKey, setTxKey] = useState(0)
  const [opening, setOpening] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Ctrl+K / ⌘+K toggles the global search from anywhere.
  // e.code is the physical key, so it also works with the Arabic layout
  // (where e.key for that key is 'ن', not 'k'). Capture phase so no other
  // handler can swallow it.
  const searchBtnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.code === 'KeyK' || e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    searchBtnRef.current?.focus()   // return focus to where the user came from
  }, [])

  // Wallets + categories for the transaction modal, prefetched once so the
  // modal opens instantly (fetching on click queued behind router.refresh()
  // and took several seconds — the button looked dead).
  const formData = useRef<{ wallets: Wallet[]; categories: Category[] } | null>(null)
  const formDataPromise = useRef<Promise<{ wallets: Wallet[]; categories: Category[] }> | null>(null)

  function loadFormData() {
    if (!formDataPromise.current) {
      formDataPromise.current = getTransactionFormData()
        .then((d) => { formData.current = d; return d })
        .catch((err) => { formDataPromise.current = null; throw err })
    }
    return formDataPromise.current
  }

  // Keep the cached wallets/categories fresh (e.g. after a category is added):
  // refetch in the background; formData.current is replaced when it arrives.
  useEffect(() => {
    const onChanged = () => {
      formDataPromise.current = null
      loadFormData().catch(() => { /* retried on click */ })
    }
    window.addEventListener('finova:data-changed', onChanged)
    return () => window.removeEventListener('finova:data-changed', onChanged)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!onAddTransaction) loadFormData().catch(() => { /* retried on click */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openAddTransaction() {
    if (onAddTransaction) return onAddTransaction()
    if (!formData.current) {
      setOpening(true)
      try {
        await loadFormData()
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err))
        return
      } finally {
        setOpening(false)
      }
    }
    setTxKey((k) => k + 1) // fresh form on every open
    setShowTx(true)
  }

  // One click: pays the salary saved in Settings — no modal. Feedback goes to
  // the app-wide toast; on success it offers Undo (an accidental click is easy).
  async function handleAddSalary() {
    if (onAddSalary) return onAddSalary()
    if (addingSalary) return
    setAddingSalary(true)
    try {
      const res = await updateSalary()
      if ('noSalarySet' in res) {
        showUndoToast(`⚠️ ${tr('لم تضبط راتبك بعد — اذهب للإعدادات')}`)
      } else if ('alreadyPaid' in res) {
        showUndoToast(`ℹ️ ${tr('الراتب مضاف مسبقاً لشهر')} ${formatMonth(res.budgetMonth, lang)}`)
      } else {
        const txId = res.transactionId
        showUndoToast(`✅ ${tr('تم إضافة راتب شهر')} ${formatMonth(res.budgetMonth, lang)}`, async () => {
          const r = await deleteTransaction(txId)
          if (!r.success) throw new Error(tr(r.error ?? 'حدث خطأ'))
        })
        notifyChanged()
      }
    } catch (err) {
      showUndoToast(`❌ ${err instanceof Error ? err.message : tr('حدث خطأ')}`)
    } finally {
      setAddingSalary(false)
    }
  }

  // After a successful save: tell client-rendered pages (e.g. /transactions)
  // to reload, and re-render the server-rendered dashboard if it is open.
  function notifyChanged() {
    window.dispatchEvent(new Event('finova:data-changed'))
    if (pathname === '/dashboard') router.refresh()
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const iconBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 'var(--radius)',
    border: '1px solid var(--s4)',
    backgroundColor: 'var(--s2)',
    color: 'var(--text2)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flexShrink: 0,
  }

  return (
    <>
    <header style={{
      position: 'fixed',
      top: 0,
      insetInlineStart: 'var(--sidebar)',
      insetInlineEnd: 0,
      height: 'var(--topbar)',
      backgroundColor: 'var(--s1)',
      borderBottom: '1px solid var(--s4)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 10,
      zIndex: 30,
    }}>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 14px', height: 36,
            borderRadius: 'var(--radius)',
            backgroundColor: 'var(--accent)',
            color: '#fff', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', border: 'none',
            whiteSpace: 'nowrap',
          }}
          onClick={openAddTransaction}
          disabled={opening}
        >
          <Plus size={15} />
          {t('addTransaction')}
        </button>

        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 14px', height: 36,
            borderRadius: 'var(--radius)',
            backgroundColor: 'rgba(245,158,11,0.15)',
            color: 'var(--gold)',
            border: '1px solid rgba(245,158,11,0.3)',
            fontWeight: 600, fontSize: 13,
            cursor: addingSalary ? 'wait' : 'pointer',
            opacity: addingSalary ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
          onClick={handleAddSalary}
          disabled={addingSalary}
          aria-busy={addingSalary}
        >
          <DollarSign size={15} />
          {addingSalary ? '…' : t('addSalary')}
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <button
        ref={searchBtnRef}
        type="button"
        onClick={() => setSearchOpen(true)}
        title="Ctrl+K"
        aria-label={tr('بحث')}
        aria-keyshortcuts="Control+K Meta+K"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 12px', height: 34, borderRadius: 10,
          border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
          marginInlineEnd: 8, whiteSpace: 'nowrap',
        }}
      >
        <Search size={15} />
        <span>{tr('بحث')}</span>
        <kbd style={{ fontSize: 11, opacity: 0.6, fontFamily: 'inherit' }}>Ctrl+K</kbd>
      </button>

      {/* Toggle buttons */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>

        <button
          style={{ ...iconBtn, color: privacyMode ? 'var(--accent)' : 'var(--text2)' }}
          onClick={togglePrivacy}
          title={t('privacyMode')}
          aria-label={t('privacyMode')}
        >
          {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>

        <button
          style={{ ...iconBtn, color: compactMode ? 'var(--accent)' : 'var(--text2)' }}
          onClick={toggleCompact}
          title={t('compactView')}
          aria-label={t('compactView')}
        >
          <LayoutGrid size={16} />
        </button>

        <button
          style={iconBtn}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? t('lightMode') : t('darkMode')}
          aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          style={{
            ...iconBtn,
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--accent)',
            width: 'auto',
            padding: '0 10px',
          }}
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          title={t('language')}
          aria-label={t('language')}
        >
          {lang === 'ar' ? 'English' : 'عربي'}
        </button>

        <button
          style={{ ...iconBtn, color: 'var(--danger)' }}
          onClick={handleLogout}
          title={t('logout')}
          aria-label={t('logout')}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>

      {/* Modals live outside the fixed header so its z-index (30) does not trap them under the sidebar */}
      {showTx && formData.current && (
        <AddTransactionModal
          key={txKey}
          wallets={formData.current.wallets}
          categories={formData.current.categories}
          onSuccess={notifyChanged}
          onClose={() => setShowTx(false)}
        />
      )}
      <GlobalSearch isOpen={searchOpen} onClose={closeSearch} />
    </>
  )
}
