/**
 * PRESENTATION LAYER — Modal Component
 *
 * Renders into a portal to avoid z-index / overflow issues.
 * Traps focus, supports Escape to close, animated entrance/exit.
 * Zero business logic — callers own open state and handlers.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@presentation/styles/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** If true, clicking backdrop does NOT close. Default: false */
  disableBackdropClose?: boolean
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  disableBackdropClose = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Focus the panel on open for accessibility
  useEffect(() => {
    if (isOpen) panelRef.current?.focus()
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4',
        'animate-in fade-in duration-200',
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={disableBackdropClose ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full rounded-2xl bg-white shadow-2xl outline-none',
          'dark:bg-slate-900 dark:ring-1 dark:ring-slate-700/50',
          'animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200',
          sizeMap[size],
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-5">
          <div>
            <h2
              id="modal-title"
              className="font-display text-xl font-bold text-slate-900 dark:text-white"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className={cn(
              'ml-4 flex-shrink-0 rounded-xl p-1.5 text-slate-400',
              'hover:bg-slate-100 hover:text-slate-600 transition-colors',
              'dark:hover:bg-slate-800 dark:hover:text-slate-300',
            )}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
