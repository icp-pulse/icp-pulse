'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Calendar, FileText, FolderOpen, MessageSquare } from 'lucide-react'
import { UseFormRegister, FieldErrors } from 'react-hook-form'
import type { PollFormValues } from '../poll-form-types'

interface StepBasicInfoProps {
  register: UseFormRegister<PollFormValues>
  errors: FieldErrors<PollFormValues>
  setValue: (name: any, value: any) => void
  projects: Array<{ id: string; name: string; status: string }>
  prefilledTitle?: string
}

export function StepBasicInfo({
  register,
  errors,
  setValue,
  projects,
  prefilledTitle
}: StepBasicInfoProps) {
  // Get minimum datetime (current time + 1 minute)
  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1)
    return now.toISOString().slice(0, 16)
  }

  // Suggest default expiry (7 days from now)
  const getDefaultExpiry = () => {
    const future = new Date()
    future.setDate(future.getDate() + 7)
    return future.toISOString().slice(0, 16)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          Basic Information
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Let&apos;s start with the essentials. What&apos;s your poll about?
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Poll Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Poll Question
          </Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="e.g., What feature should we build next?"
            className="text-lg"
            defaultValue={prefilledTitle}
          />
          {errors.title && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {errors.title.message}
            </div>
          )}
          <p className="text-sm text-gray-500">
            Keep it clear and concise. This is what voters will see first.
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Description
          </Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Provide more context about this poll and what you're trying to learn..."
            rows={4}
            className="resize-none"
          />
          {errors.description && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {errors.description.message}
            </div>
          )}
          <p className="text-sm text-gray-500">
            Give voters the full picture. Explain the context and why their input matters.
          </p>
        </div>

        {/* Project and Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="projectId" className="text-base font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Project / Category
            </Label>
            <Select onValueChange={(value) => setValue('projectId', value)}>
              <SelectTrigger id="projectId">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <SelectItem value="no-projects" disabled>
                    No active projects available
                  </SelectItem>
                ) : (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.projectId && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.projectId.message}
              </div>
            )}
            <p className="text-sm text-gray-500">
              Organize your poll under a project or category
            </p>
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiresAt" className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Duration / Expires At
            </Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              min={getMinDateTime()}
              {...register('expiresAt')}
              defaultValue={getDefaultExpiry()}
            />
            {errors.expiresAt && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.expiresAt.message}
              </div>
            )}
            <p className="text-sm text-gray-500">
              When should this poll close? Default is 7 days.
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                Tips for a great poll
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Ask a clear, specific question</li>
                <li>Provide enough context in the description</li>
                <li>Choose an appropriate duration based on urgency</li>
                <li>Select the right project to reach your target audience</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
