import {
  pgTable,
  uuid,
  text,
  decimal,
  timestamp,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'purchasing',
  'arrived',
  'pickup',
  'done',
  'cancelled',
])

export const currencyEnum = pgEnum('currency', ['JPY', 'KRW', 'USD', 'TWD'])

// profiles.id 對應 auth.users(id)，FK 由 Supabase SQL 建立，Drizzle 不直接引用
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name'),
  defaultFeeRate: decimal('default_fee_rate', { precision: 5, scale: 2 }).default('10.00'),
  defaultCurrency: text('default_currency').default('JPY'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  contact: text('contact'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  customerId: uuid('customer_id'),
  customerName: text('customer_name').notNull(),
  status: orderStatusEnum('status').default('pending').notNull(),
  note: text('note'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull(),
  userId: uuid('user_id').notNull(),
  productName: text('product_name').notNull(),
  originalPrice: decimal('original_price', { precision: 12, scale: 2 }).notNull(),
  currency: currencyEnum('currency').notNull(),
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 4 }).notNull(),
  feeRate: decimal('fee_rate', { precision: 5, scale: 2 }).notNull(),
  shippingShare: decimal('shipping_share', { precision: 10, scale: 2 }).default('0'),
  finalPriceTwd: decimal('final_price_twd', { precision: 12, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull(),
  userId: uuid('user_id').notNull(),
  amountTwd: decimal('amount_twd', { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const exchangeRateCache = pgTable('exchange_rate_cache', {
  currency: text('currency').primaryKey(),
  rateToTwd: decimal('rate_to_twd', { precision: 10, scale: 4 }).notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
})

// Relations
export const ordersRelations = relations(orders, ({ many }) => ({
  orderItems: many(orderItems),
  payments: many(payments),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}))

export type Profile = typeof profiles.$inferSelect
export type Customer = typeof customers.$inferSelect
export type Order = typeof orders.$inferSelect
export type OrderItem = typeof orderItems.$inferSelect
export type Payment = typeof payments.$inferSelect
export type OrderStatus = typeof orderStatusEnum.enumValues[number]
export type Currency = typeof currencyEnum.enumValues[number]
