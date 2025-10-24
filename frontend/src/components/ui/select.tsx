import * as React from "react"

interface SelectContextType {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within Select')
  }
  return context
}

interface SelectProps {
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
  children: React.ReactNode
}

export function Select({ value, onValueChange, disabled = false, children }: SelectProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ value, onChange: onValueChange, disabled, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  const { disabled, open, setOpen } = useSelectContext()

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setOpen(!open)}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
      <svg
        className={`ml-2 h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  )
}

interface SelectValueProps {
  placeholder?: string
  children?: React.ReactNode
}

export function SelectValue({ placeholder, children }: SelectValueProps) {
  const { value } = useSelectContext()
  
  if (children) {
    return <>{children}</>
  }
  
  return <span className={value ? '' : 'text-gray-500'}>{value || placeholder}</span>
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

export function SelectContent({ children, className = '' }: SelectContentProps) {
  const { open, setOpen } = useSelectContext()
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={`absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg ${className}`}
    >
      {children}
    </div>
  )
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function SelectItem({ value, children, className = '' }: SelectItemProps) {
  const { value: selectedValue, onChange, setOpen } = useSelectContext()

  return (
    <div
      role="option"
      aria-selected={value === selectedValue}
      onClick={() => {
        onChange(value)
        setOpen(false)
      }}
      className={`relative flex w-full cursor-pointer select-none items-center px-3 py-2 text-sm hover:bg-gray-100 ${
        value === selectedValue ? 'bg-blue-50 text-blue-900' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

