import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createBackend } from '@/lib/icp'

const schema = z.object({ name: z.string().min(2), description: z.string().min(2) })

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const canisterId = process.env.CANISTER_ID_POLLS_SURVEYS_BACKEND || process.env.POLLS_SURVEYS_BACKEND_CANISTER_ID || process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID || ''
  const host = process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943'
  const backend = await createBackend({ canisterId, host })
  await backend.create_project(parsed.data.name, parsed.data.description)
  return NextResponse.json({ ok: true })
}
