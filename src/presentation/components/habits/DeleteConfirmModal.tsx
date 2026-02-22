/**
 * PRESENTATION LAYER — DeleteConfirmModal
 *
 * Simple confirmation dialog for destructive actions.
 * Purely presentational. Callers own the state.
 */

import { Modal }   from '@presentation/components/ui/Modal'
import { Button }  from '@presentation/components/ui/Button'

interface DeleteConfirmModalProps {
  isOpen: boolean
  habitName: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function DeleteConfirmModal({
  isOpen,
  habitName,
  onConfirm,
  onCancel,
  isLoading,
}: DeleteConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Delete habit?"
      size="sm"
      disableBackdropClose={isLoading}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This will permanently delete{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            "{habitName}"
          </span>{' '}
          and all its history. This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}
