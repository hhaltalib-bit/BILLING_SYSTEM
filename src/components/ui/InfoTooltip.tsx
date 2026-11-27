'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useT } from '@/lib/i18n'

interface Props {
  /** Explanation text (Arabic key — translated here; English passes through unchanged) */
  text: string
  /** 'bottom' (default) opens below the icon, 'top' above. It is anchored to the
   *  icon's inline-end edge so it stays inside the card in both RTL and LTR. */
  position?: 'top' | 'bottom'
}

/** Small "?" button that explains a card. Hover or focus shows it; tap/click toggles; Escape or outside click closes. */
export function InfoTooltip({ text, position = 'bottom' }: Props) {
  const t = useT()
  const id = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const [pinned, setPinned] = useState(false)   // opened by click/tap
  const [hover, setHover] = useState(false)     // mouse hover or keyboard focus
  const visible = pinned || hover

  useEffect(() => {
    if (!visible) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { setPinned(false); setHover(false) } }
    function onDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setPinned(false); setHover(false) }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [visible])

  return (
    <span
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(true) }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover(false) }}
    >
      <button
        type="button"
        aria-label={t('معلومات')}
        aria-describedby={visible ? id : undefined}
        aria-expanded={visible}
        onClick={(e) => { e.stopPropagation(); setPinned((v) => !v) }}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        style={{
          width: '20px', height: '20px', borderRadius: '50%',
          border: '1px solid var(--border-color)', backgroundColor: 'transparent',
          color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, padding: 0,
        }}
      >
        ?
      </button>

      {visible && (
        <span
          id={id}
          role="tooltip"
          style={{
            position: 'absolute', zIndex: 100,
            insetInlineEnd: 0,
            ...(position === 'top' ? { bottom: '100%', marginBottom: '6px' } : { top: '100%', marginTop: '6px' }),
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px', padding: '8px 12px',
            fontSize: '12px', fontWeight: 400, color: 'var(--text-primary)',
            width: 'max-content', maxWidth: 'min(240px, 80vw)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            lineHeight: 1.5, whiteSpace: 'normal', textAlign: 'start',
          }}
        >
          {t(text)}
        </span>
      )}
    </span>
  )
}
