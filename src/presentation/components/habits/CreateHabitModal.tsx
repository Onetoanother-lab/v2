/**
 * PRESENTATION LAYER — CreateHabitModal
 *
 * Form for creating a new habit. Purely presentational except for:
 *   • Local form state (React controlled inputs)
 *   • Client-side empty field guards (UX only — real validation is in domain)
 *   • Calls onSubmit callback with a CreateHabitInput DTO
 *
 * Business rules (name length, color validation, etc.) live in the domain.
 * This form only ensures the fields are non-empty before submitting.
 */

import { useState, type FormEvent } from 'react'
import { Modal }        from '@presentation/components/ui/Modal'
import { Input }        from '@presentation/components/ui/Input'
import { Textarea }     from '@presentation/components/ui/Textarea'
import { Select }       from '@presentation/components/ui/Select'
import { ColorPicker }  from '@presentation/components/ui/ColorPicker'
import { Button }       from '@presentation/components/ui/Button'
import type { CreateHabitInput } from '@application/dtos/HabitDTOs'

// ─── Static option lists (display config, not business logic) ─────────────────

const CATEGORY_OPTIONS = [
  { value: 'health',       label: '❤️  Health' },
  { value: 'fitness',      label: '💪 Fitness' },
  { value: 'mindfulness',  label: '🧘 Mindfulness' },
  { value: 'learning',     label: '📚 Learning' },
  { value: 'productivity', label: '⚡ Productivity' },
  { value: 'social',       label: '🤝 Social' },
  { value: 'finance',      label: '💰 Finance' },
  { value: 'other',        label: '✨ Other' },
]

const FREQUENCY_OPTIONS = [
  { value: 'daily',  label: 'Every day' },
  { value: 'weekly', label: 'Once a week' },
  { value: 'custom', label: 'Custom days' },
]

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Sun' },
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
]

const ICON_SUGGESTIONS = ['✅', '🏃', '📚', '🧘', '💧', '🥗', '💪', '🎯', '🌱', '🔥', '🎨', '🎸']

// ─── Form state shape ─────────────────────────────────────────────────────────

interface FormState {
  name: string
  description: string
  category: string
  frequency: string
  customDays: number[]
  color: string
  icon: string
}

const INITIAL_STATE: FormState = {
  name:        '',
  description: '',
  category:    'health',
  frequency:   'daily',
  customDays:  [],
  color:       '#22c55e',
  icon:        '✅',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CreateHabitModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: CreateHabitInput) => Promise<boolean>
  serverError?: string | null
}

export function CreateHabitModal({
  isOpen,
  onClose,
  onSubmit,
  serverError,
}: CreateHabitModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const toggleCustomDay = (day: number) => {
    set(
      'customDays',
      form.customDays.includes(day)
        ? form.customDays.filter((d) => d !== day)
        : [...form.customDays, day],
    )
  }

  // UX-only validation (empty fields) — domain enforces real rules
  const validate = (): boolean => {
    const errors: typeof fieldErrors = {}
    if (!form.name.trim()) errors.name = 'Please enter a name'
    if (form.frequency === 'custom' && form.customDays.length === 0) {
      errors.customDays = 'Pick at least one day'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    const success = await onSubmit({
      name:        form.name.trim(),
      description: form.description.trim(),
      category:    form.category as CreateHabitInput['category'],
      frequency:   form.frequency as CreateHabitInput['frequency'],
      customDays:  form.customDays,
      color:       form.color,
      icon:        form.icon,
    })
    setIsSubmitting(false)

    if (success) {
      setForm(INITIAL_STATE)
      setFieldErrors({})
      onClose()
    }
  }

  const handleClose = () => {
    setForm(INITIAL_STATE)
    setFieldErrors({})
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Habit"
      description="Build a new routine, one day at a time."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Server error banner */}
        {serverError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {serverError}
          </div>
        )}

        {/* Name + Icon */}
        <div className="flex gap-3">
          {/* Icon picker */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Icon
            </span>
            <div className="flex flex-wrap gap-1.5 w-36">
              {ICON_SUGGESTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => set('icon', emoji)}
                  className={`h-8 w-8 rounded-lg text-lg flex items-center justify-center transition-all
                    ${form.icon === emoji
                      ? 'bg-brand-100 ring-2 ring-brand-400 dark:bg-brand-900/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Morning run, Read 30 pages…"
              error={fieldErrors.name}
              autoFocus
              maxLength={80}
            />
          </div>
        </div>

        {/* Description */}
        <Textarea
          label="Description (optional)"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What does success look like?"
          rows={2}
        />

        {/* Category + Frequency row */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            options={CATEGORY_OPTIONS}
          />
          <Select
            label="Frequency"
            value={form.frequency}
            onChange={(e) => set('frequency', e.target.value)}
            options={FREQUENCY_OPTIONS}
          />
        </div>

        {/* Custom days picker */}
        {form.frequency === 'custom' && (
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Active Days
            </span>
            <div className="flex gap-2 flex-wrap">
              {WEEKDAY_OPTIONS.map(({ value, label }) => {
                const day = Number(value)
                const isActive = form.customDays.includes(day)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleCustomDay(day)}
                    className={`h-9 min-w-[2.5rem] rounded-xl px-2.5 text-xs font-semibold transition-all
                      ${isActive
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {fieldErrors.customDays && (
              <p className="text-xs text-red-500">⚠ {fieldErrors.customDays}</p>
            )}
          </div>
        )}

        {/* Color */}
        <ColorPicker
          label="Color"
          value={form.color}
          onChange={(c) => set('color', c)}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Habit
          </Button>
        </div>
      </form>
    </Modal>
  )
}
