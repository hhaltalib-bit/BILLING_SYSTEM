-- ════════════════════════════════════════════════════════════
-- 007 — Default category: AI Subscriptions (اشتراكات الذكاء الاصطناعي) 🤖
-- Run once in the Supabase SQL Editor.
--
-- Default categories are global rows (user_id IS NULL) visible to every user
-- (RLS policy "categories_read"), so this single row serves the current user
-- and all future users. Do not insert per-user copies — they would show twice.
-- The icon is a key; the app renders 'ai' as 🤖 (src/lib/categoryIcons.ts).
-- ════════════════════════════════════════════════════════════

INSERT INTO public.categories (user_id, name_ar, name_en, icon, is_default)
SELECT NULL, 'اشتراكات الذكاء الاصطناعي', 'AI Subscriptions', 'ai', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories
   WHERE user_id IS NULL AND name_ar = 'اشتراكات الذكاء الاصطناعي'
);

-- Check:
-- SELECT id, name_ar, name_en, icon, is_default FROM public.categories WHERE user_id IS NULL ORDER BY name_ar;
