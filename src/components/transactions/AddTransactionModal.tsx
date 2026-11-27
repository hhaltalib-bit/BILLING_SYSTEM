'use client'

import { NumericInput } from '@/components/ui/NumericInput'
import { useT } from '@/lib/i18n'

import { useState, useTransition } from 'react'
import { addTransaction, deleteTransaction, addCategory } from '@/app/(dashboard)/transactions/actions'
import { categoryEmoji, CATEGORY_EMOJI_CHOICES } from '@/lib/categoryIcons'
import { showUndoToast } from '@/lib/useUndoToast'
import type { Wallet, Category, TxType, Currency } from '@/types/transaction'
import { X } from 'lucide-react'

interface Props {
  wallets: Wallet[]
  categories: Category[]
  onClose: () => void
  /** Called after a successful save, before onClose */
  onSuccess?: () => void
}

const typeLabels: Record<TxType, string> = {
  income:   'دخل',
  expense:  'صرف',
  transfer: 'تحويل',
}

export function AddTransactionModal({ wallets, categories, onClose, onSuccess }: Props) {
  const tr = useT()
  const [type, setType]           = useState<TxType>('expense')
  const [amount, setAmount]       = useState('')
  const [currency, setCurrency]   = useState<Currency>('IQD')
  const [fromWallet, setFromWallet] = useState(wallets[0]?.id ?? '')
  const [toWallet, setToWallet]   = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote]           = useState('')
  const [error, setError]         = useState('')
  const [isPending, startTransition] = useTransition()

  // Inline "add category" — new categories are added to this list immediately
  const [cats, setCats]                       = useState<Category[]>(categories)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState<string>('📦')
  const [addingCategory, setAddingCategory]   = useState(false)
  const [categoryError, setCategoryError]     = useState('')

  async function handleAddCategory() {
    const name = newCategoryName.trim()
    if (!name || addingCategory) return
    setAddingCategory(true)
    setCategoryError('')
    try {
      const result = await addCategory(name, newCategoryIcon)
      if (result.success && result.category) {
        const created = result.category
        setCats((prev) => [...prev, created])
        setCategoryId(created.id)            // select the new category
        setShowAddCategory(false)
        setNewCategoryName('')
        setNewCategoryIcon('📦')
        // other open views (transactions page, Topbar's cached form data) reload
        window.dispatchEvent(new Event('finova:data-changed'))
      } else {
        setCategoryError(tr(result.error ?? 'حدث خطأ'))
      }
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : String(err))
    } finally {
      setAddingCategory(false)
    }
  }

  const filteredCats = cats.filter(
    (c) => c.type === type || c.type === 'both'
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError(tr('أدخل مبلغاً صحيحاً')); return }
    if (!fromWallet)      { setError(tr('اختر المحفظة'));       return }
    if (type === 'transfer' && !toWallet) {
      setError(tr('اختر محفظة الوجهة')); return
    }

    startTransition(async () => {
      try {
        const { id } = await addTransaction({
          type,
          amount: amt,
          currency,
          from_wallet_id: fromWallet,
          to_wallet_id:   type === 'transfer' ? toWallet : undefined,
          category_id:    categoryId || undefined,
          note:           note       || undefined,
        })
        // Undo = delete the row just added (the DB trigger reverses its balance effect)
        showUndoToast(tr('تم إضافة الحركة ✓'), async () => {
          const r = await deleteTransaction(id)
          if (!r.success) throw new Error(tr(r.error ?? 'حدث خطأ'))
        })
        onSuccess?.()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })
  }

  const inputStyle: React.CSSProperties = {
    width:           '100%',
    padding:         '10px 12px',
    borderRadius:    '8px',
    border:          '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)',
    color:           'var(--text-primary)',
    fontSize:        '14px',
  }

  const labelStyle: React.CSSProperties = {
    display:      'block',
    marginBottom: '6px',
    fontSize:     '13px',
    color:        'var(--text-secondary)',
  }

  return (
    <div
      style={{
        position:        'fixed', inset: 0, zIndex: 50,
        display:         'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        role="dialog"
        aria-modal="true"
        aria-label={tr('إضافة معاملة')}
        style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', margin: '16px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {tr('إضافة معاملة')}
          </h2>
          <button onClick={onClose} aria-label={tr('إغلاق')} style={{ color: 'var(--text-secondary)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Tabs */}
          <div className="flex gap-2">
            {(['expense', 'income', 'transfer'] as TxType[]).map((t) => (
              <button
                key={t} type="button"
                onClick={() => setType(t)}
                style={{
                  flex:            1,
                  padding:         '8px',
                  borderRadius:    '8px',
                  border:          'none',
                  cursor:          'pointer',
                  fontWeight:      type === t ? 700 : 400,
                  backgroundColor: type === t
                    ? t === 'income' ? 'var(--accent-green)' : t === 'expense' ? 'var(--accent-red)' : 'var(--accent-blue)'
                    : 'var(--bg-primary)',
                  color: type === t ? '#fff' : 'var(--text-secondary)',
                  fontSize: '13px',
                }}
              >
                {tr(typeLabels[t])}
              </button>
            ))}
          </div>

          {/* Amount + Currency */}
          <div className="flex gap-3">
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{tr('المبلغ')}</label>
              <NumericInput
                value={amount} onChange={setAmount}
                placeholder="0"
                style={inputStyle}
                required
              />
            </div>
            <div style={{ width: '90px' }}>
              <label style={labelStyle}>{tr('العملة')}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                style={inputStyle}
              >
                <option value="IQD">IQD</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* From Wallet */}
          <div>
            <label style={labelStyle}>
              {type === 'transfer' ? tr('من محفظة') : tr('المحفظة')}
            </label>
            <select
              value={fromWallet}
              onChange={(e) => setFromWallet(e.target.value)}
              style={inputStyle}
              required
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{tr(w.label)}</option>
              ))}
            </select>
          </div>

          {/* To Wallet (transfer only) */}
          {type === 'transfer' && (
            <div>
              <label style={labelStyle}>{tr('إلى محفظة')}</label>
              <select
                value={toWallet}
                onChange={(e) => setToWallet(e.target.value)}
                style={inputStyle}
                required
              >
                <option value="">{tr('— اختر —')}</option>
                {wallets.filter((w) => w.id !== fromWallet).map((w) => (
                  <option key={w.id} value={w.id}>{tr(w.label)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category (not for transfer) */}
          {type !== 'transfer' && (
            <div>
              <label style={labelStyle}>{tr('الفئة (اختياري)')}</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={inputStyle}
              >
                <option value="">{tr('— بدون فئة —')}</option>
                {filteredCats.map((c) => (
                  <option key={c.id} value={c.id}>{categoryEmoji(c.icon)} {tr(c.name)}</option>
                ))}
              </select>

              {!showAddCategory ? (
                <button
                  type="button"
                  onClick={() => { setShowAddCategory(true); setCategoryError('') }}
                  style={{
                    width: '100%', padding: '8px', borderRadius: '8px',
                    border: '1px dashed var(--border-color)', backgroundColor: 'transparent',
                    color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '13px',
                    marginTop: '6px',
                  }}
                >
                  + {tr('إضافة فئة جديدة')}
                </button>
              ) : (
                <div style={{ marginTop: '8px', padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <select
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      aria-label={tr('أيقونة الفئة')}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '16px', width: '70px' }}
                    >
                      {CATEGORY_EMOJI_CHOICES.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      // Enter adds the category instead of submitting the transaction form
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }}
                      placeholder={tr('اسم الفئة')}
                      aria-label={tr('اسم الفئة')}
                      maxLength={30}
                      autoFocus
                      style={{
                        flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: '8px',
                        border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)', fontSize: '14px',
                      }}
                    />
                  </div>
                  {categoryError && <p role="alert" style={{ color: 'var(--accent-red)', fontSize: '12px', marginBottom: '8px' }}>{categoryError}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={!newCategoryName.trim() || addingCategory}
                      onClick={handleAddCategory}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                        backgroundColor: newCategoryName.trim() && !addingCategory ? 'var(--accent-blue)' : 'var(--border-color)',
                        color: '#fff', cursor: newCategoryName.trim() && !addingCategory ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600,
                      }}
                    >
                      {addingCategory ? tr('جاري الإضافة...') : tr('إضافة')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddCategory(false); setNewCategoryName(''); setCategoryError('') }}
                      style={{
                        padding: '8px 14px', borderRadius: '8px',
                        border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                        color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px',
                      }}
                    >
                      {tr('إلغاء')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div>
            <label style={labelStyle}>{tr('ملاحظة (اختياري)')}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={tr('وصف المعاملة...')}
              style={inputStyle}
            />
          </div>

          {/* Error */}
          {error && (
            <p style={{ color: 'var(--accent-red)', fontSize: '13px' }}>{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            style={{
              width:           '100%',
              padding:         '12px',
              borderRadius:    '8px',
              border:          'none',
              cursor:          isPending ? 'not-allowed' : 'pointer',
              backgroundColor: 'var(--accent-blue)',
              color:           '#fff',
              fontWeight:      600,
              fontSize:        '14px',
              opacity:         isPending ? 0.7 : 1,
            }}
          >
            {isPending ? tr('جارٍ الحفظ...') : tr('حفظ المعاملة')}
          </button>
        </form>
      </div>
    </div>
  )
}
