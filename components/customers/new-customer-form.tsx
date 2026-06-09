'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createCustomer } from '@/lib/actions/customers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, '請輸入客戶姓名'),
  contact: z.string().optional(),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function NewCustomerForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', contact: '', note: '' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await createCustomer(data)
      toast.success('客戶新增成功')
      router.push('/customers')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '新增失敗，請稍後再試')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">客戶姓名 <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              placeholder="輸入姓名或暱稱"
              className="h-11"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact">聯絡方式</Label>
            <Input
              id="contact"
              placeholder="電話、Line ID、IG 等（選填）"
              className="h-11"
              {...form.register('contact')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">備註</Label>
            <Textarea
              id="note"
              placeholder="客戶偏好、特殊備注等（選填）"
              rows={3}
              {...form.register('note')}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => router.back()}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              className="flex-1 h-11"
              onClick={form.handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> 新增中...</> : '新增客戶'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
