"use client"

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState, useEffect, Suspense } from 'react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(2, 'Description must be at least 2 characters'),
  status: z.enum(['active', 'draft', 'completed', 'archived']),
})

type FormValues = z.infer<typeof schema>

async function updateProjectAction(id: number, values: FormValues, identity: any, isAuthenticated: boolean) {
  const { createBackendWithIdentity } = await import('@/lib/icp')

  if (!isAuthenticated) {
    throw new Error('Please login first')
  }

  const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
  const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'

  const backend = await createBackendWithIdentity({ canisterId, host, identity })

  try {
    const success = await backend.update_project(
      BigInt(id),
      values.name,
      values.description,
      values.status
    )

    if (success) {
      return { success: true }
    } else {
      throw new Error('Project not found')
    }
  } catch (error) {
    console.error('Error updating project:', error)
    throw new Error('Failed to update project: ' + (error as Error).message)
  }
}

function EditProjectContent() {
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { identity, isAuthenticated } = useIcpAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      status: 'active',
    }
  })

  const selectedStatus = watch('status')

  // Fetch project data
  useEffect(() => {
    async function fetchProject() {
      if (!projectId) {
        setErr('No project ID provided')
        setLoading(false)
        return
      }

      if (!isAuthenticated) {
        setLoading(false)
        return
      }

      try {
        const { createBackendWithIdentity } = await import('@/lib/icp')
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const backend = await createBackendWithIdentity({ canisterId, host, identity })

        const project = await backend.get_project(BigInt(projectId))

        if (project && project.length > 0) {
          const p = project[0]
          setValue('name', p.name)
          setValue('description', p.description)
          setValue('status', p.status as any)
        } else {
          setErr('Project not found')
        }
      } catch (error) {
        console.error('Error fetching project:', error)
        setErr('Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [projectId, identity, isAuthenticated, setValue])

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading project...</p>
        </div>
      </div>
    )
  }

  if (!projectId) {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-8">
        <div className="text-center">
          <p className="text-red-600">No project ID provided</p>
          <Button onClick={() => router.push('/admin')} className="mt-4">
            Back to Admin
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 py-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold">Edit Project</h1>
      </div>

      <form
        className="space-y-4"
        onSubmit={handleSubmit((v) => {
          setErr(null)
          startTransition(async () => {
            try {
              await updateProjectAction(Number(projectId), v, identity, isAuthenticated)
              router.push('/admin')
            } catch (e: any) {
              setErr(e.message || 'Error')
            }
          })
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                className="w-full border rounded px-3 py-2 bg-transparent"
                {...register('name')}
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full border rounded px-3 py-2 bg-transparent"
                rows={4}
                {...register('description')}
              />
              {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select value={selectedStatus} onValueChange={(value: any) => setValue('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>}
            </div>
          </CardContent>
        </Card>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin')}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {pending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function EditProjectPage() {
  return (
    <Suspense fallback={
      <div className="max-w-xl mx-auto space-y-6 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <EditProjectContent />
    </Suspense>
  )
}
