import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_CURRENCIES = ['JPY', 'KRW', 'USD']
const CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const currency = searchParams.get('currency')

  if (!currency || !ALLOWED_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
  }

  // 查 Supabase 快取
  const { data: cached } = await supabase
    .from('exchange_rate_cache')
    .select('*')
    .eq('currency', currency)
    .single()

  if (cached) {
    const fetchedAt = new Date(cached.fetched_at).getTime()
    if (Date.now() - fetchedAt < CACHE_DURATION_MS) {
      return NextResponse.json({ rate: parseFloat(cached.rate_to_twd), currency, cached: true })
    }
  }

  // 打外部 API（open.er-api.com 支援 TWD）
  const res = await fetch(
    `https://open.er-api.com/v6/latest/${currency}`,
    { next: { revalidate: 3600 } }
  )

  if (!res.ok) {
    if (cached) {
      return NextResponse.json({ rate: parseFloat(cached.rate_to_twd), currency, cached: true })
    }
    return NextResponse.json({ error: '無法取得匯率' }, { status: 502 })
  }

  const data = await res.json()
  const rate: number | undefined = data.rates?.TWD

  if (!rate) {
    return NextResponse.json({ error: '匯率格式錯誤' }, { status: 502 })
  }

  // 寫入快取（upsert）
  await supabase
    .from('exchange_rate_cache')
    .upsert({ currency, rate_to_twd: rate, fetched_at: new Date().toISOString() })

  return NextResponse.json({ rate, currency, cached: false })
}
