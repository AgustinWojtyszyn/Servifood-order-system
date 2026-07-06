import { cn } from '../../utils'

const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-10 w-10 border-4',
  xl: 'h-14 w-14 border-4'
}

const TONE_CLASSES = {
  light: 'border-white/30 border-t-white',
  primary: 'border-primary-200 border-t-primary-600',
  slate: 'border-slate-200 border-t-slate-700',
  emerald: 'border-emerald-200 border-t-emerald-600'
}

const InlineSpinner = ({
  size = 'md',
  tone = 'primary',
  className = '',
  label = 'Cargando'
}) => (
  <span
    className={cn(
      'inline-block shrink-0 animate-spin rounded-full',
      SIZE_CLASSES[size] || SIZE_CLASSES.md,
      TONE_CLASSES[tone] || TONE_CLASSES.primary,
      className
    )}
    role="status"
    aria-label={label}
  />
)

export default InlineSpinner
