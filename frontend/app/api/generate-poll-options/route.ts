import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json()

    if (!title || title.length < 2) {
      return NextResponse.json(
        { error: 'Poll title is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Return ONLY a JSON array of 4 poll option strings, nothing else. Format: ["option1","option2","option3","option4"]'
          },
          {
            role: 'user',
            content: `Generate 4 poll options for: ${title}`
          }
        ],
        temperature: 0.7, // Can use creative temperature since no consensus needed
        max_tokens: 150
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.error?.message || 'OpenAI API error' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No content in OpenAI response' },
        { status: 500 }
      )
    }

    // Parse the JSON array from the content
    try {
      const options = JSON.parse(content)
      if (!Array.isArray(options) || options.length < 2) {
        return NextResponse.json(
          { error: 'Invalid options format from AI' },
          { status: 500 }
        )
      }

      return NextResponse.json({ options })
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Could not parse AI response as JSON' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error generating poll options:', error)
    return NextResponse.json(
      { error: 'Failed to generate options' },
      { status: 500 }
    )
  }
}
