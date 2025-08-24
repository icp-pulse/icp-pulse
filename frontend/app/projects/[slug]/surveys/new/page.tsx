'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createBackend } from '@/lib/icp'
import type { ProjectSummary } from '@/lib/types'

type QuestionType = 'single' | 'multi' | 'likert' | 'short' | 'long' | 'number' | 'rating'

interface Question {
  id: string
  type: QuestionType
  text: string
  required: boolean
  choices?: string[]
  min?: number
  max?: number
  helpText?: string
}

export default function NewSurveyPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [rewardFund, setRewardFund] = useState('0')
  const [allowAnonymous, setAllowAnonymous] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [project, setProject] = useState<ProjectSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true)
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID || ''
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const backend = await createBackend({ canisterId, host })
        
        const projects = await backend.list_projects(0n, 100n)
        const foundProject = projects.find(p => p.slug === params.slug)
        
        if (!foundProject) {
          setError('Project not found')
          return
        }
        
        setProject(foundProject)
      } catch (err) {
        console.error('Error loading project:', err)
        setError('Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [params.slug])

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: 'short',
      text: '',
      required: false,
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q))
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!project) {
      setError('Project not loaded')
      return
    }
    
    if (!title || !description || questions.length === 0) {
      setError('Please fill in all required fields and add at least one question')
      return
    }

    // Validate questions
    const invalidQuestion = questions.find(q => 
      !q.text.trim() || 
      (q.type === 'single' || q.type === 'multi') && (!q.choices || q.choices.length < 2 || q.choices.some(c => !c.trim()))
    )
    
    if (invalidQuestion) {
      setError('All questions must have text and choice questions need at least 2 non-empty choices')
      return
    }

    setIsSubmitting(true)
    setError(null)
    
    try {
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID || ''
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackend({ canisterId, host })
      
      // Convert datetime-local to nanoseconds timestamp
      const closesAtNs = closesAt ? BigInt(new Date(closesAt).getTime() * 1_000_000) : BigInt(Date.now() + 30 * 24 * 60 * 60 * 1000) * BigInt(1_000_000) // Default to 30 days from now
      
      // Prepare questions for backend - using Candid optional format
      const backendQuestions = questions.map(q => ({
        type_: q.type,
        text: q.text,
        required: q.required,
        choices: q.choices?.length ? [q.choices] : [],
        min: q.min !== undefined ? [BigInt(q.min)] : [],
        max: q.max !== undefined ? [BigInt(q.max)] : [],
        helpText: q.helpText?.trim() ? [q.helpText.trim()] : []
      }))
      
      console.log('Sending survey data:', {
        scopeType: 'project',
        scopeId: project.id,
        title,
        description,
        closesAt: closesAtNs,
        rewardFund: BigInt(rewardFund),
        allowAnonymous,
        questions: backendQuestions
      })
      
      const surveyId = await backend.create_survey(
        'project',
        project.id,
        title,
        description,
        closesAtNs,
        BigInt(rewardFund),
        allowAnonymous,
        backendQuestions
      )
      
      console.log('Survey created with ID:', surveyId)
      
      // Navigate back to projects page
      router.push('/projects')
    } catch (error) {
      console.error('Error creating survey:', error)
      setError('Failed to create survey. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Create Survey</h1>
            <p className="text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Create Survey</h1>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
        <Button asChild variant="outline">
          <a href="/projects">Back to Projects</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Create Survey</h1>
          <p className="text-muted-foreground">Project: {project?.name || params.slug}</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Survey Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Title *
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter survey title"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description *
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this survey is about"
                rows={3}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="closesAt" className="block text-sm font-medium mb-2">
                  Closes At
                </label>
                <Input
                  id="closesAt"
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="rewardFund" className="block text-sm font-medium mb-2">
                  Reward Fund
                </label>
                <Input
                  id="rewardFund"
                  type="number"
                  min="0"
                  value={rewardFund}
                  onChange={(e) => setRewardFund(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                id="allowAnonymous"
                type="checkbox"
                checked={allowAnonymous}
                onChange={(e) => setAllowAnonymous(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="allowAnonymous" className="text-sm">
                Allow anonymous responses
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Questions</CardTitle>
              <Button type="button" onClick={addQuestion} variant="outline" size="sm">
                Add Question
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No questions added yet. Click "Add Question" to get started.
              </p>
            ) : (
              questions.map((question, index) => (
                <QuestionBuilder
                  key={question.id}
                  question={question}
                  index={index}
                  onUpdate={(updates) => updateQuestion(question.id, updates)}
                  onRemove={() => removeQuestion(question.id)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Survey'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href="/projects">Cancel</a>
          </Button>
        </div>
      </form>
    </div>
  )
}

function QuestionBuilder({ 
  question, 
  index, 
  onUpdate, 
  onRemove 
}: { 
  question: Question
  index: number
  onUpdate: (updates: Partial<Question>) => void
  onRemove: () => void
}) {
  const questionTypes: { value: QuestionType; label: string }[] = [
    { value: 'single', label: 'Single Choice' },
    { value: 'multi', label: 'Multiple Choice' },
    { value: 'short', label: 'Short Text' },
    { value: 'long', label: 'Long Text' },
    { value: 'number', label: 'Number' },
    { value: 'rating', label: 'Rating' },
    { value: 'likert', label: 'Likert Scale' },
  ]

  const addChoice = () => {
    const choices = question.choices || []
    onUpdate({ choices: [...choices, ''] })
  }

  const updateChoice = (choiceIndex: number, value: string) => {
    const choices = [...(question.choices || [])]
    choices[choiceIndex] = value
    onUpdate({ choices })
  }

  const removeChoice = (choiceIndex: number) => {
    const choices = question.choices?.filter((_, i) => i !== choiceIndex) || []
    onUpdate({ choices })
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Question {index + 1}</h4>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Question Type</label>
          <select
            value={question.type}
            onChange={(e) => onUpdate({ type: e.target.value as QuestionType })}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {questionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="rounded"
          />
          <label className="text-sm">Required</label>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Question Text *</label>
        <Input
          value={question.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Enter your question"
          required
        />
      </div>

      {(question.type === 'single' || question.type === 'multi') && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Choices</label>
            <Button type="button" size="sm" variant="outline" onClick={addChoice}>
              Add Choice
            </Button>
          </div>
          <div className="space-y-2">
            {question.choices?.map((choice, choiceIndex) => (
              <div key={choiceIndex} className="flex items-center gap-2">
                <Input
                  value={choice}
                  onChange={(e) => updateChoice(choiceIndex, e.target.value)}
                  placeholder={`Choice ${choiceIndex + 1}`}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeChoice(choiceIndex)}
                >
                  Remove
                </Button>
              </div>
            )) || []}
          </div>
        </div>
      )}

      {(question.type === 'number' || question.type === 'rating' || question.type === 'likert') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Value</label>
            <Input
              type="number"
              value={question.min || ''}
              onChange={(e) => onUpdate({ min: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Maximum Value</label>
            <Input
              type="number"
              value={question.max || ''}
              onChange={(e) => onUpdate({ max: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-2">Help Text (Optional)</label>
        <Input
          value={question.helpText || ''}
          onChange={(e) => onUpdate({ helpText: e.target.value })}
          placeholder="Additional instructions for respondents"
        />
      </div>
    </div>
  )
}