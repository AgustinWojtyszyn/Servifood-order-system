import { forwardRef } from 'react'
import { cn } from '../../utils'

const Card = forwardRef(({
  className,
  children,
  padding = 'default',
  shadow = 'default',
  rounded = 'default',
  ...props
}, ref) => {
  const paddings = {
    none: '',
    sm: 'p-3',
    default: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  }

  const shadows = {
    none: '',
    sm: 'shadow-sm',
    default: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  }

  const roundeds = {
    none: '',
    sm: 'rounded-lg',
    default: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full'
  }

  return (
    <div
      ref={ref}
      className={cn(
        'bg-white border border-gray-200 backdrop-blur-sm',
        'transition-all duration-200',
        paddings[padding],
        shadows[shadow],
        roundeds[rounded],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

Card.displayName = 'Card'

const CardHeader = forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('space-y-1.5 pb-4', className)}
    {...props}
  >
    {children}
  </div>
))

CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      'text-gray-900',
      className
    )}
    {...props}
  >
    {children}
  </h3>
))

CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-600', className)}
    {...props}
  >
    {children}
  </p>
))

CardDescription.displayName = 'CardDescription'

const CardContent = forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('', className)}
    {...props}
  >
    {children}
  </div>
))

CardContent.displayName = 'CardContent'

const CardFooter = forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  >
    {children}
  </div>
))

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
