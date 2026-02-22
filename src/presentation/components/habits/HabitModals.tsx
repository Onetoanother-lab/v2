/**
 * PRESENTATION LAYER — CreateHabitModal & EditHabitModal (Phase 3)
 *
 * CreateHabitModal: Same as Phase 1 but adds:
 *   • Tags input with live preview
 *   • Color picker (reuses existing ColorPicker component)
 *   • Icon input (emoji picker — simple text input with emoji hint)
 *
 * EditHabitModal: New in Phase 3. Same fields as create, pre-populated.
 *
 * Validation displayed in UI:
 *   • Empty name guard (UX only)
 *   • Tag format hint ("lowercase, use hyphens")
 *   • Color hex validation feedback
 *
 * Domain validation happens in use case. These are just UX guards.
 *
 * Local state only — no store imports.
 * Submits a CreateHabitDTO / UpdateHabitDTO via onSubmit callback prop.
 */

import { useState, useCallback, useEffect } from 'react'
import { X, Tag, Plus }                     from 'lucide-react'
import { Modal }                            from '@presentation/components/ui/Modal'
import { Input }                            from '@presentation/components/ui/Input'
import { Select }                           from '@presentation/components/ui/Select'
import { ColorPicker }                      from '@presentation/components/ui/ColorPicker'
import { TagBadge }                         from '@presentation/components/ui/TagBadge'
import { cn }                               from '@presentation/styles/cn'
import {
  HABIT_CATEGORIES,
  CATEGORY_META,
  normaliseTag,
} from '@domain/entities/Habit'
import type { HabitSnapshot, CreateHabitDTO, HabitCategory } from '@domain/entities/Habit'

// ─── Shared form types ────────────────────────────────────────────────────────

interface HabitFormValues {
  name:        string
  category:    HabitCategory
  frequency:   'daily' | 'weekly' | 'custom'
  customDays:  number[]
  tags:        string[]
  color:       string    // '' = use category default
  icon:        string
}

const EMPTY_FORM: HabitFormValues = {
  name:       '',
  category:   'health',
  frequency:  'daily',
  customDays: [],
  tags:       [],
  color:      '',
  icon:       '',
}

// ─── Category options ─────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = HABIT_CATEGORIES.map((c) => ({
  value: c,
  label: `${CATEGORY_META[c].emoji} ${CATEGORY_META[c].label}`,
}))

const FREQUENCY_OPTIONS = [
  { value: 'daily',  label: 'Every day' },
  { value: 'weekly', label: 'Once a week' },
  { value: 'custom', label: 'Custom days' },
]

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ─── Shared form fields component ─────────────────────────────────────────────

function HabitFormFields({
  values,
  onChange,
  errors,
}: {
  values:   HabitFormValues
  onChange: (patch: Partial<HabitFormValues>) => void
  errors:   Record<string, string>
}) {
  const [tagInput, setTagInput] = useState('')

  const addTag = useCallback(() => {
    const normalised = normaliseTag(tagInput)
    if (normalised && !values.tags.includes(normalised) && values.tags.length < 10) {
      onChange({ tags: [...values.tags, normalised] })
      setTagInput('')
    }
  }, [tagInput, values.tags, onChange])

  const removeTag = useCallback((tag: string) => {
    onChange({ tags: values.tags.filter((t) => t !== tag) })
  }, [values.tags, onChange])

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !tagInput && values.tags.length) {
      onChange({ tags: values.tags.slice(0, -1) })
    }
  }, [addTag, tagInput, values.tags, onChange])

  return (
    <div className="space-y-4">
      {/* Name */}
      <Input
        label="Habit name"
        value={values.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="e.g. Morning run, Read 20 pages…"
        error={errors.name}
        autoFocus
      />

      {/* Icon + Category row */}
      <div className="grid grid-cols-[80px_1fr] gap-3">
        <Input
          label="Icon"
          value={values.icon}
          onChange={(e) => onChange({ icon: e.target.value })}
          placeholder="🏃"
          hint="Emoji"
          maxLength={4}
        />
        <Select
          label="Category"
          value={values.category}
          onChange={(e) => onChange({ category: e.target.value as HabitCategory })}
          options={CATEGORY_OPTIONS}
        />
      </div>

      {/* Frequency */}
      <Select
        label="Frequency"
        value={values.frequency}
        onChange={(e) => onChange({ frequency: e.target.value as any })}
        options={FREQUENCY_OPTIONS}
      />

      {/* Custom day picker */}
      {values.frequency === 'custom' && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Repeat on
          </p>
          <div className="flex gap-1.5" role="group" aria-label="Select days">
            {DAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                type="button"
                aria-pressed={values.customDays.includes(idx)}
                onClick={() =>
                  onChange({
                    customDays: values.customDays.includes(idx)
                      ? values.customDays.filter((d) => d !== idx)
                      : [...values.customDays, idx].sort(),
                  })
                }
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                  'transition-all duration-150',
                  values.customDays.includes(idx)
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Color <span className="font-normal normal-case text-slate-400">(optional, overrides category default)</span>
        </p>
        <ColorPicker
          value={values.color}
          onChange={(color) => onChange({ color })}
        />
      </div>

      {/* Tags input */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tags <span className="font-normal normal-case text-slate-400">(max 10)</span>
        </p>

        {/* Existing tags */}
        {values.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {values.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1">
                <TagBadge tag={tag} />
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="rounded-full p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="morning, quick, focus…"
            hint='Press Enter or comma to add. Spaces become hyphens.'
            disabled={values.tags.length >= 10}
          />
          <button
            type="button"
            onClick={addTag}
            disabled={!tagInput.trim() || values.tags.length >= 10}
            aria-label="Add tag"
            className={cn(
              'flex-shrink-0 rounded-xl border px-3 py-2.5 transition-colors',
              'text-slate-500 hover:text-brand-600 border-slate-200 hover:border-brand-300',
              'dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-600',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CreateHabitModal ─────────────────────────────────────────────────────────

interface CreateHabitModalProps {
  isOpen:   boolean
  onClose:  () => void
  onSubmit: (dto: CreateHabitDTO) => Promise<{ success: boolean; error?: string }>
}

export function CreateHabitModal({ isOpen, onClose, onSubmit }: CreateHabitModalProps) {
  const [values,     setValues]     = useState<HabitFormValues>(EMPTY_FORM)
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const handleChange = useCallback((patch: Partial<HabitFormValues>) => {
    setValues((v) => ({ ...v, ...patch }))
    setErrors({})
  }, [])

  const handleClose = useCallback(() => {
    setValues(EMPTY_FORM)
    setErrors({})
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(async () => {
    if (!values.name.trim()) {
      setErrors({ name: 'Name is required' })
      return
    }
    setSubmitting(true)
    const result = await onSubmit({
      name:        values.name.trim(),
      category:    values.category,
      frequency:   values.frequency,
      customDays:  values.customDays,
      tags:        values.tags,
      color:       values.color || undefined,
      icon:        values.icon.trim() || undefined,
    })
    setSubmitting(false)
    if (result.success) handleClose()
    else if (result.error) setErrors({ _global: result.error })
  }, [values, onSubmit, handleClose])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Habit">
      <div className="space-y-5">
        <HabitFormFields values={values} onChange={handleChange} errors={errors} />

        {errors._global && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {errors._global}
          </p>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={handleClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating…' : 'Create Habit'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── EditHabitModal ───────────────────────────────────────────────────────────

interface EditHabitModalProps {
  habit:    HabitSnapshot | null
  isOpen:   boolean
  onClose:  () => void
  onSubmit: (patch: Partial<CreateHabitDTO> & { id: string }) => Promise<{ success: boolean; error?: string }>
}

export function EditHabitModal({ habit, isOpen, onClose, onSubmit }: EditHabitModalProps) {
  const [values,     setValues]     = useState<HabitFormValues>(EMPTY_FORM)
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Pre-populate form when habit changes
  useEffect(() => {
    if (habit) {
      setValues({
        name:       habit.name,
        category:   habit.category,
        frequency:  habit.frequency,
        customDays: habit.customDays ?? [],
        tags:       habit.tags ?? [],
        color:      habit.color ?? '',
        icon:       habit.icon ?? '',
      })
      setErrors({})
    }
  }, [habit])

  const handleChange = useCallback((patch: Partial<HabitFormValues>) => {
    setValues((v) => ({ ...v, ...patch }))
    setErrors({})
  }, [])

  const handleClose = useCallback(() => {
    setErrors({})
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(async () => {
    if (!habit) return
    if (!values.name.trim()) {
      setErrors({ name: 'Name is required' })
      return
    }
    setSubmitting(true)
    const result = await onSubmit({
      id:          habit.id,
      name:        values.name.trim(),
      category:    values.category,
      frequency:   values.frequency,
      customDays:  values.customDays,
      tags:        values.tags,
      color:       values.color || undefined,
      icon:        values.icon.trim() || undefined,
    })
    setSubmitting(false)
    if (result.success) handleClose()
    else if (result.error) setErrors({ _global: result.error })
  }, [habit, values, onSubmit, handleClose])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Habit">
      <div className="space-y-5">
        <HabitFormFields values={values} onChange={handleChange} errors={errors} />

        {errors._global && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {errors._global}
          </p>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={handleClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
