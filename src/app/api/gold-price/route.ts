import { NextResponse } from 'next/server'
import { refreshGoldPriceCache } from '@/lib/gold-price'

// Always run on request: stops `next build` from attempting static generation
// (that attempt threw DYNAMIC_SERVER_USAGE and logged the full metals.dev URL).
export const dynamic = 'force-dynamic'

/** Never log secrets: mask api_key / key query params in any error text. */
function redact(text: string): string {
  return text.replace(/([?&](?:api_)?key=)[^&\s'"]+/gi, '$1***')
}

/**
 * GET /api/gold-price
 *
 * Returns the gold spot price (USD / troy oz). Uses the cached value if it is
 * under 6 hours old, otherwise fetches from metals.dev and updates the cache
 * with the service-role key (gold_price_cache has no write policy).
 * On failure returns 502 and leaves the cache unchanged.
 */
export async function GET() {
  try {
    const { xau_usd, fetched_at, source } = await refreshGoldPriceCache({ maxAgeHours: 6 })
    return NextResponse.json({ xau_usd, price_usd_per_oz: xau_usd, source, fetched_at })
  } catch (err) {
    const message = redact(err instanceof Error ? err.message : String(err))
    console.error('[gold-price]', message)
    return NextResponse.json(
      { error: message },
      { status: 502 }
    )
  }
}
