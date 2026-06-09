import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().min(1, '請輸入客戶姓名').max(50),
  contact: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
