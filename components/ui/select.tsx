"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Context ────────────────────────────────────────────────────────────────

type SelectCtx = {
  value: string
  onChange: (value: string) => void
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>
  labels: React.MutableRefObject<Map<string, string>>
  notifyLabelChange: () => void
}

const SelectContext = React.createContext<SelectCtx | null>(null)

function useSelectCtx() {
  const ctx = React.useContext(SelectContext)
  if (!ctx) throw new Error("Select component must be used within <Select>")
  return ctx
}

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children
  if (typeof children === "number") return String(children)
  if (Array.isArray(children)) return children.map(extractText).join("")
  if (React.isValidElement(children))
    return extractText((children.props as { children?: React.ReactNode }).children)
  return ""
}

// ─── Root ────────────────────────────────────────────────────────────────────

interface SelectRootProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
}

function Select({
  value,
  defaultValue = "",
  onValueChange,
  children,
}: SelectRootProps) {
  const controlled = value !== undefined
  const [internal, setInternal] = React.useState(defaultValue)
  const current = controlled ? (value ?? "") : internal
  const [open, setOpen] = React.useState(false)
  const [, setLabelVersion] = React.useState(0)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const labels = React.useRef(new Map<string, string>())

  const notifyLabelChange = React.useCallback(() => setLabelVersion((v) => v + 1), [])

  const handleChange = React.useCallback(
    (v: string) => {
      if (!controlled) setInternal(v)
      onValueChange?.(v)
      setOpen(false)
    },
    [controlled, onValueChange]
  )

  return (
    <SelectContext.Provider
      value={{ value: current, onChange: handleChange, open, setOpen, triggerRef, labels, notifyLabelChange }}
    >
      {children}
    </SelectContext.Provider>
  )
}

// ─── Trigger ─────────────────────────────────────────────────────────────────

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "default"
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  function SelectTrigger({ className, children, size = "default", ...props }, ref) {
    const { open, setOpen, triggerRef } = useSelectCtx()
    return (
      <button
        ref={(node) => {
          triggerRef.current = node
          if (typeof ref === "function") ref(node)
          else if (ref) ref.current = node
        }}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls="select-listbox"
        aria-haspopup="listbox"
        data-slot="select-trigger"
        data-size={size}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none",
          "hover:bg-accent/30",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          "data-placeholder:text-muted-foreground",
          "data-[size=default]:h-8 data-[size=sm]:h-7",
          "dark:bg-input/30 dark:hover:bg-input/50",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="size-4 text-muted-foreground pointer-events-none shrink-0" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

// ─── Value ────────────────────────────────────────────────────────────────────

interface SelectValueProps {
  placeholder?: string
  className?: string
}

function SelectValue({ placeholder, className }: SelectValueProps) {
  const { value, labels } = useSelectCtx()
  const label = labels.current.get(value) ?? value
  const isEmpty = !label
  return (
    <span
      data-slot="select-value"
      className={cn(
        "flex flex-1 text-left line-clamp-1 items-center gap-1.5",
        isEmpty && "text-muted-foreground",
        className
      )}
    >
      {isEmpty ? placeholder : label}
    </span>
  )
}

// ─── Content ──────────────────────────────────────────────────────────────────

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom"
  sideOffset?: number
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  ...props
}: SelectContentProps) {
  const { open, setOpen, triggerRef } = useSelectCtx()
  const [coords, setCoords] = React.useState<{
    top?: number
    bottom?: number
    left: number
    width: number
  } | null>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    if (side === "top" || (spaceBelow < 200 && spaceAbove > spaceBelow)) {
      setCoords({
        bottom: window.innerHeight - rect.top + sideOffset,
        left: rect.left,
        width: rect.width,
      })
    } else {
      setCoords({
        top: rect.bottom + sideOffset,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [open, triggerRef, side, sideOffset])

  React.useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (
        !contentRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open, triggerRef, setOpen])

  if (!mounted || !open || !coords) return null

  return createPortal(
    <div
      ref={contentRef}
      data-slot="select-content"
      role="listbox"
      style={{
        position: "fixed",
        top: coords.top,
        bottom: coords.bottom,
        left: coords.left,
        minWidth: coords.width,
        zIndex: 9999,
      }}
      className={cn(
        "max-h-60 overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 p-1",
        "animate-in fade-in-0 zoom-in-95 duration-100",
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  )
}

// ─── Item ─────────────────────────────────────────────────────────────────────

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  function SelectItem({ className, children, value, disabled, ...props }, ref) {
    const ctx = useSelectCtx()
    const selected = ctx.value === value

    React.useEffect(() => {
      const text = extractText(children)
      if (text) {
        ctx.labels.current.set(value, text)
        // Trigger SelectValue re-render so it can display the label after items mount.
        ctx.notifyLabelChange()
      }
      // No cleanup — labels persist for the Select lifetime so SelectValue
      // can display the label even when SelectContent is unmounted (dropdown closed).
    }, [value, children, ctx.labels, ctx.notifyLabelChange])

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={selected}
        data-slot="select-item"
        data-disabled={disabled ? "" : undefined}
        className={cn(
          "relative flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          selected && "bg-accent/50 text-accent-foreground",
          className
        )}
        onPointerDown={(e) => {
          e.preventDefault()
          if (!disabled) ctx.onChange(value)
        }}
        {...props}
      >
        <span className="flex flex-1 shrink-0 gap-2 whitespace-nowrap items-center">
          {children}
        </span>
        {selected && (
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
            <CheckIcon className="size-4" />
          </span>
        )}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

// ─── Group ────────────────────────────────────────────────────────────────────

const SelectGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SelectGroup({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="select-group"
        className={cn("scroll-my-1 p-1", className)}
        {...props}
      />
    )
  }
)
SelectGroup.displayName = "SelectGroup"

// ─── Label ────────────────────────────────────────────────────────────────────

const SelectLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SelectLabel({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="select-label"
        className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
        {...props}
      />
    )
  }
)
SelectLabel.displayName = "SelectLabel"

// ─── Separator ───────────────────────────────────────────────────────────────

const SelectSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SelectSeparator({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="select-separator"
        className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
        {...props}
      />
    )
  }
)
SelectSeparator.displayName = "SelectSeparator"

// ─── Compat stubs (unused but keep API surface intact) ───────────────────────

const SelectScrollUpButton = () => null
const SelectScrollDownButton = () => null
SelectScrollUpButton.displayName = "SelectScrollUpButton"
SelectScrollDownButton.displayName = "SelectScrollDownButton"

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
