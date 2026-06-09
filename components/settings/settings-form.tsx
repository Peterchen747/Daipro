'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateProfile } from '@/lib/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const schema = z.object({
  defaultFeeRate: z.number({ invalid_type_error: '請輸入數字' }).min(0).max(100),
})
type FormValues = z.infer<typeof schema>

interface Props {
  email: string
  defaultFeeRate: number
}

export function SettingsForm({ email, defaultFeeRate }: Props) {
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { defaultFeeRate },
  })

  async function onSubmit(data: FormValues) {
    setSaving(true)
    try {
      await updateProfile(data)
      toast.success('設定已儲存')
    } catch {
      toast.error('儲存失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">帳號</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">登入 Email</Label>
            <p className="text-sm font-medium">{email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">代購設定</CardTitle>
          <CardDescription>新增訂單時的預設值</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="defaultFeeRate">預設代購費率（%）</Label>
              <p className="text-xs text-muted-foreground">你向客戶收取的服務費比例，新增訂單時自動帶入</p>
              <Input
                id="defaultFeeRate"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.5}
                className="h-11 max-w-40"
                {...register('defaultFeeRate', { valueAsNumber: true })}
              />
              {errors.defaultFeeRate && (
                <p className="text-sm text-destructive">{errors.defaultFeeRate.message}</p>
              )}
            </div>
            <Button type="submit" disabled={saving} className="h-11">
              {saving ? '儲存中...' : '儲存設定'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
