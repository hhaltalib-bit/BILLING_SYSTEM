-- ============================================================
-- FINOVA — DATABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- profiles: extends auth.users
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  occupation    TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  salary_iqd    NUMERIC(15,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- wallets: 4 fixed wallets per user, auto-created on signup
CREATE TABLE public.wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('cash_iqd','cash_usd','savings_iqd','savings_usd')),
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- categories: global defaults (user_id=NULL) + user custom
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name_ar     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  icon        TEXT NOT NULL,
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.categories (user_id, name_ar, name_en, icon, is_default) VALUES
  (NULL, 'أكل',       'Food',         'food',   TRUE),
  (NULL, 'كهرباء',    'Electricity',  'elec',   TRUE),
  (NULL, 'سيارة',     'Vehicle',      'car',    TRUE),
  (NULL, 'إيجار',     'Rent',         'home',   TRUE),
  (NULL, 'كورسات',    'Courses',      'book',   TRUE),
  (NULL, 'امتحانات',  'Exams',        'exam',   TRUE),
  (NULL, 'ألعاب',     'Gaming',       'game',   TRUE),
  (NULL, 'صيانة',     'Maintenance',  'wrench', TRUE),
  (NULL, 'صحة',       'Health',       'heart',  TRUE),
  (NULL, 'ملابس',     'Clothing',     'shirt',  TRUE),
  (NULL, 'أخرى',      'Other',        'other',  TRUE);

-- transactions: income / expense / transfer
CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL CHECK (currency IN ('IQD','USD')),
  wallet_from_id  UUID REFERENCES public.wallets(id),
  wallet_to_id    UUID REFERENCES public.wallets(id),
  category_id     UUID REFERENCES public.categories(id),
  note            TEXT,
  exchange_rate   NUMERIC(10,2),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- recurring_expenses
CREATE TABLE public.recurring_expenses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  amount        NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency      TEXT NOT NULL CHECK (currency IN ('IQD','USD')),
  wallet_id     UUID REFERENCES public.wallets(id),
  category_id   UUID REFERENCES public.categories(id),
  frequency     TEXT NOT NULL CHECK (frequency IN ('monthly','yearly')),
  day_of_month  INT CHECK (day_of_month BETWEEN 1 AND 31),
  next_date     DATE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- budget_limits: monthly spending cap per category
CREATE TABLE public.budget_limits (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount_iqd   NUMERIC(15,2) NOT NULL CHECK (amount_iqd > 0),
  month        INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         INT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id, month, year)
);

-- savings_goals
CREATE TABLE public.savings_goals (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  target_amount  NUMERIC(15,2) NOT NULL CHECK (target_amount > 0),
  currency       TEXT NOT NULL CHECK (currency IN ('IQD','USD')),
  saved_amount   NUMERIC(15,2) DEFAULT 0,
  deadline       DATE,
  is_shared      BOOLEAN DEFAULT FALSE,
  shared_with_id UUID REFERENCES public.profiles(id),
  is_completed   BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- gold_purchases: each row = one independent batch
-- quantity in mithqal (1 mithqal = 4.68 grams)
CREATE TABLE public.gold_purchases (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity_mithqal   NUMERIC(10,4) NOT NULL CHECK (quantity_mithqal > 0),
  purchase_price_iqd NUMERIC(15,2) NOT NULL CHECK (purchase_price_iqd > 0),
  total_paid_iqd     NUMERIC(15,2) NOT NULL,
  note               TEXT,
  purchased_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- gold_price_cache: single row, updated daily by API route
CREATE TABLE public.gold_price_cache (
  id         INT PRIMARY KEY DEFAULT 1,
  xau_usd    NUMERIC(10,2) NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT only_one_row CHECK (id = 1)
);

-- system_settings: single row, admin-managed
CREATE TABLE public.system_settings (
  id                 INT PRIMARY KEY DEFAULT 1,
  usd_to_iqd         NUMERIC(10,2) NOT NULL DEFAULT 1310,
  gold_local_premium NUMERIC(5,2)  NOT NULL DEFAULT 21.0,
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_by         UUID REFERENCES public.profiles(id),
  CONSTRAINT only_one_row CHECK (id = 1)
);
INSERT INTO public.system_settings DEFAULT VALUES;

-- activity_log: full audit trail
CREATE TABLE public.activity_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- shared_wallets: joint wallet between two users
CREATE TABLE public.shared_wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('IQD','USD')),
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  name        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CHECK (owner_id <> partner_id)
);

-- ── FUNCTIONS & TRIGGERS ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  INSERT INTO public.wallets (user_id, type, balance) VALUES
    (NEW.id, 'cash_iqd',    0),
    (NEW.id, 'cash_usd',    0),
    (NEW.id, 'savings_iqd', 0),
    (NEW.id, 'savings_usd', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallets_updated_at      BEFORE UPDATE ON public.wallets      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at     BEFORE UPDATE ON public.profiles      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER goals_updated_at        BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER shared_updated_at       BEFORE UPDATE ON public.shared_wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_limits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_purchases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_price_cache   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_wallets     ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "profiles_own"        ON public.profiles FOR ALL    USING (auth.uid() = id);
CREATE POLICY "profiles_admin"      ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "wallets_own"         ON public.wallets  FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "wallets_admin"       ON public.wallets  FOR SELECT USING (public.is_admin());
CREATE POLICY "categories_read"     ON public.categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "categories_own"      ON public.categories FOR ALL   USING (auth.uid() = user_id);
CREATE POLICY "tx_own"              ON public.transactions FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "tx_admin"            ON public.transactions FOR SELECT USING (public.is_admin());
CREATE POLICY "recurring_own"       ON public.recurring_expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "budget_own"          ON public.budget_limits      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "goals_own"           ON public.savings_goals FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "goals_shared"        ON public.savings_goals FOR SELECT USING (auth.uid() = shared_with_id AND is_shared = TRUE);
CREATE POLICY "gold_own"            ON public.gold_purchases FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "gold_admin"          ON public.gold_purchases FOR SELECT USING (public.is_admin());
CREATE POLICY "gold_cache_read"     ON public.gold_price_cache FOR SELECT USING (TRUE);
CREATE POLICY "settings_read"       ON public.system_settings  FOR SELECT USING (TRUE);
CREATE POLICY "settings_admin"      ON public.system_settings  FOR UPDATE USING (public.is_admin());
CREATE POLICY "log_own_read"        ON public.activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "log_own_insert"      ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "log_admin"           ON public.activity_log FOR SELECT USING (public.is_admin());
CREATE POLICY "shared_wallets_own"  ON public.shared_wallets FOR ALL USING (auth.uid() = owner_id OR auth.uid() = partner_id);

-- ── INDEXES ───────────────────────────────────────────────

CREATE INDEX idx_tx_user    ON public.transactions(user_id);
CREATE INDEX idx_tx_date    ON public.transactions(date DESC);
CREATE INDEX idx_tx_type    ON public.transactions(type);
CREATE INDEX idx_tx_cat     ON public.transactions(category_id);
CREATE INDEX idx_wallets_u  ON public.wallets(user_id);
CREATE INDEX idx_gold_user  ON public.gold_purchases(user_id);
CREATE INDEX idx_gold_date  ON public.gold_purchases(purchased_at DESC);
CREATE INDEX idx_log_user   ON public.activity_log(user_id);
CREATE INDEX idx_log_date   ON public.activity_log(created_at DESC);
CREATE INDEX idx_budget_u   ON public.budget_limits(user_id, month, year);
CREATE INDEX idx_recurring_u ON public.recurring_expenses(user_id);
CREATE INDEX idx_goals_u    ON public.savings_goals(user_id);

-- ── REALTIME ──────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gold_price_cache;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.savings_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_wallets;
