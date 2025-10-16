import { NextRequest, NextResponse } from 'next/server'
import { createBackend } from '@/lib/icp'

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json()

    if (!title || title.length < 2) {
      return NextResponse.json(
        { error: 'Poll title is required' },
        { status: 400 }
      )
    }

    // Get canister configuration
    const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID
    const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local'
      ? 'http://127.0.0.1:4943'
      : 'https://ic0.app'

    if (!canisterId) {
      return NextResponse.json(
        { error: 'Backend canister not configured' },
        { status: 500 }
      )
    }

    // Generate a random seed on the server side
    // This ensures all ICP replicas will use the same seed
    const seed = Math.floor(Math.random() * 1000000000)

    console.log(`Calling ICP canister to generate options for: "${title}" with seed: ${seed}`)

    const backend = await createBackend({ canisterId, host })

    // Call the ICP canister's generate_poll_options function
    // The canister will make the HTTP outcall to the deterministic gateway
    const result = await backend.generate_poll_options(title, [BigInt(seed)])

    if ('ok' in result) {
      const options = result.ok
      console.log(`Successfully generated ${options.length} options from ICP canister`)
      return NextResponse.json({ options })
    } else {
      console.error('ICP canister returned error:', result.err)
      return NextResponse.json(
        { error: result.err || 'Failed to generate options from canister' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error generating poll options:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate options' },
      { status: 500 }
    )
  }
}
