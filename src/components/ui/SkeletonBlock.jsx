import { cn } from '../../utils'

const SkeletonBlock = ({ className = '', rounded = 'rounded-lg' }) => (
  <div
    className={cn('animate-pulse bg-slate-200/80', rounded, className)}
    aria-hidden="true"
  />
)

export default SkeletonBlock
