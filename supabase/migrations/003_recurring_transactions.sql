-- ============================================================
-- FINOVA — Recurring payments
-- Run in Supabase SQL Editor (after schema.sql). Safe to re-run.
--
-- The fixes prompt proposed a new `recurring_transactions` table, but
-- schema.sql already has `recurring_expenses` (with RLS, index and the
-- RecurringExpense type). This migration extends that table instead of
-- creating a parallel one:
--   * adds a `note` column
--   * allows 'daily' and 'weekly' in addition to 'monthly' / 'yearly'
-- ============================================================

ALTER TABLE public.recurring_expenses
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE public.recurring_expenses
  DROP CONSTRAINT IF EXISTS recurring_expenses_frequency_check;

ALTER TABLE public.recurring_expenses
  ADD CONSTRAINT recurring_expenses_frequency_check
  CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'));

-- Ensure users can only write rows for themselves (schema.sql's policy has USING only)
DROP POLICY IF EXISTS "recurring_own" ON public.recurring_expenses;
CREATE POLICY "recurring_own" ON public.recurring_expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
