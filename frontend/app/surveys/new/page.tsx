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
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter } from 'next/navigation'

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
  closesAt: z.string().min(1, 'Please set a closing date').refine((dateStr) => {
    if (!dateStr) return false
    const selectedDate = new Date(dateStr)
    const now = new Date()
    return selectedDate > now
  }, 'Closing date must be in the future'),
  allowAnonymous: z.boolean().default(false),
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
  // Funding fields
  fundingEnabled: z.boolean().default(false),
  totalFundICP: z.number().min(0).optional(),
  rewardPerResponse: z.number().min(0).optional(),
})

type FormValues = z.infer<typeof schema>

interface Project {
  id: string
  name: string
}

async function createSurveyAction(values: FormValues, identity: any) {
  const { createBackendWithIdentity } = await import('@/lib/icp')
  
  if (!identity) {
    throw new Error('Please login first')
  }

  const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
  const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
  
  const backend = await createBackendWithIdentity({ canisterId, host, identity })
  
  // Convert form values to backend format
  const { title, description, projectId, closesAt, allowAnonymous, questions, fundingEnabled, totalFundICP, rewardPerResponse } = values
  
  // Convert to nanoseconds and ensure it's in the future
  const closesAtDate = new Date(closesAt)
  const now = new Date()
  
  // If no closesAt provided or it's in the past, set it to 30 days from now
  if (!closesAt || closesAtDate <= now) {
    console.warn('Survey close date is in the past or not provided, setting to 30 days from now')
    closesAtDate.setTime(now.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 days from now
  }
  
  const closesAtNs = closesAtDate.getTime() * 1_000_000
  
  console.log('Survey creation details:', {
    title,
    closesAt,
    closesAtDate: closesAtDate.toISOString(),
    closesAtNs,
    currentTime: now.toISOString(),
    questionsCount: questions.length
  })
  
  // Transform questions to backend format  
  const backendQuestions = questions.map(q => {
    // Match exact field names from backend: qType (not the reserved word "type")
    const question = {
      qType: q.type,  // Use qType to avoid reserved keyword issues
      text: q.text || '',
      required: q.required ?? true,
      choices: (q.choices && q.choices.length > 0) ? [q.choices] : [],
      min: (q.min !== undefined && q.min !== null) ? [q.min] : [],
      max: (q.max !== undefined && q.max !== null) ? [q.max] : [],
      helpText: (q.helpText && q.helpText.trim()) ? [q.helpText.trim()] : []
    }
    
    console.log('Transformed question:', q, '=>', question)
    return question
  })
  
  console.log('Final backend questions:', JSON.stringify(backendQuestions, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2))
  
  try {
    // Calculate funding parameters
    const rewardFundLegacy = fundingEnabled ? Math.floor((totalFundICP || 0) * 100) : 0 // Convert decimal to integer (cents)
    const rewardPerResponseE8s = fundingEnabled && rewardPerResponse ? BigInt(Math.floor(rewardPerResponse * 100_000_000)) : null
    
    const surveyId = await backend.create_survey(
      'project',
      BigInt(projectId),
      title,
      description,
      BigInt(closesAtNs),
      BigInt(rewardFundLegacy), // legacy rewardFund for backward compatibility
      allowAnonymous,
      backendQuestions as any,
      fundingEnabled,
      rewardPerResponseE8s ? [rewardPerResponseE8s] : [] // Optional parameter as array
    )
    
    return { success: true, surveyId }
  } catch (error) {
    console.error('Error creating survey:', error)
    throw new Error('Failed to create survey: ' + (error as Error).message)
  }
}

export default function NewSurveyPage() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const { identity } = useIcpAuth()
  const router = useRouter()
  
  // Get minimum datetime (current time + 1 minute)
  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1) // Add 1 minute buffer
    return now.toISOString().slice(0, 16) // Format for datetime-local input
  }

  const { register, handleSubmit, formState: { errors }, control, setValue, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      questions: [{
        type: 'short',
        text: '',
        required: true,
        choices: [],
        helpText: ''
      }],
      fundingEnabled: false,
      totalFundICP: 0,
      rewardPerResponse: 0,
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions'
  })

  // Fetch projects for dropdown
  useEffect(() => {
    async function fetchProjects() {
      if (!identity) return
      
      try {
        const { createBackendWithIdentity } = await import('@/lib/icp')
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const backend = await createBackendWithIdentity({ canisterId, host, identity })
        
        const projectData = await backend.list_projects(0n, 100n)
        setProjects(projectData.map((p: any) => ({ id: p.id.toString(), name: p.name })))
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      }
    }
    fetchProjects()
  }, [identity])

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

  const fundingEnabled = watch('fundingEnabled')
  const totalFundICP = watch('totalFundICP') || 0
  const rewardPerResponse = watch('rewardPerResponse') || 0
  const maxResponses = rewardPerResponse > 0 ? Math.floor(totalFundICP / rewardPerResponse) : 0

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
              await createSurveyAction(values, identity)
              router.push('/admin?tab=surveys')
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
                  min={getMinDateTime()}
                  {...register('closesAt')} 
                  className="w-full"
                />
                {errors.closesAt && <p className="text-sm text-red-600 mt-1">{errors.closesAt.message}</p>}
                <p className="text-xs text-gray-500 mt-1">Survey must close in the future</p>
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

        {/* Funding Section */}
        <Card>
          <CardHeader>
            <CardTitle>Funding & Rewards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fundingEnabled"
                {...register('fundingEnabled')}
                className="rounded border-gray-300"
              />
              <label htmlFor="fundingEnabled" className="text-sm font-medium">
                Enable ICP rewards for responses
              </label>
            </div>
            
            {fundingEnabled && (
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Total Fund (ICP)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('totalFundICP', { valueAsNumber: true })}
                      placeholder="10.00"
                      className="w-full"
                    />
                    {errors.totalFundICP && <p className="text-sm text-red-600 mt-1">{errors.totalFundICP.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Reward per Response (ICP)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('rewardPerResponse', { valueAsNumber: true })}
                      placeholder="0.50"
                      className="w-full"
                    />
                    {errors.rewardPerResponse && <p className="text-sm text-red-600 mt-1">{errors.rewardPerResponse.message}</p>}
                  </div>
                </div>
                
                {totalFundICP > 0 && rewardPerResponse > 0 && (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                    <h4 className="font-medium text-sm mb-2">Funding Summary</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Total Fund:</span>
                        <span className="font-mono">{totalFundICP.toFixed(2)} ICP</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reward per Response:</span>
                        <span className="font-mono">{rewardPerResponse.toFixed(2)} ICP</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Funded Responses:</span>
                        <span className="font-mono">{maxResponses}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Total in e8s:</span>
                        <span className="font-mono">{Math.floor(totalFundICP * 100_000_000).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <p>• Participants will receive ICP rewards directly to their wallets upon survey completion</p>
                  <p>• Rewards are distributed automatically from your funded amount</p>
                  <p>• Once the fund is depleted, no more rewards will be given</p>
                </div>
              </div>
            )}
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