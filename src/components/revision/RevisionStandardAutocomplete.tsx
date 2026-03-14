import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { revisionStandardService, type RevisionStandardSearchResult } from '@/services/revision-standard.service'
import { cn } from '@/lib/utils'

interface RevisionStandardAutocompleteProps {
  value: string
  selectedStandard: RevisionStandardSearchResult | null
  onInputChange: (value: string) => void
  onSelect: (standard: RevisionStandardSearchResult) => void
  onClear: () => void
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [value, delayMs])

  return debouncedValue
}

function resolveTagVariant(tagColor: string | null): 'blue' | 'green' | 'yellow' | 'red' | 'orange' | 'secondary' {
  switch ((tagColor || '').toUpperCase()) {
    case 'MAVI':
    case 'BLUE':
      return 'blue'
    case 'YESIL':
    case 'YEŞİL':
    case 'GREEN':
      return 'green'
    case 'SARI':
    case 'YELLOW':
      return 'yellow'
    case 'KIRMIZI':
    case 'RED':
      return 'red'
    case 'TURUNCU':
    case 'ORANGE':
      return 'orange'
    default:
      return 'secondary'
  }
}

export function RevisionStandardAutocomplete({
  value,
  selectedStandard,
  onInputChange,
  onSelect,
  onClear,
}: RevisionStandardAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const debouncedSearch = useDebouncedValue(value, 350)
  const normalizedSearch = debouncedSearch.trim()
  const shouldSearch = normalizedSearch.length >= 2

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const searchQuery = useQuery({
    queryKey: ['revision-standards', 'search', normalizedSearch],
    queryFn: () => revisionStandardService.search(normalizedSearch, 20),
    enabled: shouldSearch,
  })

  const results = useMemo(() => searchQuery.data || [], [searchQuery.data])
  const showDropdown = isOpen && shouldSearch

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => {
            onInputChange(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-10"
          placeholder="Madde no veya açıklama ile ara (örn: 7.5, yangın, kapı)"
        />
        {(value || selectedStandard) ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-8 w-8"
            onClick={() => {
              onClear()
              setIsOpen(false)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {showDropdown ? (
        <div className="max-h-72 overflow-y-auto rounded-md border bg-white shadow-lg">
          {searchQuery.isLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Yükleniyor...
            </div>
          ) : null}

          {!searchQuery.isLoading && searchQuery.isError ? (
            <div className="px-3 py-3 text-sm text-destructive">Standartlar yüklenemedi</div>
          ) : null}

          {!searchQuery.isLoading && !searchQuery.isError && results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">Sonuç bulunamadı</div>
          ) : null}

          {!searchQuery.isLoading && !searchQuery.isError
            ? results.map((standard) => {
                const isSelected = selectedStandard?.id === standard.id
                return (
                  <button
                    key={standard.id}
                    type="button"
                    className={cn(
                      'flex w-full flex-col items-start gap-1 border-b px-3 py-3 text-left last:border-b-0 hover:bg-muted/40',
                      isSelected ? 'bg-muted/60' : ''
                    )}
                    onClick={() => {
                      onSelect(standard)
                      setIsOpen(false)
                    }}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="font-semibold text-foreground">{standard.articleNo}</div>
                      {isSelected ? <Check className="mt-0.5 h-4 w-4 text-primary" /> : null}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">{standard.standardCode}</div>
                    <div className="line-clamp-2 text-sm text-foreground/90">{standard.description}</div>
                    {standard.tagColor ? (
                      <Badge variant={resolveTagVariant(standard.tagColor)} className="min-w-0 px-2">
                        {standard.tagColor}
                      </Badge>
                    ) : null}
                  </button>
                )
              })
            : null}
        </div>
      ) : null}

      {selectedStandard ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="font-medium">Madde: {selectedStandard.articleNo}</div>
          <div className="text-muted-foreground">Standart: {selectedStandard.standardCode}</div>
          {selectedStandard.tagColor ? (
            <div className="mt-2">
              <Badge variant={resolveTagVariant(selectedStandard.tagColor)} className="min-w-0 px-2">
                {selectedStandard.tagColor}
              </Badge>
            </div>
          ) : null}
          <div className="mt-2 text-foreground/90">{selectedStandard.description}</div>
        </div>
      ) : null}
    </div>
  )
}
