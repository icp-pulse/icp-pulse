import { NextRequest, NextResponse } from 'next/server'

interface PollData {
  id: string
  title: string
  description: string
  options: {
    text: string
    votes: number
  }[]
  totalVotes: number
  createdAt?: string
  closesAt?: string
}

interface AnalysisRequest {
  polls: PollData[]
  projectName?: string
  analysisType?: 'standard' | 'advanced'
  userPrincipal?: string
}

interface AnalysisResult {
  success: boolean
  insights?: {
    overview: string
    keyFindings: string[]
    sentimentAnalysis: string
    trends: string[]
    recommendations: string[]
    pollBreakdowns: {
      pollTitle: string
      winningOption: string
      insights: string
    }[]
  }
  error?: string
  usage?: {
    remaining: number
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalysisResult>> {
  try {
    const body: AnalysisRequest = await request.json()
    const { polls, projectName, analysisType = 'standard', userPrincipal } = body

    // Validate input
    if (!polls || polls.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No polls provided for analysis'
      }, { status: 400 })
    }

    if (polls.length > 20) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 20 polls can be analyzed at once'
      }, { status: 400 })
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'AI service is not configured. Please contact support.'
      }, { status: 500 })
    }

    // Prepare poll data summary for AI
    const pollsSummary = polls.map((poll, index) => {
      const winningOption = poll.options.reduce((prev, current) =>
        current.votes > prev.votes ? current : prev
      )

      return `
Poll ${index + 1}: "${poll.title}"
Description: ${poll.description}
Total Votes: ${poll.totalVotes}
Options and Results:
${poll.options.map(opt => `  - ${opt.text}: ${opt.votes} votes (${poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0}%)`).join('\n')}
Leading Option: ${winningOption.text} with ${winningOption.votes} votes
      `.trim()
    }).join('\n\n---\n\n')

    // Construct AI prompt based on analysis type
    const systemPrompt = analysisType === 'advanced'
      ? `You are an expert data analyst specializing in survey and poll analysis. Provide deep, actionable insights from voting data with statistical rigor and strategic recommendations.`
      : `You are a helpful data analyst that provides clear, concise insights from poll voting data.`

    const userPrompt = `
Analyze the following ${polls.length} poll${polls.length > 1 ? 's' : ''} from the project "${projectName || 'Unknown Project'}".

${pollsSummary}

Please provide a comprehensive analysis in the following JSON format:
{
  "overview": "A 2-3 sentence high-level summary of the overall findings across all polls",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3", "Finding 4", "Finding 5"],
  "sentimentAnalysis": "Overall sentiment and engagement level based on voting patterns",
  "trends": ["Trend 1", "Trend 2", "Trend 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3", "Recommendation 4"],
  "pollBreakdowns": [
    {
      "pollTitle": "Poll Title",
      "winningOption": "Option that won",
      "insights": "2-3 sentences about this specific poll"
    }
  ]
}

Focus on:
1. What the voting patterns reveal about user preferences
2. Any surprising or notable results
3. Engagement levels and participation
4. Actionable recommendations based on the data
5. Trends or patterns across multiple polls

Return ONLY valid JSON, no additional text.
    `.trim()

    // Call OpenAI API
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
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', response.status, errorData)

      // Handle rate limiting
      if (response.status === 429) {
        return NextResponse.json({
          success: false,
          error: 'AI service is temporarily unavailable due to high demand. Please try again in a few minutes.'
        }, { status: 429 })
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to generate insights. Please try again.'
      }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json({
        success: false,
        error: 'No insights were generated. Please try again.'
      }, { status: 500 })
    }

    // Parse AI response
    try {
      const insights = JSON.parse(content)

      // Validate response structure
      if (!insights.overview || !insights.keyFindings || !insights.recommendations) {
        throw new Error('Invalid response structure from AI')
      }

      return NextResponse.json({
        success: true,
        insights: {
          overview: insights.overview,
          keyFindings: insights.keyFindings || [],
          sentimentAnalysis: insights.sentimentAnalysis || 'Unable to determine sentiment',
          trends: insights.trends || [],
          recommendations: insights.recommendations || [],
          pollBreakdowns: insights.pollBreakdowns || []
        }
      })
    } catch (parseError) {
      console.error('Failed to parse AI response:', content, parseError)

      // Fallback: return raw content as overview if JSON parsing fails
      return NextResponse.json({
        success: true,
        insights: {
          overview: content,
          keyFindings: ['Analysis completed - see overview for details'],
          sentimentAnalysis: 'See overview for sentiment analysis',
          trends: [],
          recommendations: ['Review the overview section for detailed insights'],
          pollBreakdowns: []
        }
      })
    }
  } catch (error) {
    console.error('Poll analysis API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 })
  }
}
