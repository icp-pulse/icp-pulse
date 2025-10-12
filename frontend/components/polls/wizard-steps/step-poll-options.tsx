'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, ListChecks, Sparkles, AlertCircle, GripVertical } from 'lucide-react'
import { UseFormRegister, FieldErrors, UseFieldArrayReturn } from 'react-hook-form'
import type { PollFormValues } from '../poll-form-types'

interface StepPollOptionsProps {
  register: UseFormRegister<PollFormValues>
  errors: FieldErrors<PollFormValues>
  fields: UseFieldArrayReturn<PollFormValues, 'options', 'id'>['fields']
  append: UseFieldArrayReturn<PollFormValues, 'options', 'id'>['append']
  remove: UseFieldArrayReturn<PollFormValues, 'options', 'id'>['remove']
  onGenerateWithAI?: () => void
  aiGenerating?: boolean
  aiError?: string | null
  watch: (name: any) => any
}

export function StepPollOptions({
  register,
  errors,
  fields,
  append,
  remove,
  onGenerateWithAI,
  aiGenerating = false,
  aiError = null,
  watch
}: StepPollOptionsProps) {
  const addOption = () => {
    append({ text: '' })
  }

  const removeOption = (index: number) => {
    if (fields.length > 2) {
      remove(index)
    }
  }

  // Get all current option values
  const optionValues = fields.map((_, index) => watch(`options.${index}.text`))
  const filledOptions = optionValues.filter((text: string) => text && text.trim() !== '')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-blue-600" />
          Poll Options
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          What choices do you want to give voters? Add at least 2 options.
        </p>
      </div>

      {/* AI Generate Button */}
      {onGenerateWithAI && (
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {fields.length} option{fields.length !== 1 ? 's' : ''} added
              {filledOptions.length > 0 && ` (${filledOptions.length} filled)`}
            </p>
          </div>
          <Button
            type="button"
            onClick={onGenerateWithAI}
            variant="outline"
            disabled={aiGenerating}
            className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {aiGenerating ? 'Generating...' : 'AI Generate Options'}
          </Button>
        </div>
      )}

      {/* AI Error Display */}
      {aiError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {aiError}
        </div>
      )}

      {/* Options List */}
      <div className="space-y-3">
        {fields.map((field, index) => {
          const optionText = watch(`options.${index}.text`) || ''
          const isFilled = optionText.trim() !== ''

          return (
            <div
              key={field.id}
              className="group flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
            >
              {/* Drag Handle (visual only for now) */}
              <div className="mt-2 cursor-move opacity-0 group-hover:opacity-50 transition-opacity">
                <GripVertical className="h-5 w-5 text-gray-400" />
              </div>

              {/* Option Number Badge */}
              <Badge
                variant={isFilled ? "default" : "outline"}
                className="min-w-[32px] h-8 flex items-center justify-center mt-1"
              >
                {index + 1}
              </Badge>

              {/* Option Input */}
              <div className="flex-1 space-y-2">
                <Input
                  {...register(`options.${index}.text`)}
                  placeholder={`Option ${index + 1} - e.g., "${
                    index === 0 ? 'Yes' : index === 1 ? 'No' : 'Maybe'
                  }"`}
                  className="text-base"
                />
                {errors.options?.[index]?.text && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.options[index]?.text?.message}
                  </div>
                )}
              </div>

              {/* Remove Button */}
              {fields.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 mt-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )
        })}

        {/* Error Message for Options Array */}
        {errors.options && typeof errors.options.message === 'string' && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="h-4 w-4" />
            {errors.options.message}
          </div>
        )}
      </div>

      {/* Add Option Button */}
      <Button
        type="button"
        onClick={addOption}
        variant="outline"
        className="w-full border-dashed border-2 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Another Option
      </Button>

      {/* Tips Box */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-medium text-amber-900 dark:text-amber-100">
              Tips for great options
            </h4>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
              <li>Keep options clear and mutually exclusive</li>
              <li>Avoid overlapping choices that might confuse voters</li>
              <li>Consider adding an &quot;Other&quot; or &quot;Not sure&quot; option</li>
              <li>Use consistent formatting across all options</li>
              <li>Aim for 2-6 options for best engagement</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 pt-2 border-t">
        <span>
          {filledOptions.length} of {fields.length} options filled
        </span>
        {filledOptions.length >= 2 && (
          <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Ready to proceed
          </span>
        )}
      </div>
    </div>
  )
}
