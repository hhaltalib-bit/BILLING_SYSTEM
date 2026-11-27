'use client'

import { useT } from '@/lib/i18n'
import { useFormatters } from '@/lib/useFormatters'

import { useState, useEffect } from 'react'
import { getAdminPageData, setUserRole } from './actions'
import type { AdminUser } from '@/types/admin'
import { Shield, Users, ArrowUpDown } from 'lucide-react'

interface AdminData {
  users: AdminUser[]
  stats: { userCount: number; transactionCount: number; goldCount: number; walletCount: number }
}

export default function AdminPage() {
  const t = useT()
  const fmt = useFormatters()
  const [data,    setData]    = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [working, setWorking] = useState<string | null>(null)

  async function load() {
    try {
      const d = await getAdminPageData()
      setData(d)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleRoleToggle(user: AdminUser) {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`${t('تغيير دور')} ${user.email} ${t('إلى')} "${newRole}"؟`)) return
    setWorking(user.id)
    try {
      await setUserRole(user.id, newRole)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    } finally {
      setWorking(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-secondary)' }}>
      {t('جارٍ التحميل...')}
    </div>
  )

  if (error) return (
    <div className="card text-center py-16" style={{ color: 'var(--accent-red)' }}>
      <Shield className="w-12 h-12 mx-auto mb-3" />
      <div className="font-bold text-lg mb-2">{t('غير مصرح')}</div>
      <p className="text-sm">{error}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Shield className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
          {t('لوحة الإدارة')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('إدارة المستخدمين والنظام')}</p>
      </div>

      {/* Stats Row */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'المستخدمون',   value: data.stats.userCount,        icon: '👥' },
            { label: 'المعاملات',    value: data.stats.transactionCount, icon: '💸' },
            { label: 'مشتريات الذهب',value: data.stats.goldCount,        icon: '🥇' },
            { label: 'المحافظ',      value: data.stats.walletCount,      icon: '👛' },
          ].map((s) => (
            <div key={s.label} className="card text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{t(s.label)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>{t('المستخدمون')}</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['البريد الإلكتروني', 'الاسم', 'الدور', 'تاريخ التسجيل', 'إجراء'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.users.map((user) => (
                <tr
                  key={user.id}
                  style={{ borderBottom: '1px solid var(--border-color)', opacity: working === user.id ? 0.5 : 1 }}
                >
                  <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>{user.email}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{user.full_name ?? '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      backgroundColor: user.role === 'admin' ? 'var(--accent-gold)22' : 'var(--bg-primary)',
                      color: user.role === 'admin' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      border: '1px solid currentColor',
                    }}>
                      {user.role === 'admin' ? t('👑 مسؤول') : t('مستخدم')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {fmt.date(user.created_at)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      onClick={() => handleRoleToggle(user)}
                      disabled={working === user.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                        border: '1px solid var(--border-color)', cursor: 'pointer',
                        backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)',
                      }}
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      {user.role === 'admin' ? t('تقليل') : t('ترقية')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
