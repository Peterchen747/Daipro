'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createOrderSchema, type CreateOrderInput, type OrderItemInput } from '@/lib/validations/order'
import { createOrder } from '@/lib/actions/orders'
import { getExchangeRate } from '@/lib/actions/exchange-rate'
import { calcFinalPriceTwd, formatTwd, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

type Step = 1 | 2 | 3

const CURRENCIES = ['JPY', 'KRW', 'USD', 'TWD'] as const
const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥', KRW: '₩', USD: '$', TWD: 'NT$',
}

function defaultItem(feeRate = 10): OrderItemInput {
  return {
    productName: '',
    originalPrice: 0,
    currency: 'JPY',
    exchangeRate: 0,
    feeRate,
    shippingShare: 0,
    quantity: 1,
  }
}

export function NewOrderForm({ defaultFeeRate = 10 }: { defaultFeeRate?: number }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [fetchingRate, setFetchingRate] = useState<number | null>(null)

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customerName: '',
      customerId: undefined,
      note: '',
      items: [defaultItem(defaultFeeRate)],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const watchedItems = form.watch('items')

  async function fetchRate(index: number) {
    const currency = form.getValues(`items.${index}.currency`)
    if (currency === 'TWD') {
      form.setValue(`items.${index}.exchangeRate`, 1)
      return
    }
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

  useEffect(() => {
    if (step !== 2) return
    fields.forEach((_, index) => {
      const item = form.getValues(`items.${index}`)
      if (item.currency !== 'TWD' && (!item.exchangeRate || item.exchangeRate === 0)) {
        fetchRate(index)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  async function handleSubmit() {
    const valid = await form.trigger()
    if (!valid) return

    setLoading(true)
    try {
      const data = form.getValues()
      const result = await createOrder(data)
      toast.success('訂單建立成功！')
      router.push(`/orders/${result.orderId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗，請稍後再試')
      setLoading(false)
    }
  }

  const orderTotal = watchedItems.reduce((sum, item) => {
    if (!item.originalPrice || !item.exchangeRate) return sum
    return sum + calcFinalPriceTwd({
      originalPrice: Number(item.originalPrice),
      exchangeRate: Number(item.exchangeRate),
      feeRate: Number(item.feeRate),
      shippingShare: Number(item.shippingShare),
      quantity: Number(item.quantity),
    })
  }, 0)

  return (
    <div className="max-w-2xl mx-auto">
      {/* 步驟指示器 */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step === s ? 'bg-primary text-primary-foreground' :
              step > s ? 'bg-primary/20 text-primary' :
              'bg-muted text-muted-foreground'
            }`}>
              {s}
            </div>
            <span className="text-sm hidden sm:block text-muted-foreground">
              {s === 1 ? '選客戶' : s === 2 ? '新增商品' : '確認送出'}
            </span>
            {s < 3 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: 客戶 */}
      {step === 1 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="customerName">客戶姓名 <span className="text-destructive">*</span></Label>
              <Input
                id="customerName"
                placeholder="輸入客戶姓名或暱稱"
                className="h-11"
                {...form.register('customerName')}
              />
              {form.formState.errors.customerName && (
                <p className="text-sm text-destructive">{form.formState.errors.customerName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">訂單備註</Label>
              <Textarea
                id="note"
                placeholder="選填，例如：日本行程備忘、特殊要求..."
                rows={3}
                {...form.register('note')}
              />
            </div>

            <Button
              className="w-full h-11"
              onClick={async () => {
                const valid = await form.trigger(['customerName'])
                if (valid) setStep(2)
              }}
            >
              下一步：新增商品
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: 商品 */}
      {step === 2 && (
        <div className="space-y-4">
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
                        defaultValue={field.currency}
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
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      className="h-11"
                      {...form.register(`items.${index}.originalPrice`, { valueAsNumber: true })}
                    />
                    {form.formState.errors.items?.[index]?.originalPrice && (
                      <p className="text-sm text-destructive">{form.formState.errors.items[index]?.originalPrice?.message}</p>
                    )}
                  </div>

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
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.0001"
                      placeholder="0.0000"
                      className="h-11"
                      {...form.register(`items.${index}.exchangeRate`, { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">已自動帶入今日匯率，點擊「更新匯率」可重新抓取</p>
                    {form.formState.errors.items?.[index]?.exchangeRate && (
                      <p className="text-sm text-destructive">{form.formState.errors.items[index]?.exchangeRate?.message}</p>
                    )}
                  </div>

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
                      <p className="text-xs text-muted-foreground">向客戶收取的服務費比例</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label>運費分攤（NT$）</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        className="h-11"
                        {...form.register(`items.${index}.shippingShare`, { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  {/* 即時費用明細 */}
                  {item?.originalPrice > 0 && item?.exchangeRate > 0 && (
                    <>
                      <Separator />
                      <div className="bg-muted/50 rounded-md p-3 space-y-1.5 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>商品原價</span>
                          <span>{formatCurrency(Number(item.originalPrice), item.currency)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>匯率</span>
                          <span>× {Number(item.exchangeRate).toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>代購費 {item.feeRate}%</span>
                          <span>
                            + {formatTwd(Number(item.originalPrice) * Number(item.exchangeRate) * Number(item.feeRate) / 100)}
                          </span>
                        </div>
                        {Number(item.shippingShare) > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>運費分攤</span>
                            <span>+ {formatTwd(Number(item.shippingShare))}</span>
                          </div>
                        )}
                        {Number(item.quantity) > 1 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>數量</span>
                            <span>× {item.quantity}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-base">
                          <span>客戶應付</span>
                          <span className="text-primary">{formatTwd(itemTotal)}</span>
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
            onClick={() => append(defaultItem(defaultFeeRate))}
          >
            <Plus className="h-4 w-4 mr-1" />
            新增商品
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>
              上一步
            </Button>
            <Button
              className="flex-1 h-11"
              onClick={async () => {
                const valid = await form.trigger(['items'])
                if (valid) setStep(3)
              }}
            >
              下一步：確認訂單
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: 確認 */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">客戶</span>
                <span className="font-medium">{form.getValues('customerName')}</span>
              </div>
              {form.getValues('note') && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">備註</span>
                  <span className="text-sm text-right max-w-[60%]">{form.getValues('note')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {watchedItems.map((item, index) => (
            <Card key={index}>
              <CardContent className="pt-4 space-y-2 text-sm">
                <p className="font-medium">{item.productName}</p>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>商品原價</span>
                    <span>{formatCurrency(Number(item.originalPrice), item.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>匯率 × {Number(item.exchangeRate).toFixed(4)}</span>
                    <span>= {formatTwd(Number(item.originalPrice) * Number(item.exchangeRate))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>代購費 {item.feeRate}%</span>
                    <span>+ {formatTwd(Number(item.originalPrice) * Number(item.exchangeRate) * Number(item.feeRate) / 100)}</span>
                  </div>
                  {Number(item.shippingShare) > 0 && (
                    <div className="flex justify-between">
                      <span>運費分攤</span>
                      <span>+ {formatTwd(Number(item.shippingShare))}</span>
                    </div>
                  )}
                  {Number(item.quantity) > 1 && (
                    <div className="flex justify-between">
                      <span>× {item.quantity} 件</span>
                      <span></span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>小計</span>
                  <span>{formatTwd(calcFinalPriceTwd({
                    originalPrice: Number(item.originalPrice),
                    exchangeRate: Number(item.exchangeRate),
                    feeRate: Number(item.feeRate),
                    shippingShare: Number(item.shippingShare),
                    quantity: Number(item.quantity),
                  }))}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between items-center p-4 border rounded-lg bg-primary/5 border-primary/20">
            <span className="font-bold text-base">訂單總金額</span>
            <span className="text-2xl font-bold text-primary">{formatTwd(orderTotal)}</span>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(2)} disabled={loading}>
              上一步
            </Button>
            <Button className="flex-1 h-11" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> 建立中...</>
              ) : '確認建立訂單'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
