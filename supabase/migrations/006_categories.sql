-- ════════════════════════════════════════════════════════════
-- 006 — "Other" default category + deletable custom categories
-- Run once in the Supabase SQL Editor (after 005).
--
-- Default categories are global rows (user_id IS NULL) shared by every
-- user, so "Other" is added once, not per user.
-- Deleting a custom category previously failed whenever a transaction or
-- recurring payment used it (FKs had no ON DELETE action). They now fall
-- back to "no category". budget_limits already cascade (limit is removed).
-- ════════════════════════════════════════════════════════════

INSERT INTO public.categories (user_id, name_ar, name_en, icon, is_default)
SELECT NULL, 'أخرى', 'Other', 'other', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE user_id IS NULL AND name_ar = 'أخرى'
);

-- Re-create the category FKs on transactions / recurring_expenses with
-- ON DELETE SET NULL (looked up by column, whatever the constraint is named).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
     WHERE c.contype = 'f'
       AND c.confrelid = 'public.categories'::regclass
       AND c.conrelid IN ('public.transactions'::regclass, 'public.recurring_expenses'::regclass)
       AND a.attname = 'category_id'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.recurring_expenses
  ADD CONSTRAINT recurring_expenses_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
