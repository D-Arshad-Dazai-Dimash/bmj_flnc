import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-accent to-accent-dim text-white shadow-glow-sm hover:shadow-glow-md hover:scale-[1.02] active:scale-[0.98]',
        outline:
          'border border-border text-text-muted hover:border-border-bright hover:text-text-base hover:bg-bg-hover',
        ghost:
          'text-text-muted hover:text-text-base hover:bg-bg-hover',
        cyan:
          'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-glow-cyan hover:shadow-[0_0_40px_rgba(0,212,255,0.5)] hover:scale-[1.02] active:scale-[0.98]',
        destructive:
          'bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30',
        link:
          'text-accent-light hover:text-accent-bright underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm:   'h-8 px-3 text-xs',
        md:   'h-10 px-5',
        lg:   'h-12 px-8 text-base',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="opacity-20"
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-80"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
