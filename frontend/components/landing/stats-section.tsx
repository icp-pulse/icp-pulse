"use client"

import { useEffect, useState } from 'react'
import { ScrollReveal } from './scroll-reveal'
import { Card, CardContent } from '@/components/ui/card'
import {
  TrendingUp,
  Users,
  FileText,
  Vote,
  DollarSign,
  Activity
} from 'lucide-react'

interface AnalyticsOverview {
  polls: {
    total: number
    totalVotes: number
    averageVotesPerPoll: number
  }
  surveys: {
    total: number
    totalSubmissions: number
    averageSubmissionsPerSurvey: number
  }
  funding: {
    totalFundsDisbursed: string
    disbursedByToken: Array<{
      tokenSymbol: string
      amount: string
      count: number
    }>
  }
  engagement: {
    uniqueVoters: number
    uniqueRespondents: number
    totalUniqueUsers: number
  }
}

export function StatsSection() {
  const [stats, setStats] = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_INDEXER_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/overview`)
        if (!response.ok) {
          throw new Error('Failed to fetch statistics')
        }
        const data = await response.json()
        setStats(data)
      } catch (err) {
        console.error('Error fetching stats:', err)
        setError('Unable to load statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  // Format large numbers with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  // Format token amounts (convert from e8s to decimal)
  const formatTokenAmount = (amount: string, decimals: number = 8) => {
    const num = BigInt(amount)
    const divisor = BigInt(10 ** decimals)
    const formatted = Number(num) / Number(divisor)
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(formatted)
  }

  if (loading) {
    return (
      <section className="py-24 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Activity className="w-12 h-12 text-blue-600 mx-auto animate-pulse" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading statistics...</p>
          </div>
        </div>
      </section>
    )
  }

  if (error || !stats) {
    return null // Hide section if stats unavailable
  }

  const statCards = [
    {
      icon: Vote,
      label: 'Total Polls',
      value: formatNumber(stats.polls.total),
      subtitle: `${formatNumber(stats.polls.totalVotes)} total votes`,
      color: 'blue'
    },
    {
      icon: FileText,
      label: 'Total Surveys',
      value: formatNumber(stats.surveys.total),
      subtitle: `${formatNumber(stats.surveys.totalSubmissions)} submissions`,
      color: 'purple'
    },
    {
      icon: Users,
      label: 'Active Users',
      value: formatNumber(stats.engagement.totalUniqueUsers),
      subtitle: `${formatNumber(stats.engagement.uniqueVoters)} voters, ${formatNumber(stats.engagement.uniqueRespondents)} respondents`,
      color: 'green'
    },
    {
      icon: DollarSign,
      label: 'Funds Disbursed',
      value: stats.funding.disbursedByToken.length > 0
        ? `${formatTokenAmount(stats.funding.disbursedByToken[0].amount)} ${stats.funding.disbursedByToken[0].tokenSymbol}`
        : '0 ICP',
      subtitle: stats.funding.disbursedByToken.length > 0
        ? `${stats.funding.disbursedByToken[0].count} rewards claimed`
        : 'No rewards yet',
      color: 'orange'
    },
    {
      icon: TrendingUp,
      label: 'Avg Engagement',
      value: stats.polls.total > 0
        ? stats.polls.averageVotesPerPoll.toFixed(1)
        : '0',
      subtitle: 'votes per poll',
      color: 'pink'
    },
    {
      icon: Activity,
      label: 'Survey Response Rate',
      value: stats.surveys.total > 0
        ? stats.surveys.averageSubmissionsPerSurvey.toFixed(1)
        : '0',
      subtitle: 'submissions per survey',
      color: 'indigo'
    }
  ]

  return (
    <section className="py-24 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Platform Statistics
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Real-time analytics from our blockchain indexer showing current platform activity
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 100}>
              <Card className="hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center mb-4`}>
                        <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stat.subtitle}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        {/* Additional breakdown if multiple tokens */}
        {stats.funding.disbursedByToken.length > 1 && (
          <ScrollReveal delay={600} className="mt-12">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Rewards by Token</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.funding.disbursedByToken.map((token) => (
                  <div key={token.tokenSymbol} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium">{token.tokenSymbol}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{token.count} rewards</p>
                    </div>
                    <p className="text-xl font-bold">{formatTokenAmount(token.amount)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </ScrollReveal>
        )}

        <ScrollReveal delay={700} className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Statistics updated in real-time from the blockchain indexer
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
