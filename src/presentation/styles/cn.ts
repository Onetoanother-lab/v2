import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind class names safely.
 * Resolves conflicts (e.g. p-2 + p-4 → p-4) via tailwind-merge,
 * and handles conditional classes via clsx.
 *
 * Usage: cn('p-2', isActive && 'bg-brand-500', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
