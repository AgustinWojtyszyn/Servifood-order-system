import InlineSpinner from './InlineSpinner'
import { cn } from '../../utils'

const LoadingState = ({
  message = 'Cargando...',
  description,
  variant = 'section',
  tone = 'primary',
  className = ''
}) => {
  const isFullScreen = variant === 'fullscreen'
  const isInline = variant === 'inline'

  return (
    <div
      className={cn(
        isFullScreen && 'min-h-dvh bg-linear-to-br from-primary-700 via-primary-800 to-primary-900 text-white',
        isInline ? 'inline-flex items-center gap-2' : 'flex items-center justify-center text-center',
        !isFullScreen && !isInline && 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
        isFullScreen && 'flex items-center justify-center',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn(isInline ? 'inline-flex items-center gap-2' : 'flex flex-col items-center gap-3')}>
        <InlineSpinner
          size={isFullScreen ? 'xl' : isInline ? 'sm' : 'lg'}
          tone={isFullScreen ? 'light' : tone}
        />
        <div className={cn(isInline ? 'font-semibold' : '')}>
          <p className={cn(
            isFullScreen ? 'text-base font-medium text-white' : 'text-sm font-semibold text-slate-700',
            !isInline && !isFullScreen && 'sm:text-base'
          )}>
            {message}
          </p>
          {description && !isInline && (
            <p className={cn(
              'mt-1 text-sm',
              isFullScreen ? 'text-white/80' : 'text-slate-500'
            )}>
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoadingState
