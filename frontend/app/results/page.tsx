"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { createBackendWithIdentity } from '@/lib/icp'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { BarChart3, PieChart as PieChartIcon, Users, Calendar, Clock, Award, Eye } from 'lucide-react'
import type { Poll } from '@/../../src/declarations/polls_surveys_backend/polls_surveys_backend.did'

interface ChartData {
  name: string
  value: number
  percentage: number
  color: string
  [key: string]: any
}

// Color palette for charts
const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
]

function ResultsContent() {
  const { identity, isAuthenticated } = useIcpAuth()
  const searchParams = useSearchParams()
  const pollId = searchParams.get('pollId')

  const [poll, setPoll] = useState<Poll | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie')

  useEffect(() => {
    const loadPollResults = async () => {
      if (!pollId) {
        setError('No poll ID provided')
        setLoading(false)
        return
      }

      try {
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'

        // For viewing results, we can use createBackend (no auth required for query calls)
        let backend
        if (isAuthenticated && identity) {
          backend = await createBackendWithIdentity({ canisterId, host, identity })
        } else {
          const { createBackend } = await import('@/lib/icp')
          backend = await createBackend({ canisterId, host })
        }

        console.log('Fetching poll with ID:', pollId)
        const pollData = await backend.get_poll(BigInt(pollId))
        console.log('Poll data received:', pollData)

        if (pollData.length > 0 && pollData[0]) {
          const pollResult = pollData[0]
          setPoll(pollResult)

          // Calculate chart data
          const totalVotes = Number(pollResult.totalVotes)
          const data: ChartData[] = pollResult.options.map((option: any, index: number) => ({
            name: option.text,
            value: Number(option.votes),
            percentage: totalVotes > 0 ? (Number(option.votes) / totalVotes) * 100 : 0,
            color: COLORS[index % COLORS.length]
          }))

          setChartData(data)
        } else {
          setError(`Poll with ID ${pollId} not found`)
        }
      } catch (error) {
        console.error('Failed to load poll results:', error)
        setError(error instanceof Error ? error.message : 'Failed to load poll')
      } finally {
        setLoading(false)
      }
    }

    loadPollResults()
  }, [pollId, isAuthenticated, identity])

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp / 1000000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTokenAmount = (amount: bigint, decimals: number = 8): string => {
    const divisor = BigInt(10 ** decimals)
    const quotient = amount / divisor
    const remainder = amount % divisor

    if (remainder === 0n) {
      return quotient.toString()
    }

    const remainderStr = remainder.toString().padStart(decimals, '0')
    const trimmedRemainder = remainderStr.replace(/0+$/, '')

    return trimmedRemainder ? `${quotient}.${trimmedRemainder}` : quotient.toString()
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            Votes: <span className="font-semibold">{data.value}</span>
          </p>
          <p className="text-sm text-gray-600">
            Percentage: <span className="font-semibold">{data.percentage.toFixed(1)}%</span>
          </p>
        </div>
      )
    }
    return null
  }

  if (!pollId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Poll Results</h1>
          <p className="text-muted-foreground">No poll ID provided. Please select a poll to view results.</p>
        </div>
      </div>
    )
  }


  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading poll results...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Unable to Load Poll</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
        </div>
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Poll Not Found</h1>
          <p className="text-muted-foreground">The requested poll could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-4">
          <BarChart3 className="h-8 w-8 text-primary" />
          Poll Results
        </h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{poll.title}</CardTitle>
            <p className="text-muted-foreground">{poll.description}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Votes</p>
                  <p className="font-semibold">{Number(poll.totalVotes)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-semibold text-sm">{formatDate(Number(poll.createdAt))}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={'active' in poll.status ? 'default' : 'secondary'}>
                    {'active' in poll.status ? 'Active' : 'Closed'}
                  </Badge>
                </div>
              </div>
              {poll.fundingInfo && poll.fundingInfo.length > 0 && poll.fundingInfo[0] && (
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Reward Fund</p>
                    <p className="font-semibold text-sm">
                      {formatTokenAmount(poll.fundingInfo[0].totalFund)} {poll.fundingInfo[0].tokenSymbol}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Controls */}
      <div className="mb-6">
        <div className="flex gap-2">
          <Button
            variant={chartType === 'pie' ? 'default' : 'outline'}
            onClick={() => setChartType('pie')}
            size="sm"
          >
            <PieChartIcon className="h-4 w-4 mr-2" />
            Pie Chart
          </Button>
          <Button
            variant={chartType === 'bar' ? 'default' : 'outline'}
            onClick={() => setChartType('bar')}
            size="sm"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Bar Chart
          </Button>
        </div>
      </div>

      {/* Results Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Vote Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }: any) => `${name}: ${Number(percentage).toFixed(1)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#8884d8">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Results Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chartData.map((option, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                      <div>
                        <p className="font-medium text-sm">{option.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {option.value} vote{option.value !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{option.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Modal */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full mt-4">
                    <Eye className="h-4 w-4 mr-2" />
                    View Detailed Results
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900">
                  <DialogHeader>
                    <DialogTitle>Detailed Poll Results</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Poll Information */}
                    <div>
                      <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Poll Information</h3>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2 text-gray-900 dark:text-gray-100">
                        <p><strong className="text-gray-900 dark:text-gray-100">Title:</strong> {poll.title}</p>
                        <p><strong className="text-gray-900 dark:text-gray-100">Description:</strong> {poll.description}</p>
                        <p><strong className="text-gray-900 dark:text-gray-100">Created:</strong> {formatDate(Number(poll.createdAt))}</p>
                        <p><strong className="text-gray-900 dark:text-gray-100">Closes:</strong> {formatDate(Number(poll.closesAt))}</p>
                        <p><strong className="text-gray-900 dark:text-gray-100">Total Votes:</strong> {Number(poll.totalVotes)}</p>
                        <p><strong className="text-gray-900 dark:text-gray-100">Total Voters:</strong> {poll.voterPrincipals.length}</p>
                        <p className="break-all"><strong className="text-gray-900 dark:text-gray-100">Created By:</strong> {poll.createdBy.toString()}</p>
                      </div>
                    </div>

                    {/* Funding Information */}
                    {poll.fundingInfo && poll.fundingInfo.length > 0 && poll.fundingInfo[0] && (
                      <div>
                        <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Funding Information</h3>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2 text-gray-900 dark:text-gray-100">
                          <p><strong className="text-gray-900 dark:text-gray-100">Token:</strong> {poll.fundingInfo[0].tokenSymbol}</p>
                          <p><strong className="text-gray-900 dark:text-gray-100">Total Fund:</strong> {formatTokenAmount(poll.fundingInfo[0].totalFund)} {poll.fundingInfo[0].tokenSymbol}</p>
                          <p><strong className="text-gray-900 dark:text-gray-100">Reward Per Vote:</strong> {formatTokenAmount(poll.fundingInfo[0].rewardPerResponse)} {poll.fundingInfo[0].tokenSymbol}</p>
                          <p><strong className="text-gray-900 dark:text-gray-100">Max Responses:</strong> {Number(poll.fundingInfo[0].maxResponses)}</p>
                          <p><strong className="text-gray-900 dark:text-gray-100">Current Responses:</strong> {Number(poll.fundingInfo[0].currentResponses)}</p>
                          <p><strong className="text-gray-900 dark:text-gray-100">Remaining Fund:</strong> {formatTokenAmount(poll.fundingInfo[0].remainingFund)} {poll.fundingInfo[0].tokenSymbol}</p>
                        </div>
                      </div>
                    )}

                    {/* Vote Breakdown */}
                    <div>
                      <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Vote Breakdown</h3>
                      <div className="space-y-2">
                        {chartData.map((option, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: option.color }}
                              />
                              <span className="font-medium text-gray-900 dark:text-gray-100">{option.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900 dark:text-gray-100">{option.value} votes</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{option.percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        Close
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading poll results...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}