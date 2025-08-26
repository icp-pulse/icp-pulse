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

const optionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
})

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(2, 'Description must be at least 2 characters'),
  projectId: z.string().min(1, 'Please select a project'),
  expiresAt: z.string().min(1, 'Please set an expiry date'),
  allowAnonymous: z.boolean().default(false),
  allowMultiple: z.boolean().default(false),
  options: z.array(optionSchema).min(2, 'At least two options are required'),
})

type FormValues = z.infer<typeof schema>

interface Project {
  id: string
  name: string
}

async function createPollAction(values: FormValues, identity: any) {
  const { createBackendWithIdentity } = await import('@/lib/icp')
  
  if (!identity) {
    throw new Error('Please login first')
  }

  const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
  const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
  
  const backend = await createBackendWithIdentity({ canisterId, host, identity })
  
  // Convert form values to backend format
  const { title, description, projectId, expiresAt, allowAnonymous, allowMultiple, options } = values
  
  const backendOptions = options.map(opt => opt.text)
  const expiresAtNs = new Date(expiresAt).getTime() * 1_000_000
  
  try {
    const pollId = await backend.create_poll(
      'project',
      BigInt(projectId),
      title,
      description,
      backendOptions,
      BigInt(expiresAtNs),
      BigInt(0) // rewardFund
    )
    
    return { success: true, pollId }
  } catch (error) {
    console.error('Error creating poll:', error)
    throw new Error('Failed to create poll: ' + (error as Error).message)
  }
}

export default function NewPollPage() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const { identity } = useIcpAuth()
  const router = useRouter()

  const { register, handleSubmit, formState: { errors }, control, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      options: [
        { text: '' },
        { text: '' }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options'
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

  const addOption = () => {
    append({ text: '' })
  }

  const removeOption = (index: number) => {
    if (fields.length > 2) {
      remove(index)
    }
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
          <h1 className="text-2xl font-semibold">Create Poll</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create a quick poll to gather votes and make decisions
          </p>
        </div>
      </div>

      <form
        className="space-y-6"
        onSubmit={handleSubmit((values) => {
          setError(null)
          startTransition(async () => {
            try {
              await createPollAction(values, identity)
              router.push('/admin?tab=polls')
            } catch (e: any) {
              setError(e.message || 'Error creating poll')
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
                placeholder="Enter poll title"
                className="w-full"
              />
              {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea 
                {...register('description')} 
                placeholder="Describe what this poll is about"
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
                <label className="block text-sm font-medium mb-2">Expires At</label>
                <Input 
                  type="datetime-local"
                  {...register('expiresAt')} 
                  className="w-full"
                />
                {errors.expiresAt && <p className="text-sm text-red-600 mt-1">{errors.expiresAt.message}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowAnonymous"
                  {...register('allowAnonymous')}
                  className="rounded border-gray-300"
                />
                <label htmlFor="allowAnonymous" className="text-sm font-medium">
                  Allow anonymous votes
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowMultiple"
                  {...register('allowMultiple')}
                  className="rounded border-gray-300"
                />
                <label htmlFor="allowMultiple" className="text-sm font-medium">
                  Allow multiple choice selection
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Poll Options ({fields.length})</CardTitle>
              <Button type="button" onClick={addOption} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-4">
                <Badge variant="outline" className="min-w-fit">
                  {index + 1}
                </Badge>
                <div className="flex-1">
                  <Input 
                    {...register(`options.${index}.text`)}
                    placeholder={`Option ${index + 1}`}
                    className="w-full"
                  />
                  {errors.options?.[index]?.text && (
                    <p className="text-sm text-red-600 mt-1">{errors.options[index]?.text?.message}</p>
                  )}
                </div>
                {fields.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {errors.options && (
              <p className="text-sm text-red-600">{errors.options.message}</p>
            )}
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
            {pending ? 'Creating Poll...' : 'Create Poll'}
          </Button>
        </div>
      </form>
    </div>
  )
}