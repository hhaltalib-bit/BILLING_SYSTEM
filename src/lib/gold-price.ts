import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Gold spot price (USD per troy oz) from metals.dev, cached in the single
 * `gold_price_cache` row (id = 1). Server only.
 *
 * Requires METALS_DEV_API_KEY (free key at https://metals.dev). The free tier
 * has a small monthly quota, so a fresh cached value is reused for
 * `maxAgeHours` instead of calling the API again.
 *
 * On failure this throws and leaves the existing cache untouched — it never
 * writes a made-up price.
 */
export async function refreshGoldPriceCache(
  { maxAgeHours = 6 }: { maxAgeHours?: number } = {}
): Promise<{ xau_usd: number; fetched_at: string; source: 'cache' | 'live' }> {
  const admin = createAdminClient()

  const { data: cached } = await admin
    .from('gold_price_cache')
    .select('xau_usd, fetched_at')
    .eq('id', 1)
    .maybeSingle()

  if (cached?.fetched_at) {
    const ageHours = (Date.now() - new Date(cached.fetched_at).getTime()) / 3_600_000
    if (ageHours < maxAgeHours) {
      return { xau_usd: Number(cached.xau_usd), fetched_at: cached.fetched_at, source: 'cache' }
    }
  }

  const apiKey = process.env.METALS_DEV_API_KEY
  if (!apiKey) throw new Error('METALS_DEV_API_KEY is not set')

  const res = await fetch(
    `https://api.metals.dev/v1/latest?api_key=${encodeURIComponent(apiKey)}&currency=USD&unit=toz`,
    { cache: 'no-store', headers: { Accept: 'application/json' } }
  )
  const json = await res.json().catch(() => null)
  const price = Number(json?.metals?.gold)

  if (!res.ok || json?.status !== 'success' || !Number.isFinite(price) || price < 100) {
    throw new Error(`metals.dev: ${json?.error_message ?? `HTTP ${res.status}`}`)
  }

  const fetched_at = new Date().toISOString()
  const { error } = await admin
    .from('gold_price_cache')
    .upsert({ id: 1, xau_usd: price, fetched_at })

  if (error) throw new Error(error.message)
  return { xau_usd: price, fetched_at, source: 'live' }
}
