import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createBackend } from '@/lib/icp'

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
  title: z.string().min(2),
  description: z.string().min(2),
  projectId: z.string().min(1),
  closesAt: z.string().min(1),
  allowAnonymous: z.boolean().default(false),
  questions: z.array(questionSchema).min(1),
})

function dateTimeToNanoseconds(dateTimeString: string): bigint {
  const date = new Date(dateTimeString)
  const ms = date.getTime()
  return BigInt(ms) * 1_000_000n // Convert ms to nanoseconds
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
    
    const { title, description, projectId, closesAt, allowAnonymous, questions } = parsed.data
    
    // Convert datetime to nanoseconds
    const closesAtNs = dateTimeToNanoseconds(closesAt)
    
    // Transform questions to backend format
    const backendQuestions = questions.map((q, index) => ({
      type_: q.type as string,
      text: q.text,
      required: q.required,
      choices: q.choices?.length ? [q.choices] : [],
      min: q.min !== undefined ? [BigInt(q.min)] : [],
      max: q.max !== undefined ? [BigInt(q.max)] : [],
      helpText: q.helpText?.trim() ? [q.helpText.trim()] : []
    })) as { type_: string; text: string; required: boolean; choices: [] | [string[]]; min: [] | [bigint]; max: [] | [bigint]; helpText: [] | [string]; }[]
    
    // Create survey in backend
    const surveyId = await backend.create_survey(
      'project', // scopeType - surveys are always scoped to projects
      BigInt(projectId), // scopeId
      title,
      description,
      closesAtNs,
      0n, // rewardFund - defaulting to 0 for now
      allowAnonymous,
      backendQuestions
    )
    
    return NextResponse.json({ 
      success: true, 
      surveyId: surveyId.toString(),
      message: 'Survey created successfully'
    })
    
  } catch (error) {
    console.error('Error creating survey:', error)
    return NextResponse.json(
      { error: 'Failed to create survey: ' + (error instanceof Error ? error.message : 'Unknown error') }, 
      { status: 500 }
    )
  }
}