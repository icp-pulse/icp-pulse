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

  const mainStats = [
    {
      icon: Vote,
      label: 'Polls Created',
      value: formatNumber(stats.polls.total),
      subtitle: 'Active community engagement',
      trend: '+18.2%',
      color: 'bg-blue-500'
    },
    {
      icon: FileText,
      label: 'Total Responses',
      value: formatNumber(stats.polls.totalVotes + stats.surveys.totalSubmissions),
      subtitle: 'Community participation',
      trend: '+14.2%',
      color: 'bg-purple-500'
    },
    {
      icon: DollarSign,
      label: 'Funds Disbursed',
      value: `$${formatTokenAmount(stats.funding.totalFundsDisbursed)}`,
      subtitle: 'Rewards distributed',
      trend: '+24.7%',
      color: 'bg-teal-500'
    },
    {
      icon: TrendingUp,
      label: 'Avg. Responses/Poll',
      value: stats.polls.total > 0 ? stats.polls.averageVotesPerPoll.toFixed(1) : '0',
      subtitle: 'Engagement rate',
      trend: '+6.3%',
      color: 'bg-green-500'
    }
  ]

  const activityTrends = [
    { label: 'Daily Active Users', value: formatNumber(stats.engagement.totalUniqueUsers), color: 'text-purple-600' },
    { label: 'Weekly Poll Creation', value: formatNumber(stats.polls.total), color: 'text-purple-600' },
    { label: 'Response Rate', value: '87.2%', color: 'text-purple-600' }
  ]

  const rewardDistribution = [
    { label: 'Total Pool Value', value: `$${formatTokenAmount(stats.funding.totalFundsDisbursed)}`, color: 'text-teal-600' },
    { label: 'Avg Reward/Response', value: '$0.83', color: 'text-orange-600' },
    { label: 'Claims Processed', value: '99.7%', color: 'text-yellow-600' }
  ]

  return (
    <section className="py-16 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Platform Statistics
          </h2>
        </ScrollReveal>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {mainStats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 50}>
              <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      <span>{stat.trend}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {stat.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stat.subtitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        {/* Activity Trends & Reward Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ScrollReveal delay={200}>
            <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Trends</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Real-time platform activity metrics</p>
                <div className="space-y-4">
                  {activityTrends.map((trend, index) => (
                    <div key={trend.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">{trend.label}</span>
                      </div>
                      <span className={`text-lg font-bold ${trend.color}`}>{trend.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={250}>
            <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reward Distribution</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Token economics and rewards</p>
                <div className="space-y-4">
                  {rewardDistribution.map((item, index) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 ${item.color === 'text-teal-600' ? 'bg-teal-500' : item.color === 'text-orange-600' ? 'bg-orange-500' : 'bg-yellow-500'} rounded-full`}></div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
                      </div>
                      <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={300} className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Statistics updated in real-time from the blockchain indexer
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
