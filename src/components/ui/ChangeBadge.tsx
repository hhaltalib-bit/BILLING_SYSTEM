'use client'

import { useFormatters } from '@/lib/useFormatters'
import { useT } from '@/lib/i18n'

interface Props {
  current: number
  previous: number
  /** true when an increase is bad (e.g. expenses): up → red, down → green */
  invert?: boolean
}

/** ↑/↓ percentage change versus the previous period. Hidden when there is no baseline. */
export function ChangeBadge({ current, previous, invert = false }: Props) {
  const fmt = useFormatters()
  const t = useT()
  if (previous === 0) return null

  // Divide by |previous| so a negative baseline (e.g. a negative net) still gives the right direction
  const pct = ((current - previous) / Math.abs(previous)) * 100
  if (!Number.isFinite(pct)) return null
  const up = pct >= 0
  const good = invert ? !up : up
  const color = Math.abs(pct) < 0.05 ? 'var(--text-secondary)' : good ? 'var(--accent-green)' : 'var(--accent-red)'

  return (
    <span
      title={t('مقارنة بالشهر الماضي')}
      style={{
        fontSize: '12px', fontWeight: 600, color,
        border: `1px solid ${color}`,
        padding: '1px 7px', borderRadius: '20px',
        marginInlineStart: '6px', whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">{up ? '↑' : '↓'}</span>
      <span className="sr-only">{up ? '+' : '−'}</span> {fmt.pct(Math.abs(pct))}
    </span>
  )
}
