import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createBackend } from '@/lib/icp'

const optionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
})

const schema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  projectId: z.string().min(1),
  expiresAt: z.string().min(1),
  allowAnonymous: z.boolean().default(false),
  allowMultiple: z.boolean().default(false),
  options: z.array(optionSchema).min(2),
})

function dateTimeToNanoseconds(dateTimeString: string): number {
  const date = new Date(dateTimeString)
  const ms = date.getTime()
  return ms * 1_000_000 // Convert ms to nanoseconds, return as number for Int type
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.issues 
      }, { status: 400 })
    }

    const canisterId = process.env.CANISTER_ID_POLLS_SURVEYS_BACKEND || 
                      process.env.POLLS_SURVEYS_BACKEND_CANISTER_ID || 
                      process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID || ''
    
    if (!canisterId) {
      return NextResponse.json({ error: 'Backend canister ID not configured' }, { status: 500 })
    }
    
    const host = process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943'
    const backend = await createBackend({ canisterId, host })
    
    const { title, description, projectId, expiresAt, allowAnonymous, allowMultiple, options } = parsed.data
    
    // Convert datetime to nanoseconds
    const expiresAtNs = dateTimeToNanoseconds(expiresAt)
    
    // Transform options to backend format
    const backendOptions = options.map(option => option.text)
    
    // Create poll in backend
    const pollId = await backend.create_poll(
      'project', // scopeType
      BigInt(projectId), // scopeId as bigint
      title,
      description,
      backendOptions, // options array
      BigInt(expiresAtNs), // closesAt as bigint
      BigInt(0) // rewardFund as bigint
    )
    
    return NextResponse.json({ 
      success: true, 
      pollId: pollId.toString(),
      message: 'Poll created successfully'
    })
    
  } catch (error) {
    console.error('Error creating poll:', error)
    return NextResponse.json(
      { error: 'Failed to create poll: ' + (error instanceof Error ? error.message : 'Unknown error') }, 
      { status: 500 }
    )
  }
}