'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPaymentSchema, type CreatePaymentInput } from '@/lib/validations/order'
import { createPayment } from '@/lib/actions/payments'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Plus } from 'lucide-react'

export function AddPaymentForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<CreatePaymentInput>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      orderId,
      amountTwd: 0,
      paidAt: new Date().toISOString().slice(0, 10),
      note: '',
    },
  })

  async function onSubmit(data: CreatePaymentInput) {
    setLoading(true)
    try {
      await createPayment(data)
      toast.success('收款記錄已新增')
      setOpen(false)
      form.reset({ orderId, amountTwd: 0, paidAt: new Date().toISOString().slice(0, 10) })
    } catch {
      toast.error('新增失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            新增收款
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>新增收款記錄</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>收款金額（NT$）</Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0"
              className="h-11"
              {...form.register('amountTwd', { valueAsNumber: true })}
            />
            {form.formState.errors.amountTwd && (
              <p className="text-sm text-destructive">{form.formState.errors.amountTwd.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>收款日期</Label>
            <Input
              type="date"
              className="h-11"
              {...form.register('paidAt')}
            />
          </div>

          <div className="space-y-1.5">
            <Label>備註（選填）</Label>
            <Input
              placeholder="例：現金、轉帳末5碼1234"
              className="h-11"
              {...form.register('note')}
            />
          </div>

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '確認收款'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
