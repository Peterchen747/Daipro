'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateOrderSchema, type UpdateOrderInput } from '@/lib/validations/order'
import { updateOrder } from '@/lib/actions/orders'
import { getExchangeRate } from '@/lib/actions/exchange-rate'
import { calcFinalPriceTwd, formatTwd, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { LocationPicker, type LocationOption } from '@/components/orders/location-picker'
import { NumberInput } from '@/components/ui/number-input'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, RefreshCw } from 'lucide-react'
import type { Order, OrderItem } from '@/lib/db/schema'

const CURRENCIES = ['JPY', 'KRW', 'USD', 'TWD'] as const
const CURRENCY_SYMBOLS: Record<string, string> = { JPY: '¥', KRW: '₩', USD: '$', TWD: 'NT$' }

interface Props {
  order: Order & { orderItems: OrderItem[] }
  locationOptions: LocationOption[]
}

export function EditOrderForm({ order, locationOptions }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetchingRate, setFetchingRate] = useState<number | null>(null)

  const form = useForm<UpdateOrderInput>({
    resolver: zodResolver(updateOrderSchema),
    defaultValues: {
      orderId: order.id,
      note: order.note ?? '',
      locationId: order.locationId ?? undefined,
      items: order.orderItems.map((item) => ({
        id: item.id,
        productName: item.productName,
        originalPrice: parseFloat(item.originalPrice),
        currency: item.currency as typeof CURRENCIES[number],
        exchangeRate: parseFloat(item.exchangeRate),
        feeRate: parseFloat(item.feeRate),
        shippingShare: parseFloat(item.shippingShare ?? '0'),
        quantity: item.quantity,
      })),
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })
  const watchedItems = form.watch('items')

  async function fetchRate(index: number) {
    const currency = form.getValues(`items.${index}.currency`)
    if (currency === 'TWD') { form.setValue(`items.${index}.exchangeRate`, 1); return }
    setFetchingRate(index)
    try {
      const rate = await getExchangeRate(currency)
      form.setValue(`items.${index}.exchangeRate`, rate)
      toast.success(`匯率已更新：1 ${currency} = NT$ ${rate}`)
    } catch {
      toast.error('無法取得匯率，請手動輸入')
    } finally {
      setFetchingRate(null)
    }
  }

  async function handleSubmit() {
    const valid = await form.trigger()
    if (!valid) return
    setLoading(true)
    try {
      await updateOrder(form.getValues())
      toast.success('訂單已更新')
      router.push(`/orders/${order.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失敗')
      setLoading(false)
    }
  }

  function addItem() {
    append({
      productName: '',
      originalPrice: 0,
      currency: 'JPY',
      exchangeRate: 0,
      feeRate: parseFloat(order.orderItems[0]?.feeRate ?? '10'),
      shippingShare: 0,
      quantity: 1,
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* 備註 + 地點 */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <Label>地點</Label>
            <LocationPicker
              locations={locationOptions}
              value={form.watch('locationId') ?? undefined}
              onChange={(id) => form.setValue('locationId', id ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>訂單備註</Label>
            <Textarea
              placeholder="選填備註..."
              rows={3}
              {...form.register('note')}
            />
          </div>
        </CardContent>
      </Card>

      {/* 商品明細 */}
      {fields.map((field, index) => {
        const item = watchedItems[index]
        const itemTotal = item?.originalPrice && item?.exchangeRate
          ? calcFinalPriceTwd({
              originalPrice: Number(item.originalPrice),
              exchangeRate: Number(item.exchangeRate),
              feeRate: Number(item.feeRate),
              shippingShare: Number(item.shippingShare),
              quantity: Number(item.quantity),
            })
          : 0

        return (
          <Card key={field.id}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">商品 {index + 1}</p>
                {fields.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>商品名稱 <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="例：Paul & Joe 粉底液"
                  className="h-11"
                  {...form.register(`items.${index}.productName`)}
                />
                {form.formState.errors.items?.[index]?.productName && (
                  <p className="text-sm text-destructive">{form.formState.errors.items[index]?.productName?.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>幣別</Label>
                  <Select
                    value={item?.currency ?? 'JPY'}
                    onValueChange={(val) => {
                      form.setValue(`items.${index}.currency`, val as typeof CURRENCIES[number])
                      form.setValue(`items.${index}.exchangeRate`, 0)
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>數量</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={999}
                    className="h-11"
                    {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>原價（{CURRENCY_SYMBOLS[item?.currency ?? 'JPY']}）<span className="text-destructive">*</span></Label>
                <NumberInput
                  inputMode="decimal"
                  placeholder="0"
                  className="h-11"
                  value={Number(item?.originalPrice ?? 0)}
                  onValueChange={(v) => form.setValue(`items.${index}.originalPrice`, v)}
                />
                {form.formState.errors.items?.[index]?.originalPrice && (
                  <p className="text-sm text-destructive">{form.formState.errors.items[index]?.originalPrice?.message}</p>
                )}
              </div>

              {item?.currency !== 'TWD' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>匯率（1 {item?.currency} = NT$）<span className="text-destructive">*</span></Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1 text-primary"
                      onClick={() => fetchRate(index)}
                      disabled={fetchingRate === index}
                    >
                      {fetchingRate === index
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <RefreshCw className="h-3 w-3" />
                      }
                      更新匯率
                    </Button>
                  </div>
                  <NumberInput
                    inputMode="decimal"
                    step="0.0001"
                    placeholder="0.0000"
                    className="h-11"
                    value={Number(item?.exchangeRate ?? 0)}
                    onValueChange={(v) => form.setValue(`items.${index}.exchangeRate`, v)}
                  />
                  {form.formState.errors.items?.[index]?.exchangeRate && (
                    <p className="text-sm text-destructive">{form.formState.errors.items[index]?.exchangeRate?.message}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>代購費率（%）</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    className="h-11"
                    {...form.register(`items.${index}.feeRate`, { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>運費分攤（NT$）</Label>
                  <NumberInput
                    inputMode="decimal"
                    min={0}
                    placeholder="0"
                    className="h-11"
                    value={Number(item?.shippingShare ?? 0)}
                    onValueChange={(v) => form.setValue(`items.${index}.shippingShare`, v)}
                  />
                </div>
              </div>

              {item?.originalPrice > 0 && item?.exchangeRate > 0 && (
                <>
                  <Separator />
                  <div className="bg-muted/50 rounded-md p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>商品原價</span>
                      <span>{formatCurrency(Number(item.originalPrice), item.currency)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>× 匯率 {Number(item.exchangeRate).toFixed(4)}</span>
                      <span>{formatTwd(Number(item.originalPrice) * Number(item.exchangeRate))}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>代購費 {item.feeRate}%</span>
                      <span>+ {formatTwd(Number(item.originalPrice) * Number(item.exchangeRate) * Number(item.feeRate) / 100)}</span>
                    </div>
                    {Number(item.shippingShare) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>運費分攤</span>
                        <span>+ {formatTwd(Number(item.shippingShare))}</span>
                      </div>
                    )}
                    {Number(item.quantity) > 1 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>數量 × {item.quantity}</span>
                        <span></span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>小計</span>
                      <span>{formatTwd(itemTotal)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )
      })}

      <Button
        type="button"
        variant="outline"
        className="w-full h-11 border-dashed"
        onClick={addItem}
      >
        <Plus className="h-4 w-4 mr-1" />
        新增商品
      </Button>

      {form.formState.errors.items?.root && (
        <p className="text-sm text-destructive text-center">{form.formState.errors.items.root.message}</p>
      )}

      <div className="flex gap-3 pb-6">
        <Button
          variant="outline"
          className="flex-1 h-11"
          onClick={() => router.back()}
          disabled={loading}
        >
          取消
        </Button>
        <Button
          className="flex-1 h-11"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '儲存變更'}
        </Button>
      </div>
    </div>
  )
}
