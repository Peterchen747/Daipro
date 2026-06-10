import { z } from 'zod'

export const createLocationSchema = z.object({
  name: z.string().min(1, '請輸入地點名稱').max(50),
  date: z.string().optional(),
})

export type CreateLocationInput = z.infer<typeof createLocationSchema>
