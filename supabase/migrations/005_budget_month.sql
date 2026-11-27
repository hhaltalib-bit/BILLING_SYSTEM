-- ════════════════════════════════════════════════════════════
-- 005 — Budget month: which month's budget a transaction belongs to
-- Run once in the Supabase SQL Editor BEFORE deploying the code that reads
-- `budget_month` / `is_salary`. Requires 004 to have been run.
--
-- The salary is paid around the 27th but funds the NEXT month: a salary
-- dated 2026-11-27 belongs to December (budget_month = 2026-12-01).
-- Everything else belongs to the month of its own date.
--
--   is_salary    — marks salary payments (previously recognised only by the
--                  editable note text 'راتب شهري')
--   budget_month — always the 1st of the target month; used for every
--                  budget / forecast / month-comparison calculation
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_salary    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS budget_month DATE;

-- Existing salary rows (created by the "Add salary" button)
UPDATE public.transactions
   SET is_salary = TRUE
 WHERE type = 'income' AND note = 'راتب شهري' AND NOT is_salary;

-- The rule, in one place. Keep SALARY_CUTOFF_DAY in src/lib/budgetMonth.ts in sync.
CREATE OR REPLACE FUNCTION public.budget_month_for(p_date DATE, p_is_salary BOOLEAN)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_is_salary AND extract(day FROM p_date) >= 25
      THEN (date_trunc('month', p_date) + interval '1 month')::date
    ELSE date_trunc('month', p_date)::date
  END
$$;

-- Backfill. (004's balance trigger ignores this: no money field changes.)
UPDATE public.transactions
   SET budget_month = public.budget_month_for(date, is_salary)
 WHERE budget_month IS NULL;

ALTER TABLE public.transactions ALTER COLUMN budget_month SET NOT NULL;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_budget_month_first_day;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_budget_month_first_day CHECK (extract(day FROM budget_month) = 1);

-- Fill / maintain budget_month automatically:
--   INSERT without budget_month → derived from date (+ salary rule)
--   UPDATE that changes date or is_salary but not budget_month → re-derived
--   an explicit budget_month is kept (normalised to the 1st of its month)
CREATE OR REPLACE FUNCTION public.set_budget_month()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.budget_month IS NULL THEN
      NEW.budget_month := public.budget_month_for(NEW.date, NEW.is_salary);
    END IF;
  ELSIF NEW.budget_month IS NOT DISTINCT FROM OLD.budget_month
        AND (NEW.date IS DISTINCT FROM OLD.date OR NEW.is_salary IS DISTINCT FROM OLD.is_salary) THEN
    NEW.budget_month := public.budget_month_for(NEW.date, NEW.is_salary);
  END IF;
  NEW.budget_month := date_trunc('month', NEW.budget_month)::date;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS transactions_budget_month ON public.transactions;
CREATE TRIGGER transactions_budget_month
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_budget_month();

CREATE INDEX IF NOT EXISTS idx_tx_user_budget_month ON public.transactions(user_id, budget_month);
