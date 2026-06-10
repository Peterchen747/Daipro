import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const seed = [
  { name: '陳大明', contact: null, note: null },
  { name: '王雅琪', contact: 'LINE: @yachi_wang', note: null },
  { name: '林志偉', contact: '0912-345-678', note: '喜歡日本零食，每次都要附提袋' },
  { name: '張美華', contact: 'IG: @meih_chang', note: 'VIP 客戶，手續費打九折' },
  { name: 'Tiffany Chen', contact: 'tiffany.chen@gmail.com', note: '朋友介紹，第一次合作' },
  { name: '劉俊傑', contact: '02-2345-6789 轉 301', note: '公司訂單，需要開收據' },
  { name: '許雅婷', contact: 'LINE: @yating.hsu', note: '每次都當天付款，超可靠' },
  { name: '吳建國', contact: '0988-765-432', note: '每次問完價格才決定，報價要詳細' },
  { name: '黃心怡', contact: 'LINE: @xinyi_h', note: '只要韓國美妝，不買日本' },
  { name: '蔡宗翰', contact: 'LINE: @tsai_zh / 0976-543-210', note: '老客戶三年了，偶爾幫朋友一起帶，記得確認是本人還是代訂' },
]

export async function POST() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: { users }, error } = await admin.auth.admin.listUsers()
  if (error || !users?.length) {
    return NextResponse.json({ ok: false, error: '找不到使用者' }, { status: 400 })
  }

  const userId = users[0].id

  await db.delete(customers).where(eq(customers.userId, userId))
  await db.insert(customers).values(seed.map((c) => ({ ...c, userId })))

  revalidatePath('/customers')
  return NextResponse.json({ ok: true, userId, count: seed.length })
}
