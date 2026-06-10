'use server'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, orderItems, payments, customers } from '@/lib/db/schema'
import { eq, and, isNull, count } from 'drizzle-orm'
import { calcFinalPriceTwd } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export async function seedDemoDataIfNeeded(userId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.demoSeeded) return

  const [{ count: orderCount }] = await db
    .select({ count: count() })
    .from(orders)
    .where(and(eq(orders.userId, userId), isNull(orders.deletedAt)))

  if (Number(orderCount) > 0) {
    await supabase.auth.updateUser({ data: { demoSeeded: true } })
    return
  }

  const now = new Date()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000)

  // 訂單一：小美 - 日本藥妝（已完成、全額收款）
  const [o1] = await db.insert(orders).values({
    userId,
    customerName: '小美',
    status: 'done',
    note: '範例訂單',
    createdAt: daysAgo(7),
  }).returning()

  const o1Price = calcFinalPriceTwd({ originalPrice: 6800, exchangeRate: 0.2150, feeRate: 10, shippingShare: 80, quantity: 1 })
  await db.insert(orderItems).values({
    orderId: o1.id, userId,
    productName: 'HAKU 美白精華液',
    originalPrice: '6800', currency: 'JPY',
    exchangeRate: '0.2150', feeRate: '10', shippingShare: '80',
    finalPriceTwd: o1Price.toString(), quantity: 1,
  })
  await db.insert(payments).values({
    orderId: o1.id, userId,
    amountTwd: o1Price.toString(),
    paidAt: daysAgo(5), note: 'LINE Pay',
  })

  // 訂單二：大雄 - 韓國護膚品（處理中、部分收款）
  const [o2] = await db.insert(orders).values({
    userId,
    customerName: '大雄',
    status: 'purchasing',
    note: '範例訂單',
    createdAt: daysAgo(3),
  }).returning()

  const o2Item1 = calcFinalPriceTwd({ originalPrice: 28000, exchangeRate: 0.0240, feeRate: 10, shippingShare: 60, quantity: 1 })
  const o2Item2 = calcFinalPriceTwd({ originalPrice: 19000, exchangeRate: 0.0240, feeRate: 10, shippingShare: 60, quantity: 2 })
  await db.insert(orderItems).values([
    {
      orderId: o2.id, userId,
      productName: 'COSRX 蝸牛修護精華',
      originalPrice: '28000', currency: 'KRW',
      exchangeRate: '0.0240', feeRate: '10', shippingShare: '60',
      finalPriceTwd: o2Item1.toString(), quantity: 1,
    },
    {
      orderId: o2.id, userId,
      productName: 'Some By Mi 杏仁酸安瓶',
      originalPrice: '19000', currency: 'KRW',
      exchangeRate: '0.0240', feeRate: '10', shippingShare: '60',
      finalPriceTwd: o2Item2.toString(), quantity: 2,
    },
  ])
  await db.insert(payments).values({
    orderId: o2.id, userId,
    amountTwd: '500',
    paidAt: daysAgo(2), note: '訂金',
  })

  // 訂單三：靜香 - 美國球鞋（待處理、尚未收款）
  const [o3] = await db.insert(orders).values({
    userId,
    customerName: '靜香',
    status: 'pending',
    note: '範例訂單',
    createdAt: now,
  }).returning()

  const o3Price = calcFinalPriceTwd({ originalPrice: 150, exchangeRate: 32.50, feeRate: 8, shippingShare: 300, quantity: 1 })
  await db.insert(orderItems).values({
    orderId: o3.id, userId,
    productName: 'Nike Air Max 97',
    originalPrice: '150', currency: 'USD',
    exchangeRate: '32.50', feeRate: '8', shippingShare: '300',
    finalPriceTwd: o3Price.toString(), quantity: 1,
  })

  await supabase.auth.updateUser({ data: { demoSeeded: true } })
  revalidatePath('/dashboard')
}

export async function clearDemoFlag(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.updateUser({ data: { demoSeeded: false } })
}

export async function resetAndSeedCustomers(): Promise<{ count: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  await db.delete(customers).where(eq(customers.userId, user.id))

  const seed = [
    // 1. 只有名字，沒有任何聯絡方式和備註
    { name: '陳大明', contact: null, note: null },
    // 2. 有 LINE ID
    { name: '王雅琪', contact: 'LINE: @yachi_wang', note: null },
    // 3. 有手機，有備註
    { name: '林志偉', contact: '0912-345-678', note: '喜歡日本零食，每次都要附提袋' },
    // 4. 有 IG，VIP 備註
    { name: '張美華', contact: 'IG: @meih_chang', note: 'VIP 客戶，手續費打九折' },
    // 5. 有 email，第一次合作
    { name: 'Tiffany Chen', contact: 'tiffany.chen@gmail.com', note: '朋友介紹，第一次合作' },
    // 6. 有電話，辦公室代購
    { name: '劉俊傑', contact: '02-2345-6789 轉 301', note: '公司訂單，需要開收據' },
    // 7. 有 LINE，付款超準時
    { name: '許雅婷', contact: 'LINE: @yating.hsu', note: '每次都當天付款，超可靠' },
    // 8. 有手機，對價格敏感
    { name: '吳建國', contact: '0988-765-432', note: '每次問完價格才決定，報價要詳細' },
    // 9. 有 LINE，只買韓國美妝
    { name: '黃心怡', contact: 'LINE: @xinyi_h', note: '只要韓國美妝，不買日本' },
    // 10. 多個聯絡方式，長備註
    { name: '蔡宗翰', contact: 'LINE: @tsai_zh / 0976-543-210', note: '老客戶三年了，偶爾會幫朋友一起帶，記得確認是本人還是代訂' },
  ]

  await db.insert(customers).values(
    seed.map((c) => ({ ...c, userId: user.id }))
  )

  revalidatePath('/customers')
  return { count: seed.length }
}
