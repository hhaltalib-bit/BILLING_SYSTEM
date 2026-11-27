-- ════════════════════════════════════════════════════════════
-- 008 — Default categories: Cat Food (أكل القطط) 🐱 and Snacks (سناكس) 🍿
-- Run once in the Supabase SQL Editor.
--
-- Default categories are global rows (user_id IS NULL) visible to every user
-- (RLS policy "categories_read"). Do not insert per-user copies.
-- Icons are keys; the app renders 'cat' as 🐱 and 'snack' as 🍿
-- (src/lib/categoryIcons.ts).
-- ════════════════════════════════════════════════════════════

INSERT INTO public.categories (user_id, name_ar, name_en, icon, is_default)
SELECT NULL, 'أكل القطط', 'Cat Food', 'cat', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories
   WHERE user_id IS NULL AND name_ar = 'أكل القطط'
);

INSERT INTO public.categories (user_id, name_ar, name_en, icon, is_default)
SELECT NULL, 'سناكس', 'Snacks', 'snack', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories
   WHERE user_id IS NULL AND name_ar = 'سناكس'
);

-- Check:
-- SELECT id, name_ar, name_en, icon, is_default FROM public.categories WHERE user_id IS NULL ORDER BY name_ar;
