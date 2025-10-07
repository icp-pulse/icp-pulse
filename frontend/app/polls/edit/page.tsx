"use client"

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState, useEffect, Suspense } from 'react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Trash2, Plus } from 'lucide-react'

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(2, 'Description must be at least 2 characters'),
})

type FormValues = z.infer<typeof schema>

function EditPollContent() {
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { identity, isAuthenticated } = useIcpAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pollId = searchParams.get('id')

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
    }
  })

  // Fetch poll data
  useEffect(() => {
    async function fetchPoll() {
      if (!pollId) {
        setErr('No poll ID provided')
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

        const poll = await backend.get_poll(BigInt(pollId))

        if (poll && poll.length > 0) {
          const p = poll[0]
          setValue('title', p.title)
          setValue('description', p.description)
        } else {
          setErr('Poll not found')
        }
      } catch (error) {
        console.error('Error fetching poll:', error)
        setErr('Failed to load poll')
      } finally {
        setLoading(false)
      }
    }

    fetchPoll()
  }, [pollId, identity, isAuthenticated, setValue])

  const handleViewResults = () => {
    router.push(`/results?pollId=${pollId}`)
  }

  const handleViewPolls = () => {
    router.push('/admin?tab=polls')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-8 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading poll...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to edit this poll.</p>
        </div>
      </div>
    )
  }

  if (!pollId || err) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Unable to Load Poll</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{err || 'No poll ID provided'}</p>
          <Button onClick={() => router.push('/admin?tab=polls')}>
            Back to Polls
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 px-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin?tab=polls')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold">View Poll Details</h1>
      </div>

      <div className="space-y-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Polls cannot be edited after creation. You can view the details below and check the results.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Poll Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Title</label>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                <Input
                  {...register('title')}
                  disabled
                  className="border-0 bg-transparent p-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                <Textarea
                  {...register('description')}
                  rows={4}
                  disabled
                  className="border-0 bg-transparent p-0 resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {err && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleViewPolls}
            className="flex-1"
          >
            Back to Polls
          </Button>
          <Button
            type="button"
            onClick={handleViewResults}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            View Results
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function EditPollPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto space-y-6 py-8 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <EditPollContent />
    </Suspense>
  )
}
