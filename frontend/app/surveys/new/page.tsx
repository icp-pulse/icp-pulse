"use client"

import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'

const questionSchema = z.object({
  type: z.enum(['single', 'multi', 'likert', 'short', 'long', 'number', 'rating']),
  text: z.string().min(1, 'Question text is required'),
  required: z.boolean().default(true),
  choices: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  helpText: z.string().optional(),
})

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(2, 'Description must be at least 2 characters'),
  projectId: z.string().min(1, 'Please select a project'),
  closesAt: z.string().min(1, 'Please set a closing date'),
  allowAnonymous: z.boolean().default(false),
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
})

type FormValues = z.infer<typeof schema>

interface Project {
  id: string
  name: string
}

async function createSurveyAction(values: FormValues) {
  const response = await fetch('/surveys/new/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  })
  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Failed to create survey')
  }
  return response.json()
}

export default function NewSurveyPage() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])

  const { register, handleSubmit, formState: { errors }, control, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      questions: [{
        type: 'short',
        text: '',
        required: true,
        choices: [],
        helpText: ''
      }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions'
  })

  // Fetch projects for dropdown
  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects')
        if (response.ok) {
          const projectData = await response.json()
          setProjects(projectData)
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      }
    }
    fetchProjects()
  }, [])

  const addQuestion = () => {
    append({
      type: 'short',
      text: '',
      required: true,
      choices: [],
      helpText: ''
    })
  }

  const removeQuestion = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'single': return 'Single Choice'
      case 'multi': return 'Multiple Choice'
      case 'likert': return 'Likert Scale'
      case 'short': return 'Short Text'
      case 'long': return 'Long Text'
      case 'number': return 'Number'
      case 'rating': return 'Rating'
      default: return type
    }
  }

  const requiresChoices = (type: string) => {
    return ['single', 'multi'].includes(type)
  }

  const requiresMinMax = (type: string) => {
    return ['likert', 'number', 'rating'].includes(type)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Create Survey</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Design your survey with custom questions and settings
          </p>
        </div>
      </div>

      <form
        className="space-y-6"
        onSubmit={handleSubmit((values) => {
          setError(null)
          startTransition(async () => {
            try {
              await createSurveyAction(values)
              window.location.href = '/admin?tab=surveys'
            } catch (e: any) {
              setError(e.message || 'Error creating survey')
            }
          })
        })}
      >
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input 
                {...register('title')} 
                placeholder="Enter survey title"
                className="w-full"
              />
              {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea 
                {...register('description')} 
                placeholder="Describe what this survey is about"
                rows={3}
                className="w-full"
              />
              {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Project</label>
                <Select onValueChange={(value) => setValue('projectId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.projectId && <p className="text-sm text-red-600 mt-1">{errors.projectId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Closes At</label>
                <Input 
                  type="datetime-local"
                  {...register('closesAt')} 
                  className="w-full"
                />
                {errors.closesAt && <p className="text-sm text-red-600 mt-1">{errors.closesAt.message}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowAnonymous"
                {...register('allowAnonymous')}
                className="rounded border-gray-300"
              />
              <label htmlFor="allowAnonymous" className="text-sm font-medium">
                Allow anonymous responses
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Questions ({fields.length})</CardTitle>
              <Button type="button" onClick={addQuestion} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => {
              const questionType = watch(`questions.${index}.type`)
              
              return (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Question {index + 1}</Badge>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Question Type</label>
                      <Select 
                        onValueChange={(value) => setValue(`questions.${index}.type` as any, value)}
                        defaultValue={field.type}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Short Text</SelectItem>
                          <SelectItem value="long">Long Text</SelectItem>
                          <SelectItem value="single">Single Choice</SelectItem>
                          <SelectItem value="multi">Multiple Choice</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="rating">Rating</SelectItem>
                          <SelectItem value="likert">Likert Scale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        {...register(`questions.${index}.required`)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`required-${index}`} className="text-sm font-medium">
                        Required
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Question Text</label>
                    <Input 
                      {...register(`questions.${index}.text`)}
                      placeholder="Enter your question"
                      className="w-full"
                    />
                    {errors.questions?.[index]?.text && (
                      <p className="text-sm text-red-600 mt-1">{errors.questions[index]?.text?.message}</p>
                    )}
                  </div>

                  {requiresChoices(questionType) && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Choices (one per line)</label>
                      <Textarea
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                        rows={4}
                        onChange={(e) => {
                          const choices = e.target.value.split('\n').filter(choice => choice.trim())
                          setValue(`questions.${index}.choices` as any, choices)
                        }}
                        className="w-full"
                      />
                    </div>
                  )}

                  {requiresMinMax(questionType) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Min Value</label>
                        <Input
                          type="number"
                          {...register(`questions.${index}.min`, { valueAsNumber: true })}
                          placeholder="1"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Max Value</label>
                        <Input
                          type="number"
                          {...register(`questions.${index}.max`, { valueAsNumber: true })}
                          placeholder="5"
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">Help Text (optional)</label>
                    <Input 
                      {...register(`questions.${index}.helpText`)}
                      placeholder="Additional instructions or help text"
                      className="w-full"
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating Survey...' : 'Create Survey'}
          </Button>
        </div>
      </form>
    </div>
  )
}