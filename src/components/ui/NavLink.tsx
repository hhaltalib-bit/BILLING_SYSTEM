'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentProps, MouseEvent } from 'react'

type Props = ComponentProps<typeof Link>

/** Drop-in <Link> that triggers the <PageTransition> overlay. */
export function NavLink({ href, onClick, children, ...rest }: Props) {
  const pathname = usePathname()
  const target = typeof href === 'string' ? href : (href.pathname ?? '')

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    // Skip when the click opens a new tab/window or was cancelled
    const newTab = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0
    // Don't animate when staying on the same page
    if (!e.defaultPrevented && !newTab && pathname !== target) {
      window.dispatchEvent(new Event('finova:nav-start'))
    }
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  )
}
