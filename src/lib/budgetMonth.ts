// Budget-month rules shared by server actions (pure functions, no I/O).
// Mirrors public.budget_month_for() in supabase/migrations/005_budget_month.sql.

/** A salary paid on or after this day of month N belongs to month N+1's budget. */
export const SALARY_CUTOFF_DAY = 25

/** Users' local calendar day (Iraq), as YYYY-MM-DD. */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad' }).format(new Date())
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-11-27" → "2026-11-01" */
export function monthStartOf(dateISO: string): string {
  return `${dateISO.slice(0, 7)}-01`
}

/** Shift a YYYY-MM-01 month by n months: addMonths("2026-12-01", 1) → "2027-01-01" */
export function addMonths(monthStart: string, n: number): string {
  const [y, m] = monthStart.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-01`
}

/** Which month's budget a transaction dated `dateISO` belongs to (YYYY-MM-01). */
export function budgetMonthFor(dateISO: string, isSalary: boolean): string {
  const day = Number(dateISO.slice(8, 10))
  const start = monthStartOf(dateISO)
  return isSalary && day >= SALARY_CUTOFF_DAY ? addMonths(start, 1) : start
}
