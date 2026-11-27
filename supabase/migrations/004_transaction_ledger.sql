-- ════════════════════════════════════════════════════════════
-- 004 — Wallet ledger: transactions update wallet balances
-- Run once in the Supabase SQL Editor BEFORE deploying the code that
-- writes `balance_applied` (Fix batch 4).
--
-- Before this migration, adding/deleting a transaction never changed a
-- wallet balance (balances were set by hand; only the monthly salary
-- credited its wallet, from app code). From now on the database applies
-- every transaction to its wallets:
--   income   → +amount on wallet_to
--   expense  → −amount on wallet_from
--   transfer → −amount on wallet_from, +amount on wallet_to
-- and reverses it on DELETE / re-applies it on UPDATE — atomically, inside
-- the same statement, so concurrent writes cannot lose an update.
--
-- `balance_applied` marks rows whose effect is in the balances. Rows that
-- existed before this migration stay FALSE (they never touched a balance),
-- so deleting or editing them leaves balances alone.
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS balance_applied BOOLEAN NOT NULL DEFAULT FALSE;

-- Salary payments were already credited to their wallet by app code.
-- (Runs BEFORE the trigger exists, so this does not apply them twice.)
UPDATE public.transactions
   SET balance_applied = TRUE
 WHERE type = 'income'
   AND note = 'راتب شهري'
   AND wallet_to_id IS NOT NULL
   AND balance_applied = FALSE;

-- Add/subtract a transaction amount on one wallet, converting between the
-- transaction currency and the wallet currency with the row's exchange_rate
-- (IQD per 1 USD). A wallet that no longer exists (e.g. account deletion
-- cascading) is skipped instead of blocking the delete.
CREATE OR REPLACE FUNCTION public.tx_wallet_delta(
  p_wallet   UUID,
  p_user     UUID,
  p_amount   NUMERIC,
  p_currency TEXT,
  p_rate     NUMERIC,
  p_sign     INT
) RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  w_type TEXT;
  w_cur  TEXT;
  v      NUMERIC;
BEGIN
  IF p_wallet IS NULL THEN RETURN; END IF;

  SELECT type INTO w_type FROM public.wallets WHERE id = p_wallet AND user_id = p_user;
  IF w_type IS NULL THEN RETURN; END IF;

  w_cur := upper(right(w_type, 3));           -- cash_iqd → IQD, savings_usd → USD
  IF w_cur = p_currency THEN
    v := p_amount;
  ELSIF p_rate IS NULL OR p_rate <= 0 THEN
    RAISE EXCEPTION 'exchange_rate is required to convert % to %', p_currency, w_cur;
  ELSIF p_currency = 'USD' THEN
    v := p_amount * p_rate;                   -- USD → IQD
  ELSE
    v := p_amount / p_rate;                   -- IQD → USD
  END IF;

  UPDATE public.wallets
     SET balance = balance + p_sign * round(v, 2)
   WHERE id = p_wallet AND user_id = p_user;
END $$;

CREATE OR REPLACE FUNCTION public.apply_tx_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Edits that do not touch money (note, category, date) change nothing.
  IF TG_OP = 'UPDATE'
     AND OLD.balance_applied = NEW.balance_applied
     AND (OLD.type, OLD.amount, OLD.currency, OLD.wallet_from_id, OLD.wallet_to_id, OLD.exchange_rate)
         IS NOT DISTINCT FROM
         (NEW.type, NEW.amount, NEW.currency, NEW.wallet_from_id, NEW.wallet_to_id, NEW.exchange_rate)
  THEN
    RETURN NULL;
  END IF;

  -- Reverse the old effect
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.balance_applied THEN
    IF OLD.type IN ('income', 'transfer') THEN
      PERFORM public.tx_wallet_delta(OLD.wallet_to_id,   OLD.user_id, OLD.amount, OLD.currency, OLD.exchange_rate, -1);
    END IF;
    IF OLD.type IN ('expense', 'transfer') THEN
      PERFORM public.tx_wallet_delta(OLD.wallet_from_id, OLD.user_id, OLD.amount, OLD.currency, OLD.exchange_rate,  1);
    END IF;
  END IF;

  -- Apply the new effect
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.balance_applied THEN
    IF NEW.type IN ('income', 'transfer') THEN
      PERFORM public.tx_wallet_delta(NEW.wallet_to_id,   NEW.user_id, NEW.amount, NEW.currency, NEW.exchange_rate,  1);
    END IF;
    IF NEW.type IN ('expense', 'transfer') THEN
      PERFORM public.tx_wallet_delta(NEW.wallet_from_id, NEW.user_id, NEW.amount, NEW.currency, NEW.exchange_rate, -1);
    END IF;
  END IF;

  RETURN NULL;  -- AFTER trigger: return value is ignored
END $$;

DROP TRIGGER IF EXISTS transactions_apply_balance ON public.transactions;
CREATE TRIGGER transactions_apply_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_tx_balance();
