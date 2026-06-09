'use server'

import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const updateProfileSchema = z.object({
  defaultFeeRate: z.number().min(0).max(100),
})

export async function updateProfile(rawData: unknown) {
  const user = await requireAuth()
  const { defaultFeeRate } = updateProfileSchema.parse(rawData)

  await db
    .update(profiles)
    .set({ defaultFeeRate: defaultFeeRate.toString(), updatedAt: new Date() })
    .where(eq(profiles.id, user.id))

  revalidatePath('/settings')
}

export async function getProfile() {
  const user = await requireAuth()

  return db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  })
}
