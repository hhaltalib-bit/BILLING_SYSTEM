'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getTransactionsPageData } from './actions'
import { TransactionsList } from '@/components/transactions/TransactionsList'
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal'
import type { Wallet, Category, Transaction } from '@/types/transaction'
import { useT } from '@/lib/i18n'
import { Plus } from 'lucide-react'

// useSearchParams() needs a Suspense boundary in the App Router
export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsPageInner />
    </Suspense>
  )
}

function TransactionsPageInner() {
  const t = useT()
  const searchParams = useSearchParams()
  // ?highlight=<id>&at=<nonce> — set by the global search (Ctrl+K)
  const highlightId  = searchParams.get('highlight')
  const highlightKey = searchParams.get('at') ?? highlightId ?? ''
  const [wallets,      setWallets]      = useState<Wallet[]>([])
  const [categories,   setCategories]   = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showModal,    setShowModal]    = useState(false)
  const [modalKey,     setModalKey]     = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState('')

  const load = useCallback(async () => {
    try {
      const data = await getTransactionsPageData()
      setWallets(data.wallets)
      setCategories(data.categories)
      setTransactions(data.transactions)
      setLoadError('')
    } catch (err) {
      // Surface failures instead of leaving the page silently stale
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Reload when a transaction is added from the topbar modal
  useEffect(() => {
    const onChanged = () => { load() }
    window.addEventListener('finova:data-changed', onChanged)
    return () => window.removeEventListener('finova:data-changed', onChanged)
  }, [load])

  function openModal() {
    setModalKey((k) => k + 1) // fresh modal state on every open
    setShowModal(true)
  }

  function handleClose() {
    setShowModal(false)
    load() // refresh after adding
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-secondary)' }}>
        {t('جارٍ التحميل...')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('المعاملات')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t('سجل الدخل والصرف والتحويلات')}
          </p>
        </div>
        <button
          onClick={openModal}
          style={{
            display:         'flex',
            alignItems:      'center',
            gap:             '8px',
            padding:         '10px 18px',
            borderRadius:    '10px',
            border:          'none',
            cursor:          'pointer',
            backgroundColor: 'var(--accent-blue)',
            color:           '#fff',
            fontWeight:      600,
            fontSize:        '14px',
          }}
        >
          <Plus className="w-4 h-4" />
          {t('إضافة معاملة')}
        </button>
      </div>

      {loadError && (
        <div className="card text-sm flex items-center justify-between gap-3" style={{ color: 'var(--accent-red)' }}>
          <span>❌ {loadError}</span>
          <button onClick={() => load()} style={{ background: 'none', border: '1px solid currentColor', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', color: 'inherit' }}>
            ↻
          </button>
        </div>
      )}

      {/* Transactions List */}
      <TransactionsList transactions={transactions} categories={categories} highlightId={highlightId} highlightKey={highlightKey} />

      {/* Modal */}
      {showModal && (
        <AddTransactionModal
          key={modalKey}
          wallets={wallets}
          categories={categories}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
