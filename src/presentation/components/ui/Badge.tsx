import { cn } from '@presentation/styles/cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'info' | 'danger'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  className?: string
}

const variantMap: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  success: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  info:    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  danger:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function Badge({ label, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantMap[variant],
        className,
      )}
    >
      {label}
    </span>
  )
}
