import { z } from 'zod'

export const orderItemSchema = z.object({
  productName: z.string().min(1, '請輸入商品名稱').max(100),
  originalPrice: z.number().positive('金額必須大於 0').max(9999999),
  currency: z.enum(['JPY', 'KRW', 'USD', 'TWD']),
  exchangeRate: z.number().positive('匯率必須大於 0'),
  feeRate: z.number().min(0).max(100),
  shippingShare: z.number().min(0),
  quantity: z.number().int().positive().max(999),
})

export const createOrderSchema = z.object({
  customerName: z.string().min(1, '請輸入客戶姓名').max(50),
  customerId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
  items: z.array(orderItemSchema).min(1, '至少新增一項商品'),
})

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['pending', 'purchasing', 'arrived', 'pickup', 'done', 'cancelled']),
})

export const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  amountTwd: z.number().positive('金額必須大於 0'),
  paidAt: z.string().min(1, '請選擇收款日期'),
  note: z.string().max(200).optional(),
})

export const createBulkOrdersSchema = z.object({
  productName: z.string().min(1, '請輸入商品名稱').max(100),
  originalPrice: z.number().positive('金額必須大於 0').max(9999999),
  currency: z.enum(['JPY', 'KRW', 'USD', 'TWD']),
  exchangeRate: z.number().positive('匯率必須大於 0'),
  feeRate: z.number().min(0).max(100),
  photoUrl: z.string().url().optional(),
  note: z.string().max(500).optional(),
  customers: z.array(z.object({
    name: z.string().min(1, '請輸入客戶姓名').max(50),
    customerId: z.string().uuid().optional(),
    quantity: z.number().int().positive().max(999),
  })).min(1, '至少新增一位客戶'),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type OrderItemInput = z.infer<typeof orderItemSchema>
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type CreateBulkOrdersInput = z.infer<typeof createBulkOrdersSchema>
