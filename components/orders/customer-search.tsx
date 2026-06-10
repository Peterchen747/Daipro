'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { UserRound } from 'lucide-react'

export type CustomerOption = { id: string; name: string }

interface CustomerSearchProps {
  customers: CustomerOption[]
  value: string
  onChange: (name: string, customerId?: string) => void
  error?: string
}

export function CustomerSearch({ customers, value, onChange, error }: CustomerSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : customers

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    onChange(val, undefined)
    setOpen(true)
  }

  function handleSelect(customer: CustomerOption) {
    setQuery(customer.name)
    onChange(customer.name, customer.id)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id="customerName"
        placeholder="輸入客戶姓名或暱稱"
        className={cn('h-11', error && 'border-destructive')}
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-auto rounded-lg border bg-popover text-popover-foreground shadow-md">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(c)}
            >
              <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
