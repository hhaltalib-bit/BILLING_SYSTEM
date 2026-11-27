'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n'
import { useUndoToast, dismissUndoToast, showUndoToast } from '@/lib/useUndoToast'

interface Props {
  message: string
  onUndo?: () => void | Promise<void>
  onDismiss: () => void
  duration?: number  // ms, default 5000
}

/** Bottom toast with a countdown bar. The countdown pauses while hovered or focused. */
export function UndoToast({ message, onUndo, onDismiss, duration = 5000 }: Props) {
  const t = useT()
  const [remaining, setRemaining] = useState(duration)
  const [paused, setPaused] = useState(false)
  const [busy, setBusy] = useState(false)
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    if (paused || busy) return
    let last = Date.now()
    const timer = setInterval(() => {
      const now = Date.now()
      const elapsed = now - last
      last = now
      setRemaining((r) => Math.max(0, r - elapsed))
    }, 50)
    return () => clearInterval(timer)
  }, [paused, busy])

  useEffect(() => {
    if (remaining === 0) dismissRef.current()
  }, [remaining])

  async function handleUndo() {
    if (!onUndo || busy) return
    setBusy(true)
    try {
      await onUndo()
      onDismiss()
    } catch (err) {
      setBusy(false)
      showUndoToast(`❌ ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const progress = (remaining / duration) * 100

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, width: 'calc(100% - 32px)', maxWidth: '480px',
        backgroundColor: 'var(--bg-secondary)', borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}
    >
      <div aria-hidden="true" style={{ height: '3px', backgroundColor: 'var(--accent-blue)', width: `${progress}%`, transition: 'width 0.05s linear' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', gap: '12px' }}>
        <span style={{ fontSize: '14px', color: 'var(--text-primary)', flex: 1 }}>{message}</span>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {onUndo && (
            <button
              type="button"
              onClick={handleUndo}
              disabled={busy}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--accent-blue)', color: '#fff', opacity: busy ? 0.7 : 1,
                fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontSize: '13px',
              }}
            >
              {busy ? '…' : t('تراجع')}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('إغلاق')}
            style={{
              padding: '6px 10px', borderRadius: '8px',
              border: '1px solid var(--border-color)', backgroundColor: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px',
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

/** Renders the app-wide toast. After a successful Undo, refreshes every view. */
export function UndoToastHost() {
  const { toast } = useUndoToast()
  const router = useRouter()
  if (!toast) return null
  const undo = toast.onUndo
  return (
    <UndoToast
      key={toast.id}
      message={toast.message}
      onUndo={undo && (async () => {
        await undo()
        window.dispatchEvent(new Event('finova:data-changed'))
        router.refresh()
      })}
      onDismiss={() => dismissUndoToast(toast.id)}
    />
  )
}
