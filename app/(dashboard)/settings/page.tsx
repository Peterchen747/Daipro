import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { SettingsForm } from '@/components/settings/settings-form'
import { LogoutButton } from '@/components/settings/logout-button'

export default async function SettingsPage() {
  const user = await requireAuth()
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  })

  const email = authUser?.email ?? ''
  const defaultFeeRate = parseFloat(profile?.defaultFeeRate ?? '10')

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-bold hidden md:block">設定</h1>
      <SettingsForm email={email} defaultFeeRate={defaultFeeRate} />
      <LogoutButton />
    </div>
  )
}
