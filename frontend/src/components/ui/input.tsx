import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  suffix?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, suffix, id, ...props }, ref) => {
    // useId generates a stable, unique ID that matches between server and client (React 18+)
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-[510] tracking-caption text-text-secondary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              'w-full px-4 py-3 text-sm rounded-[8px]',
              'bg-bg-card border text-text-base shadow-[0_1px_0_rgba(255,255,255,0.03)]',
              'placeholder:text-text-faint',
              'transition-all duration-200',
              'focus:outline-none focus:ring-1',
              error
                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                : 'border-border hover:bg-bg-elevated hover:border-border-bright focus:bg-bg-elevated focus:border-border-focus focus:ring-[rgba(113,112,255,0.18)]',
              suffix ? 'pr-11' : '',
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
