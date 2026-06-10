'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number
  onValueChange: (v: number) => void
}

export function NumberInput({ value, onValueChange, className, ...props }: NumberInputProps) {
  const [display, setDisplay] = useState(value === 0 ? '' : String(value))

  useEffect(() => {
    setDisplay(value === 0 ? '' : String(value))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setDisplay(raw)
    const parsed = parseFloat(raw)
    onValueChange(isNaN(parsed) ? 0 : parsed)
  }

  function handleBlur() {
    if (display === '' || display === '-') {
      setDisplay('')
      onValueChange(0)
    }
  }

  return (
    <Input
      {...props}
      type="number"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(className)}
    />
  )
}
