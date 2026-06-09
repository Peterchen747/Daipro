'use server'

import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { exchangeRateCache } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const ALLOWED_CURRENCIES = ['JPY', 'KRW', 'USD'] as const
const CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour

type AllowedCurrency = typeof ALLOWED_CURRENCIES[number]

export async function getExchangeRate(currency: string): Promise<number> {
  await requireAuth()

  if (!ALLOWED_CURRENCIES.includes(currency as AllowedCurrency)) {
    throw new Error('不支援的幣別')
  }

  // 查快取
  const cached = await db
    .select()
    .from(exchangeRateCache)
    .where(eq(exchangeRateCache.currency, currency))
    .limit(1)

  if (cached.length > 0) {
    const fetchedAt = new Date(cached[0].fetchedAt!).getTime()
    if (Date.now() - fetchedAt < CACHE_DURATION_MS) {
      return parseFloat(cached[0].rateToTwd)
    }
  }

  // 快取過期或不存在，打外部 API
  // 使用 open.er-api.com，免費且支援 TWD
  const res = await fetch(
    `https://open.er-api.com/v6/latest/${currency}`
  )

  if (!res.ok) {
    if (cached.length > 0) {
      return parseFloat(cached[0].rateToTwd)
    }
    throw new Error('無法取得匯率，請稍後再試')
  }

  const data = await res.json()
  const rate = data.rates?.TWD

  if (!rate) {
    if (cached.length > 0) {
      return parseFloat(cached[0].rateToTwd)
    }
    throw new Error('匯率資料格式錯誤')
  }

  // 寫入快取（upsert）
  await db
    .insert(exchangeRateCache)
    .values({
      currency,
      rateToTwd: rate.toString(),
      fetchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: exchangeRateCache.currency,
      set: {
        rateToTwd: rate.toString(),
        fetchedAt: new Date(),
      },
    })

  return rate
}
