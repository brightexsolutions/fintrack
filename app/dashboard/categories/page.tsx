'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type CategoryFormData,
} from '@/hooks/use-categories'
import {
  useCategorizationRules,
  useCreateCategorizationRule,
  useDeleteCategorizationRule,
  type MatchField,
} from '@/hooks/use-categorization'
import type { Category, CategoryType } from '@/types/database'

const CATEGORY_TYPES: { value: CategoryType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'both', label: 'Both' },
]

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#6B7280', '#14B8A6',
]

const PRESET_ICONS = [
  'circle', 'tag', 'briefcase', 'laptop', 'building-2', 'trending-up',
  'home', 'gift', 'refresh-cw', 'utensils', 'car', 'shopping-bag',
  'film', 'zap', 'heart', 'book-open', 'map-pin', 'smile',
  'smartphone', 'credit-card', 'piggy-bank', 'wallet',
]

const EMPTY_FORM: CategoryFormData = {
  name: '',
  type: 'expense',
  icon: 'circle',
  color: '#6366F1',
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={`h-6 w-6 rounded-full border-2 transition-transform ${value === c ? 'border-foreground scale-110' : 'border-transparent'}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  )
}

function IconPicker({ value, color, onChange }: { value: string; color: string; onChange: (i: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          title={icon}
          className={`h-8 w-8 rounded-lg border text-xs font-mono flex items-center justify-center transition-colors ${value === icon ? 'border-foreground bg-muted' : 'border-border hover:bg-muted/60'}`}
          style={value === icon ? { color } : {}}
          onClick={() => onChange(icon)}
        >
          {icon.slice(0, 2)}
        </button>
      ))}
    </div>
  )
}

function CategoryForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  submitLabel,
}: {
  initial: CategoryFormData
  onSubmit: (data: CategoryFormData) => void
  onCancel: () => void
  loading: boolean
  submitLabel: string
}) {
  const [form, setForm] = useState<CategoryFormData>(initial)

  function patch(patch: Partial<CategoryFormData>) {
    setForm((f) => ({ ...f, ...patch }))
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g. Groceries"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => v && patch({ type: v as CategoryType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Color</Label>
        <ColorPicker value={form.color} onChange={(c) => patch({ color: c })} />
      </div>

      <div className="space-y-1.5">
        <Label>Icon (abbreviated key)</Label>
        <IconPicker value={form.icon} color={form.color} onChange={(i) => patch({ icon: i })} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
          onClick={() => form.name.trim() && onSubmit(form)}
          disabled={loading || !form.name.trim()}
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitLabel}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${category.color}20`, color: category.color, border: `1px solid ${category.color}40` }}
    >
      {category.name}
    </span>
  )
}

const MATCH_FIELD_LABELS: Record<MatchField, string> = {
  counterparty: 'Sender / recipient name',
  description: 'Transaction description',
  any: 'Name or description (either)',
}

function RulesEditor({ categories }: { categories: Category[] }) {
  const { data: rules = [], isLoading: rulesLoading } = useCategorizationRules()
  const createRule = useCreateCategorizationRule()
  const deleteRule = useDeleteCategorizationRule()

  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [matchField, setMatchField] = useState<MatchField>('counterparty')

  const catById = new Map(categories.map((c) => [c.id, c]))

  function handleAdd() {
    if (!keyword.trim() || !categoryId) return
    createRule.mutate({ keyword, category_id: categoryId, match_field: matchField }, {
      onSuccess: () => { setKeyword(''); setCategoryId('') },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Auto-categorization rules</p>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        When importing M-Pesa messages, transactions matching a keyword are automatically assigned the chosen category.
        Your rules are checked first, before system defaults.
      </p>

      {/* Add rule form */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold">Add keyword rule</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Keyword</Label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. KPLC, Naivas, Shell"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Look inside</Label>
            <select
              className="h-9 w-full rounded-lg border border-input bg-background text-foreground px-3 text-sm outline-none focus:border-ring dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
              value={matchField}
              onChange={(e) => setMatchField(e.target.value as MatchField)}
            >
              {(Object.entries(MATCH_FIELD_LABELS) as [MatchField, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Assign category</Label>
            <select
              className="h-9 w-full rounded-lg border border-input bg-background text-foreground px-3 text-sm outline-none focus:border-ring dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Pick a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
          disabled={!keyword.trim() || !categoryId || createRule.isPending}
          onClick={handleAdd}
        >
          {createRule.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <Plus className="h-3.5 w-3.5" /> Add rule
        </Button>
      </div>

      {/* Existing rules */}
      {rulesLoading && <Skeleton className="h-20 rounded-xl" />}
      {!rulesLoading && rules.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No custom rules yet. Add one above.</p>
      )}
      {!rulesLoading && rules.length > 0 && (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {rules.map((rule) => {
            const cat = catById.get(rule.category_id)
            return (
              <div key={rule.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded truncate max-w-[120px]">
                    {rule.keyword}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    in <span className="lowercase">{MATCH_FIELD_LABELS[rule.match_field]}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">→</span>
                  {cat ? (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: `${cat.color}20`, color: cat.color, border: `1px solid ${cat.color}40` }}
                    >
                      {cat.name}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">deleted category</span>
                  )}
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                  disabled={deleteRule.isPending}
                  onClick={() => deleteRule.mutate(rule.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()

  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const defaultCategories = categories.filter((c) => c.is_default)
  const customCategories = categories.filter((c) => !c.is_default)

  function handleCreate(data: CategoryFormData) {
    createMutation.mutate(data, { onSuccess: () => setShowCreate(false) })
  }

  function handleUpdate(id: string, data: CategoryFormData) {
    updateMutation.mutate({ id, values: data }, { onSuccess: () => setEditId(null) })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return
    deleteMutation.mutate(id)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-40" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage transaction categories. Default system categories cannot be edited.
          </p>
        </div>
        {!showCreate && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" /> New category
          </Button>
        )}
      </div>

      {showCreate && (
        <div>
          <p className="text-sm font-semibold mb-2">New category</p>
          <CategoryForm
            initial={EMPTY_FORM}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            loading={createMutation.isPending}
            submitLabel="Create"
          />
        </div>
      )}

      {/* Custom categories */}
      {customCategories.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your categories</p>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {customCategories.map((cat) => (
              <div key={cat.id}>
                {editId === cat.id ? (
                  <div className="p-4">
                    <CategoryForm
                      initial={{ name: cat.name, type: cat.type, icon: cat.icon, color: cat.color }}
                      onSubmit={(data) => handleUpdate(cat.id, data)}
                      onCancel={() => setEditId(null)}
                      loading={updateMutation.isPending}
                      submitLabel="Save"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-mono"
                        style={{ background: `${cat.color}20`, color: cat.color }}>
                        {cat.icon.slice(0, 2)}
                      </div>
                      <div>
                        <CategoryBadge category={cat} />
                        <p className="text-xs text-muted-foreground mt-0.5">{cat.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditId(cat.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(cat.id, cat.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {customCategories.length === 0 && !showCreate && (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No custom categories yet.</p>
          <Button
            variant="outline" size="sm" className="mt-3 gap-1.5"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Create one
          </Button>
        </div>
      )}

      {/* System default categories */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          System defaults
          <Badge variant="secondary" className="ml-2 font-normal">{defaultCategories.length}</Badge>
        </p>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {defaultCategories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3 opacity-70">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-mono"
                style={{ background: `${cat.color}20`, color: cat.color }}>
                {cat.icon.slice(0, 2)}
              </div>
              <div>
                <CategoryBadge category={cat} />
                <p className="text-xs text-muted-foreground mt-0.5">{cat.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keyword auto-categorization rules */}
      <div className="pt-2 border-t border-border">
        <RulesEditor categories={categories} />
      </div>
    </div>
  )
}
