import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: boolean
  border?: boolean
}

const PADDING = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', shadow = true, border = true, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          'rounded-xl bg-white',
          shadow ? 'shadow-sm' : '',
          border ? 'border border-gray-100' : '',
          PADDING[padding],
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Convenience sub-components
export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-3 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`font-semibold text-gray-900 ${className}`} {...props}>
      {children}
    </h3>
  )
}

export function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-4 border-t border-gray-100 pt-3 ${className}`} {...props}>
      {children}
    </div>
  )
}
