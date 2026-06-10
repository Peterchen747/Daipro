'use client'

import { useState, useRef, useEffect } from 'react'
import { createLocation } from '@/lib/actions/locations'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { MapPin, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export type LocationOption = { id: string; name: string; date?: string | null }

interface Props {
  locations: LocationOption[]
  value: string | undefined
  onChange: (locationId: string | undefined) => void
}

export function LocationPicker({ locations: initialLocations, value, onChange }: Props) {
  const [locations, setLocations] = useState(initialLocations)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedLocation = locations.find((l) => l.id === value)

  const filtered = query.trim()
    ? locations.filter((l) => l.name.toLowerCase().includes(query.toLowerCase()))
    : locations

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleCreateNew() {
    const name = query.trim()
    if (!name) return
    setCreating(true)
    try {
      const newLoc = await createLocation({ name })
      setLocations((prev) => [newLoc, ...prev])
      onChange(newLoc.id)
      setQuery('')
      setOpen(false)
      toast.success(`地點「${newLoc.name}」已建立`)
    } catch {
      toast.error('建立地點失敗')
    } finally {
      setCreating(false)
    }
  }

  function handleSelect(loc: LocationOption) {
    onChange(loc.id)
    setQuery('')
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(undefined)
  }

  return (
    <div ref={containerRef} className="relative">
      {selectedLocation ? (
        <div className="flex items-center gap-2 h-11 px-3 border rounded-lg bg-background">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 text-sm">{selectedLocation.name}</span>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground text-xs px-1"
          >
            ✕
          </button>
        </div>
      ) : (
        <Input
          placeholder="選擇或新增地點（選填）"
          className="h-11"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      )}

      {open && !selectedLocation && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-auto rounded-lg border bg-popover text-popover-foreground shadow-md">
          {filtered.map((l) => (
            <button
              key={l.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(l)}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {l.name}
            </button>
          ))}
          {query.trim() && (
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left border-t',
                creating && 'opacity-50 pointer-events-none'
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreateNew}
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 text-primary" />
              )}
              <span className="text-primary">建立「{query.trim()}」</span>
            </button>
          )}
          {!query.trim() && filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">輸入地點名稱以新增</p>
          )}
        </div>
      )}
    </div>
  )
}
