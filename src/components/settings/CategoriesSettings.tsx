'use client'

import { useCallback, useEffect, useState } from 'react'
import { getCategories, deleteCategory } from '@/app/(dashboard)/transactions/actions'
import { categoryEmoji } from '@/lib/categoryIcons'
import { useT } from '@/lib/i18n'
import type { Category } from '@/types/transaction'
import { Lock, Trash2 } from 'lucide-react'

/** Settings → Categories: shared defaults are locked; the user's own categories can be deleted. */
export function CategoriesSettings() {
  const t = useT()
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setCats(await getCategories())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const onChanged = () => { load() }
    window.addEventListener('finova:data-changed', onChanged)
    return () => window.removeEventListener('finova:data-changed', onChanged)
  }, [load])

  async function handleDelete(id: string) {
    setDeletingId(id)
    setError('')
    try {
      const r = await deleteCategory(id)
      if (!r.success) { setError(t(r.error ?? 'حدث خطأ')); return }
      setCats((prev) => prev.filter((c) => c.id !== id))
      setConfirmId(null)
      window.dispatchEvent(new Event('finova:data-changed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeletingId(null)
    }
  }

  const defaults = cats.filter((c) => !c.is_custom)
  const custom   = cats.filter((c) => c.is_custom)

  const chip: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 12px', borderRadius: '10px',
    backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
    fontSize: '14px', color: 'var(--text-primary)',
  }

  return (
    <div className="card">
      <h2 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>🏷️ {t('الفئات')}</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
        {t('الفئات الافتراضية ثابتة 🔒. يمكنك إضافة فئات جديدة من نافذة إضافة حركة، وحذف فئاتك هنا.')}
      </p>

      {error && <p role="alert" className="text-sm mb-3" style={{ color: 'var(--accent-red)' }}>{error}</p>}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('جارٍ التحميل...')}</p>
      ) : (
        <>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {defaults.map((c) => (
              <li key={c.id} style={chip}>
                <span aria-hidden="true">{categoryEmoji(c.icon)}</span>
                <span style={{ flex: 1 }}>{t(c.name)}</span>
                <Lock className="w-4 h-4" aria-label={t('فئة افتراضية')} style={{ color: 'var(--text-secondary)' }} />
              </li>
            ))}
          </ul>

          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('فئاتي')}</h3>
          {custom.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('لا توجد فئات مخصصة بعد')}</p>
          ) : (
            <ul className="space-y-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {custom.map((c) => (
                <li key={c.id} style={{ ...chip, flexWrap: 'wrap' }}>
                  <span aria-hidden="true">{categoryEmoji(c.icon)}</span>
                  <span style={{ flex: 1, overflowWrap: 'anywhere' }}>{c.name}</span>
                  {confirmId === c.id ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                      <span className="text-xs" style={{ color: 'var(--accent-red)', flex: 1, minWidth: '180px' }}>
                        {t('الحركات بهذه الفئة ستصبح بدون فئة، وحدود الميزانية الخاصة بها ستُحذف.')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent-red)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: deletingId === c.id ? 'not-allowed' : 'pointer', opacity: deletingId === c.id ? 0.7 : 1 }}
                      >
                        {deletingId === c.id ? t('جاري الحذف...') : t('تأكيد الحذف')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={deletingId === c.id}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}
                      >
                        {t('إلغاء')}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(c.id)}
                      aria-label={`${t('حذف')} ${c.name}`}
                      title={t('حذف')}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--accent-red)', background: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
