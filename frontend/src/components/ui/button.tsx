import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] text-sm font-[510] tracking-caption transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/70',
  {
    variants: {
      variant: {
        default:
          'border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,#376fb1_0%,#4947ab_55%,#7a58ac_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_0_rgba(255,255,255,0.05),0_18px_42px_rgba(5,8,48,0.45)] hover:-translate-y-[1px] hover:brightness-110 active:translate-y-0',
        outline:
          'border border-border bg-bg-card text-text-secondary shadow-[0_1px_0_rgba(255,255,255,0.03)] hover:border-border-bright hover:bg-bg-elevated hover:text-text-base',
        ghost:
          'text-text-secondary hover:text-text-base hover:bg-bg-hover',
        cyan:
          'border border-[rgba(72,152,188,0.18)] bg-[linear-gradient(135deg,#4898bc_0%,#376fb1_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_42px_rgba(7,9,45,0.4)] hover:-translate-y-[1px] hover:brightness-105 active:translate-y-0',
        destructive:
          'border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/14',
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
