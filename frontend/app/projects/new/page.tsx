"use client"

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState } from 'react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter } from 'next/navigation'

const schema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
})

type FormValues = z.infer<typeof schema>

async function createProjectAction(values: FormValues, identity: any) {
  const { createBackendWithIdentity } = await import('@/lib/icp')
  
  if (!identity) {
    throw new Error('Please login first')
  }

  const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
  const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
  
  const backend = await createBackendWithIdentity({ canisterId, host, identity })
  
  try {
    const projectId = await backend.create_project(values.name, values.description)
    return { success: true, projectId }
  } catch (error) {
    console.error('Error creating project:', error)
    throw new Error('Failed to create project: ' + (error as Error).message)
  }
}

export default function NewProjectPage() {
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const { identity } = useIcpAuth()
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Create Project</h1>
      <form
        className="space-y-4"
        onSubmit={handleSubmit((v) => {
          setErr(null)
          startTransition(async () => {
            try {
              await createProjectAction(v, identity)
              router.push('/admin')
            } catch (e: any) {
              setErr(e.message || 'Error')
            }
          })
        })}
      >
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input className="w-full border rounded px-3 py-2 bg-transparent" {...register('name')} />
          {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea className="w-full border rounded px-3 py-2 bg-transparent" rows={4} {...register('description')} />
          {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="h-16" />
        <div className="fixed bottom-16 md:bottom-6 inset-x-0 flex justify-center pointer-events-none">
          <div className="pointer-events-auto bg-white dark:bg-[#0b0b0d] border rounded-full px-4 py-2 shadow">
            <button disabled={pending} className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black">
              {pending ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
