import { NextRequest, NextResponse } from 'next/server'
import { createBackend } from '@/lib/icp'

// Types for poll creation
interface PollCreationRequest {
  title: string
  description: string
  options: string[]
  scopeType: 'project' | 'product'
  scopeId: number
  closesAt: number
  fundingEnabled?: boolean
  fundingAmount?: number
  rewardPerVote?: number
  durationDays?: number
}

interface PollPreview {
  title: string
  description: string
  options: string[]
  durationDays: number
  fundingAmount?: number
  closesAt: number
  scopeId: number
}

async function detectPollOptionsGeneration(message: string): Promise<string | null> {
  // Simple pattern matching for poll option generation requests
  const lowerMessage = message.toLowerCase()
  const patterns = [
    /generate.*options?.*(for|about|on)\s+(.+)/i,
    /suggest.*options?.*(for|about|on)\s+(.+)/i,
    /create.*options?.*(for|about|on)\s+(.+)/i,
    /what.*options?.*(for|about|on)\s+(.+)/i,
    /give.*options?.*(for|about|on)\s+(.+)/i,
    /options?.*(for|about|on)\s+(.+)/i
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match && match[2]) {
      return match[2].trim()
    }
  }

  // Also check if message is just a topic without specific keywords
  if (lowerMessage.includes('poll') && lowerMessage.includes('option')) {
    // Extract the topic - simple approach: take everything after "about" or "for"
    const aboutMatch = message.match(/(?:about|for|on)\s+(.+)/i)
    if (aboutMatch) return aboutMatch[1].trim()
  }

  return null
}

async function detectPollCreation(message: string): Promise<PollPreview | null> {
  if (!process.env.OPENAI_API_KEY) return null

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a poll creation detector for True Pulse. Extract poll details from user requests.

If the user wants to create a poll, respond with JSON:
{
  "title": "Poll title",
  "description": "Brief description",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "durationDays": 7,
  "fundingAmount": null,
  "scopeId": 1
}

IMPORTANT:
- Generate 4 relevant options if not specified
- durationDays: extract from "X days", default 7
- fundingAmount: extract if user mentions "fund with X PULSE" or similar, otherwise null
- If user says just a topic like "favorite color", generate appropriate options
- scopeId: always 1

If NOT a poll creation request, respond: "NOT_A_POLL_REQUEST"

Examples:
"Create poll about favorite color" → {"title":"Favorite Color","description":"What is your favorite color?","options":["Red","Blue","Green","Yellow"],"durationDays":7,"fundingAmount":null,"scopeId":1}
"Poll on best framework, 3 days, fund 50 PULSE" → {"title":"Best Framework","description":"Which framework is best?","options":["React","Vue","Angular","Svelte"],"durationDays":3,"fundingAmount":50,"scopeId":1}`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 400,
      temperature: 0.3,
    }),
  })

  if (!response.ok) return null

  const data = await response.json()
  const content = data.choices[0]?.message?.content?.trim()

  if (content === 'NOT_A_POLL_REQUEST') return null

  try {
    const pollData = JSON.parse(content)
    // Validate required fields
    if (pollData.title && pollData.options && pollData.options.length >= 2) {
      // Calculate closesAt timestamp
      const durationMs = (pollData.durationDays || 7) * 24 * 60 * 60 * 1000
      const closesAt = Date.now() + durationMs

      return {
        title: pollData.title,
        description: pollData.description || pollData.title,
        options: pollData.options,
        durationDays: pollData.durationDays || 7,
        fundingAmount: pollData.fundingAmount || undefined,
        closesAt: closesAt * 1_000_000, // Convert to nanoseconds
        scopeId: pollData.scopeId || 1
      }
    }
  } catch (error) {
    console.error('Failed to parse poll data:', error)
  }

  return null
}

async function generatePollOptionsInBackend(topic: string): Promise<{ success: boolean; options?: string[]; error?: string }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { success: false, error: 'OpenAI API key not configured' }
    }

    // Call OpenAI directly from API route
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates poll options. Return ONLY a JSON array of exactly 4 poll option strings, nothing else. Format: ["option1","option2","option3","option4"]'
          },
          {
            role: 'user',
            content: `Generate 4 poll options for: ${topic}`
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', response.status, errorData)

      // If rate limited, provide fallback options
      if (response.status === 429) {
        return {
          success: true,
          options: [
            `${topic} - Option 1`,
            `${topic} - Option 2`,
            `${topic} - Option 3`,
            `${topic} - Option 4`
          ]
        }
      }

      return { success: false, error: `OpenAI API error: ${response.status}` }
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content?.trim()

    if (!content) {
      return { success: false, error: 'No content in OpenAI response' }
    }

    // Try to parse the JSON array from the response
    try {
      // The content should be a JSON array like ["opt1", "opt2", "opt3", "opt4"]
      const options = JSON.parse(content)

      if (Array.isArray(options) && options.length >= 4) {
        return { success: true, options: options.slice(0, 4) }
      } else {
        return { success: false, error: 'Invalid options format from OpenAI' }
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content)
      return { success: false, error: 'Failed to parse options from OpenAI' }
    }
  } catch (error) {
    console.error('Option generation error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function createPollInBackend(pollData: PollPreview): Promise<{ success: boolean; pollId?: string; error?: string }> {
  try {
    // Get canister configuration
    const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID
    const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'

    if (!canisterId) {
      return { success: false, error: 'Backend canister not configured' }
    }

    const backend = await createBackend({ canisterId, host })

    // Calculate funding details if provided
    let totalFundE8s = 0n
    let rewardPerVoteE8s = 0n
    const fundingEnabled = !!pollData.fundingAmount

    if (pollData.fundingAmount && pollData.fundingAmount > 0) {
      // Assume 4 options means we need to fund for at least 100 responses
      const estimatedResponses = 100
      totalFundE8s = BigInt(Math.floor(pollData.fundingAmount * 100_000_000))
      rewardPerVoteE8s = totalFundE8s / BigInt(estimatedResponses)
    }

    // Get token canister ID if funding is enabled
    const tokenCanisterId = fundingEnabled && pollData.fundingAmount
      ? process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID || ''
      : ''

    // Create poll using backend function with new configuration parameters
    const pollId = await backend.create_poll(
      'project',
      BigInt(pollData.scopeId),
      pollData.title,
      pollData.description,
      pollData.options,
      BigInt(pollData.closesAt),
      totalFundE8s,
      fundingEnabled,
      rewardPerVoteE8s > 0n ? [rewardPerVoteE8s] : [],
      ['self-funded'], // fundingSource - default to self-funded for AI-created polls
      // New configuration parameters with sensible defaults for AI-created polls
      [], // maxResponses - no limit
      [false], // allowAnonymous - disabled by default
      [false], // allowMultiple - disabled by default
      ['public'], // visibility - public by default
      ['fixed'] // rewardDistributionType - fixed by default
    )

    return { success: true, pollId: pollId.toString() }
  } catch (error) {
    console.error('Backend poll creation error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, messages, action, pollPreview } = await request.json()

    // Handle poll creation confirmation
    if (action === 'create_poll' && pollPreview) {
      const result = await createPollInBackend(pollPreview)

      if (result.success) {
        return NextResponse.json({
          message: `✅ Poll created successfully!\n\n**${pollPreview.title}**\n${pollPreview.description}\n\nYour poll is now live and accepting votes!`,
          pollCreated: true,
          pollId: result.pollId
        })
      } else {
        return NextResponse.json({
          message: `❌ Failed to create poll: ${result.error}\n\nPlease try again or check your authentication.`,
          pollCreated: false
        })
      }
    }

    // First, check if this is a poll options generation request
    const optionsTopic = await detectPollOptionsGeneration(message)

    if (optionsTopic) {
      // Generate options using backend HTTPS outcall
      const result = await generatePollOptionsInBackend(optionsTopic)

      if (result.success && result.options) {
        return NextResponse.json({
          message: `Here are some poll options for "${optionsTopic}":\n\n${result.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\nYou can use these options in your poll or ask me to generate different ones!`,
          optionsGenerated: true,
          options: result.options,
          topic: optionsTopic
        })
      } else {
        return NextResponse.json({
          message: `❌ Failed to generate options: ${result.error}\n\nPlease try again with a different topic or check that the OpenAI API is configured.`,
          optionsGenerated: false
        })
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Next, check if this is a poll creation request
    const pollRequest = await detectPollCreation(message)

    if (pollRequest) {
      // Return preview instead of creating immediately
      return NextResponse.json({
        message: `I've prepared a poll preview for you. Review the details and click "Create Poll" to submit it!`,
        pollPreview: true,
        preview: pollRequest
      })
    }

    // Regular chat response
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant for True Pulse, a platform for context-aware polls and surveys on the Internet Computer.

Key features you can help with:
- Creating polls: I can create polls for you! Just describe what you want to ask and the answer options.
- Managing surveys: Help with survey creation and management
- Platform guidance: Explain how to use True Pulse features

When users ask about creating polls, offer to create them directly through the chat interface.`
          },
          ...messages.map((msg: any) => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const aiMessage = data.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.'

    return NextResponse.json({ message: aiMessage })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}