-- ============================================================
-- FINOVA — Part 7 security fix: lock the `role` column
-- Run in Supabase SQL Editor AFTER supabase/schema.sql.
-- Safe to re-run.
--
-- Corrections vs. the Part 7 prompt's SQL:
--  * handle_new_user keeps `username` (NOT NULL in profiles) and still
--    creates the 4 wallets — the prompt's version would make every
--    signup fail and leave users with no wallets.
--  * The role lock is a trigger, not a policy that sub-selects from
--    `profiles` (that raises "infinite recursion detected in policy").
-- ============================================================

-- 1. New signups are always role = 'user' (role is never read from metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'   -- always 'user', never from metadata
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, type, balance) VALUES
    (NEW.id, 'cash_iqd',    0),
    (NEW.id, 'cash_usd',    0),
    (NEW.id, 'savings_iqd', 0),
    (NEW.id, 'savings_usd', 0)
  ON CONFLICT (user_id, type) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Users may read and update their own profile, but not insert/delete it
DROP POLICY IF EXISTS "profiles_own"        ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_read"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;

CREATE POLICY "profiles_own_read" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_own_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. Block role changes made through the API with a user's JWT.
--    Requests from logged-in users run as `authenticated` (or `anon`);
--    the service-role key (used by the admin panel's setUserRole) and the
--    SQL Editor (`postgres`) are allowed.
CREATE OR REPLACE FUNCTION public.prevent_role_self_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'role can only be changed by an administrator';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_lock_role ON public.profiles;
CREATE TRIGGER profiles_lock_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_change();

-- 4. Promote your own account to admin (run once, separately):
--    Find your UUID in Supabase → Authentication → Users, then:
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR-USER-ID';
