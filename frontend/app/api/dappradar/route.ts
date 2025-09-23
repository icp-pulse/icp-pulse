import { NextRequest, NextResponse } from 'next/server'

interface DappRadarMetrics {
  UAW: number // Unique Active Wallets
  transactions: number
  volume: number
  balance: number
}

interface DappRadarResponse {
  success: boolean
  dapp: {
    dappId: string
    name: string
    category: string
    chains: string[]
    metrics: {
      daily: DappRadarMetrics
      weekly: DappRadarMetrics
      monthly: DappRadarMetrics
    }
    history: Array<{
      date: string
      UAW: number
      transactions: number
      volume: number
      balance: number
    }>
  }
}

export async function GET(request: NextRequest) {
  try {
    // In a real implementation, you would fetch this data from your backend canister
    // For now, we'll return mock data that represents your TruePulse metrics

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Mock data - replace with actual backend calls
    const mockMetrics: DappRadarResponse = {
      success: true,
      dapp: {
        dappId: 'truepulse-icp',
        name: 'TruePulse',
        category: 'Governance',
        chains: ['ICP'],
        metrics: {
          daily: {
            UAW: 125, // Unique users who voted/created polls today
            transactions: 89, // Poll votes + survey submissions + reward claims
            volume: 0, // No financial volume for polls/surveys
            balance: 0 // No balance tracking needed
          },
          weekly: {
            UAW: 456,
            transactions: 623,
            volume: 0,
            balance: 0
          },
          monthly: {
            UAW: 1234,
            transactions: 2456,
            volume: 0,
            balance: 0
          }
        },
        history: [
          {
            date: yesterday.toISOString().split('T')[0],
            UAW: 98,
            transactions: 76,
            volume: 0,
            balance: 0
          },
          {
            date: today.toISOString().split('T')[0],
            UAW: 125,
            transactions: 89,
            volume: 0,
            balance: 0
          }
        ]
      }
    }

    return NextResponse.json(mockMetrics)
  } catch (error) {
    console.error('DappRadar API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Future implementation would integrate with your ICP backend:
/*
async function getActualMetrics() {
  const canisterId = process.env.POLLS_SURVEYS_BACKEND_CANISTER_ID!
  const host = process.env.DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'

  // Create backend connection
  const backend = createActor(canisterId, { agentOptions: { host } })

  // Get analytics data from your backend
  const dailyStats = await backend.get_daily_analytics()
  const weeklyStats = await backend.get_weekly_analytics()
  const monthlyStats = await backend.get_monthly_analytics()

  return {
    daily: {
      UAW: dailyStats.unique_users,
      transactions: dailyStats.total_votes + dailyStats.total_submissions + dailyStats.total_claims,
      volume: 0,
      balance: 0
    },
    // ... similar for weekly and monthly
  }
}
*/