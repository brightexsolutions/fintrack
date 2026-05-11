'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useCategories } from '@/hooks/use-transactions'
import type { TransactionFilters } from '@/hooks/use-transactions'

interface TransactionFiltersProps {
  filters: TransactionFilters
  onChange: (f: TransactionFilters) => void
}

export function TransactionFiltersBar({ filters, onChange }: TransactionFiltersProps) {
  const { data: categories = [] } = useCategories()
  const hasFilters = filters.type !== 'all' || filters.category_id || filters.search || filters.dateFrom || filters.dateTo

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-8 h-8 text-sm"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      {/* Type */}
      <Select value={filters.type ?? 'all'} onValueChange={(v) => onChange({ ...filters, type: v as TransactionFilters['type'] })}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="income">Income</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
        </SelectContent>
      </Select>

      {/* Category */}
      <Select value={filters.category_id ?? 'all'} onValueChange={(v) => onChange({ ...filters, category_id: !v || v === 'all' ? undefined : v })}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date range */}
      <Input
        type="date"
        className="h-8 w-36 text-xs"
        value={filters.dateFrom ?? ''}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
        placeholder="From"
      />
      <Input
        type="date"
        className="h-8 w-36 text-xs"
        value={filters.dateTo ?? ''}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
        placeholder="To"
      />

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          onClick={() => onChange({ type: 'all' })}
        >
          <X className="h-3 w-3 mr-1" /> Clear
        </Button>
      )}
    </div>
  )
}
