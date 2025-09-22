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
  rewardPerVote?: number
}

async function detectPollCreation(message: string): Promise<PollCreationRequest | null> {
  if (!process.env.OPENAI_API_KEY) return null

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a poll creation detector. If the user is asking to create a poll, extract the information and respond with a JSON object. Otherwise, respond with "NOT_A_POLL_REQUEST".

Required format for poll creation:
{
  "title": "Poll title",
  "description": "Poll description", 
  "options": ["Option 1", "Option 2", ...],
  "scopeType": "project",
  "scopeId": 1,
  "closesAt": timestamp_in_nanoseconds,
  "fundingEnabled": false
}

Use these defaults:
- scopeType: "project"
- scopeId: 1 (default project)
- closesAt: 7 days from now in nanoseconds
- fundingEnabled: false

Only respond with the JSON or "NOT_A_POLL_REQUEST".`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 300,
      temperature: 0.1,
    }),
  })

  if (!response.ok) return null

  const data = await response.json()
  const content = data.choices[0]?.message?.content?.trim()

  if (content === 'NOT_A_POLL_REQUEST') return null

  try {
    const pollData = JSON.parse(content)
    // Validate required fields
    if (pollData.title && pollData.description && pollData.options && pollData.options.length >= 2) {
      return pollData
    }
  } catch (error) {
    console.error('Failed to parse poll data:', error)
  }

  return null
}

async function createPollInBackend(pollData: PollCreationRequest): Promise<{ success: boolean; pollId?: number; error?: string }> {
  try {
    // Get canister configuration
    const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID || 'rdmx6-jaaaa-aaaah-qdrha-cai'
    const host = process.env.NEXT_PUBLIC_IC_HOST || 'https://icp-api.io'

    const backend = await createBackend({ canisterId, host })

    // Create poll using backend function
    const pollId = await backend.create_poll(
      pollData.scopeType,
      BigInt(pollData.scopeId),
      pollData.title,
      pollData.description,
      pollData.options,
      BigInt(pollData.closesAt),
      BigInt(0), // rewardFund
      pollData.fundingEnabled || false,
      pollData.rewardPerVote ? [BigInt(pollData.rewardPerVote)] : []
    )

    return { success: true, pollId: Number(pollId) }
  } catch (error) {
    console.error('Backend poll creation error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, messages } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // First, check if this is a poll creation request
    const pollRequest = await detectPollCreation(message)

    if (pollRequest) {
      // Create poll in backend
      const result = await createPollInBackend(pollRequest)
      
      if (result.success) {
        return NextResponse.json({ 
          message: `✅ Poll created successfully! Poll ID: ${result.pollId}\n\n**${pollRequest.title}**\n${pollRequest.description}\n\nOptions:\n${pollRequest.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`,
          pollCreated: true,
          pollId: result.pollId
        })
      } else {
        return NextResponse.json({ 
          message: `❌ Failed to create poll: ${result.error}\n\nWould you like me to help you try again with different parameters?`,
          pollCreated: false
        })
      }
    }

    // Regular chat response
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant for ICP Pulse, a platform for context-aware polls and surveys on the Internet Computer. 

Key features you can help with:
- Creating polls: I can create polls for you! Just describe what you want to ask and the answer options.
- Managing surveys: Help with survey creation and management
- Platform guidance: Explain how to use ICP Pulse features

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