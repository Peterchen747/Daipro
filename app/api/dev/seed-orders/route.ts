import { db } from '@/lib/db'
import { orders, orderItems, payments, customers, locations } from '@/lib/db/schema'
import { calcFinalPriceTwd } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'
import { eq, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

function p(originalPrice: number, exchangeRate: number, feeRate: number, shippingShare: number, quantity = 1) {
  return calcFinalPriceTwd({ originalPrice, exchangeRate, feeRate, shippingShare, quantity }).toString()
}

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

  // --- 清除舊資料 ---
  const existingOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.userId, userId))
  const orderIds = existingOrders.map((o) => o.id)
  if (orderIds.length > 0) {
    await db.delete(payments).where(inArray(payments.orderId, orderIds))
    await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds))
  }
  await db.delete(orders).where(eq(orders.userId, userId))
  await db.delete(locations).where(eq(locations.userId, userId))

  // --- 取得現有客戶 ---
  const customerList = await db.select().from(customers).where(eq(customers.userId, userId))
  const byName = Object.fromEntries(customerList.map((c) => [c.name, c.id]))

  // --- 建立地點 ---
  const [loc1, loc2, loc3] = await db.insert(locations).values([
    { userId, name: '大阪採購行', date: '2026-02-15' },
    { userId, name: '首爾美妝團', date: '2026-04-20' },
    { userId, name: '東京夏季行', date: '2026-07-10' },
  ]).returning()

  const now = new Date()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000)

  const created: string[] = []

  // --- 訂單 1：王雅琪 · done · 大阪 · JPY · 單品 · 全付 ---
  {
    const [o] = await db.insert(orders).values({
      userId, customerId: byName['王雅琪'] ?? null,
      customerName: '王雅琪', locationId: loc1.id,
      status: 'done', createdAt: daysAgo(30),
    }).returning()
    const price = p(4200, 0.215, 10, 60)
    await db.insert(orderItems).values({
      orderId: o.id, userId,
      productName: '資生堂 ELIXIR 乳液', originalPrice: '4200', currency: 'JPY',
      exchangeRate: '0.215', feeRate: '10', shippingShare: '60', finalPriceTwd: price, quantity: 1,
    })
    await db.insert(payments).values({ orderId: o.id, userId, amountTwd: price, paidAt: daysAgo(25), note: 'LINE Pay' })
    created.push('王雅琪 done 全付')
  }

  // --- 訂單 2：林志偉 · done · 大阪 · JPY · 多品 · 全付 ---
  {
    const [o] = await db.insert(orders).values({
      userId, customerId: byName['林志偉'] ?? null,
      customerName: '林志偉', locationId: loc1.id,
      status: 'done', note: '要附提袋', createdAt: daysAgo(28),
    }).returning()
    const p1 = p(1200, 0.215, 10, 40)
    const p2 = p(980, 0.215, 10, 40, 3)
    const total = (parseFloat(p1) + parseFloat(p2)).toString()
    await db.insert(orderItems).values([
      { orderId: o.id, userId, productName: '明治巧克力禮盒', originalPrice: '1200', currency: 'JPY', exchangeRate: '0.215', feeRate: '10', shippingShare: '40', finalPriceTwd: p1, quantity: 1 },
      { orderId: o.id, userId, productName: '白色戀人餅乾', originalPrice: '980', currency: 'JPY', exchangeRate: '0.215', feeRate: '10', shippingShare: '40', finalPriceTwd: p2, quantity: 3 },
    ])
    await db.insert(payments).values({ orderId: o.id, userId, amountTwd: total, paidAt: daysAgo(22), note: '現金' })
    created.push('林志偉 done 多品全付')
  }

  // --- 訂單 3：張美華 · done · 首爾 · KRW · VIP 9折 · 全付 ---
  {
    const [o] = await db.insert(orders).values({
      userId, customerId: byName['張美華'] ?? null,
      customerName: '張美華', locationId: loc2.id,
      status: 'done', note: 'VIP 九折', createdAt: daysAgo(20),
    }).returning()
    const price = p(45000, 0.024, 9, 80)
    await db.insert(orderItems).values({
      orderId: o.id, userId,
      productName: 'sulwhasoo 雪花秀精華', originalPrice: '45000', currency: 'KRW',
      exchangeRate: '0.024', feeRate: '9', shippingShare: '80', finalPriceTwd: price, quantity: 1,
    })
    await db.insert(payments).values({ orderId: o.id, userId, amountTwd: price, paidAt: daysAgo(15), note: '匯款' })
    created.push('張美華 done VIP全付')
  }

  // --- 訂單 4：許雅婷 · pickup · 大阪 · JPY · 全付 ---
  {
    const [o] = await db.insert(orders).values({
      userId, customerId: byName['許雅婷'] ?? null,
      customerName: '許雅婷', locationId: loc1.id,
      status: 'pickup', createdAt: daysAgo(18),
    }).returning()
    const price = p(7800, 0.215, 10, 100)
    await db.insert(orderItems).values({
      orderId: o.id, userId,
      productName: 'SKII 青春露 230ml', originalPrice: '7800', currency: 'JPY',
      exchangeRate: '0.215', feeRate: '10', shippingShare: '100', finalPriceTwd: price, quantity: 1,
    })
    await db.insert(payments).values({ orderId: o.id, userId, amountTwd: price, paidAt: daysAgo(10), note: 'LINE Pay' })
    created.push('許雅婷 pickup 全付')
  }

  // --- 訂單 5：黃心怡 · arrived · 首爾 · KRW · 多品 · 只付訂金 · isPendingPayment ---
  {
    const [o] = await db.insert(orders).values({
      userId, customerId: byName['黃心怡'] ?? null,
      customerName: '黃心怡', locationId: loc2.id,
      status: 'arrived', isPendingPayment: true, createdAt: daysAgo(10),
    }).returning()
    const p1 = p(28000, 0.024, 10, 60)
    const p2 = p(19000, 0.024, 10, 60, 2)
    await db.insert(orderItems).values([
      { orderId: o.id, userId, productName: 'COSRX 蝸牛修護精華', originalPrice: '28000', currency: 'KRW', exchangeRate: '0.024', feeRate: '10', shippingShare: '60', finalPriceTwd: p1, quantity: 1 },
      { orderId: o.id, userId, productName: 'Some By Mi 杏仁酸安瓶', originalPrice: '19000', currency: 'KRW', exchangeRate: '0.024', feeRate: '10', shippingShare: '60', finalPriceTwd: p2, quantity: 2 },
    ])
    await db.insert(payments).values({ orderId: o.id, userId, amountTwd: '500', paidAt: daysAgo(8), note: '訂金' })
    created.push('黃心怡 arrived 多品部分付款')
  }

  // --- 訂單 6：蔡宗翰 · purchasing · 東京 · JPY · 多品 · 已付訂金 ---
  {
    const [o] = await db.insert(orders).values({
      userId, customerId: byName['蔡宗翰'] ?? null,
      customerName: '蔡宗翰', locationId: loc3.id,
      status: 'purchasing', createdAt: daysAgo(5),
    }).returning()
    const p1 = p(3500, 0.215, 10, 50)
    const p2 = p(6200, 0.215, 10, 50)
    await db.insert(orderItems).values([
      { orderId: o.id, userId, productName: 'DHC 深層卸妝油', originalPrice: '3500', currency: 'JPY', exchangeRate: '0.215', feeRate: '10', shippingShare: '50', finalPriceTwd: p1, quantity: 1 },
      { orderId: o.id, userId, productName: 'Canmake 腮紅', originalPrice: '6200', currency: 'JPY', exchangeRate: '0.215', feeRate: '10', shippingShare: '50', finalPriceTwd: p2, quantity: 2 },
    ])
    await db.insert(payments).values({ orderId: o.id, userId, amountTwd: '300', paidAt: daysAgo(3), note: '訂金' })
    created.push('蔡宗翰 purchasing 多品訂金')
  }

  // --- 訂單 7：劉俊傑 · purchasing · 東京 · JPY · 未付 ---
  {
    const [o] = await db.insert(orders).values({
      userId, customerId: byName['劉俊傑'] ?? null,
      customerName: '劉俊傑', locationId: loc3.id,
      status: 'purchasing', note: '需要發票', createdAt: daysAgo(3),
    }).returning()
    const price = p(12000, 0.215, 10, 150)
    await db.insert(orderItems).values({
      orderId: o.id, userId,
      productName: 'Panasonic 電動牙刷', originalPrice: '12000', currency: 'JPY',
      exchangeRate: '0.215', feeRate: '10', shippingShare: '150', finalPriceTwd: price, quantity: 1,
    })
    created.push('劉俊傑 purchasing 未付')
  }

  // --- 訂單 8：吳建國 · pending · 東京 · JPY · 未付 · isPendingPayment ---
  {
    const [o] = await db.insert(orders).values({
      userId, customerId: byName['吳建國'] ?? null,
      customerName: '吳建國', locationId: loc3.id,
      status: 'pending', isPendingPayment: true, note: '等待確認規格', createdAt: daysAgo(2),
    }).returning()
    const price = p(25000, 0.215, 10, 200)
    await db.insert(orderItems).values({
      orderId: o.id, userId,
      productName: 'Sony WH-1000XM5 耳機', originalPrice: '25000', currency: 'JPY',
      exchangeRate: '0.215', feeRate: '10', shippingShare: '200', finalPriceTwd: price, quantity: 1,
    })
    created.push('吳建國 pending isPendingPayment')
  }

  // --- 訂單 9：Tiffany Chen · pending · 無地點 · USD · 未付 ---
  {
    const [o] = await db.insert(orders).values({
      userId, customerId: byName['Tiffany Chen'] ?? null,
      customerName: 'Tiffany Chen',
      status: 'pending', createdAt: daysAgo(1),
    }).returning()
    const price = p(89, 32.5, 8, 300)
    await db.insert(orderItems).values({
      orderId: o.id, userId,
      productName: 'Nike Air Force 1 Low', originalPrice: '89', currency: 'USD',
      exchangeRate: '32.5', feeRate: '8', shippingShare: '300', finalPriceTwd: price, quantity: 1,
    })
    created.push('Tiffany pending USD 無地點')
  }

  // --- 訂單 10：陳大明 · cancelled · 無地點 · KRW · 無付款 ---
  {
    const [o] = await db.insert(orders).values({
      userId, customerId: byName['陳大明'] ?? null,
      customerName: '陳大明',
      status: 'cancelled', note: '客戶臨時取消', createdAt: daysAgo(15),
    }).returning()
    const price = p(32000, 0.024, 10, 0)
    await db.insert(orderItems).values({
      orderId: o.id, userId,
      productName: 'Laneige 水凝霜', originalPrice: '32000', currency: 'KRW',
      exchangeRate: '0.024', feeRate: '10', shippingShare: '0', finalPriceTwd: price, quantity: 1,
    })
    created.push('陳大明 cancelled')
  }

  // --- 訂單 11：散客「路人甲」· done · 大阪 · JPY · 全付（無 customerId）---
  {
    const [o] = await db.insert(orders).values({
      userId,
      customerName: '路人甲', locationId: loc1.id,
      status: 'done', createdAt: daysAgo(27),
    }).returning()
    const price = p(2800, 0.215, 10, 50)
    await db.insert(orderItems).values({
      orderId: o.id, userId,
      productName: 'Kit Kat 抹茶', originalPrice: '2800', currency: 'JPY',
      exchangeRate: '0.215', feeRate: '10', shippingShare: '50', finalPriceTwd: price, quantity: 2,
    })
    await db.insert(payments).values({ orderId: o.id, userId, amountTwd: price, paidAt: daysAgo(23), note: '現金' })
    created.push('路人甲 done 無客戶資料')
  }

  // --- 訂單 12：散客「路人乙」· pending · 無地點 · TWD · 無付（無 customerId）---
  {
    const [o] = await db.insert(orders).values({
      userId,
      customerName: '路人乙',
      status: 'pending', createdAt: now,
    }).returning()
    const price = p(1500, 1, 10, 0)
    await db.insert(orderItems).values({
      orderId: o.id, userId,
      productName: '台灣伴手禮禮盒', originalPrice: '1500', currency: 'TWD',
      exchangeRate: '1', feeRate: '10', shippingShare: '0', finalPriceTwd: price, quantity: 1,
    })
    created.push('路人乙 pending TWD 無地點 無客戶資料')
  }

  // --- 訂單 13：散客「路人丙」· arrived · 首爾 · KRW · 部分付款 · isPendingPayment（無 customerId）---
  {
    const [o] = await db.insert(orders).values({
      userId,
      customerName: '路人丙', locationId: loc2.id,
      status: 'arrived', isPendingPayment: true, createdAt: daysAgo(8),
    }).returning()
    const price = p(55000, 0.024, 10, 100)
    await db.insert(orderItems).values({
      orderId: o.id, userId,
      productName: 'innisfree 濟州火山泥毛孔面膜', originalPrice: '55000', currency: 'KRW',
      exchangeRate: '0.024', feeRate: '10', shippingShare: '100', finalPriceTwd: price, quantity: 1,
    })
    await db.insert(payments).values({ orderId: o.id, userId, amountTwd: '400', paidAt: daysAgo(6), note: '訂金' })
    created.push('路人丙 arrived 部分付款 無客戶資料')
  }

  revalidatePath('/dashboard')
  revalidatePath('/orders')

  return NextResponse.json({
    ok: true,
    locations: ['大阪採購行', '首爾美妝團', '東京夏季行'],
    orders: created,
  })
}
