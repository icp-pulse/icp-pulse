"use client"

import { useState, useEffect, Suspense } from 'react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, BarChart3, CheckCircle2, Settings, Coins } from 'lucide-react'
import { PollBreadcrumb } from '@/components/polls/poll-breadcrumb'

// Helper to get status string
function statusToString(status: any): string {
  if (!status) return 'unknown'
  if (status.active !== undefined) return 'Active'
  if (status.paused !== undefined) return 'Paused'
  if (status.claimsOpen !== undefined) return 'Claims Open'
  if (status.claimsEnded !== undefined) return 'Claims Ended'
  if (status.closed !== undefined) return 'Closed'
  if (typeof status === 'string') return status
  return 'unknown'
}

function EditPollContent() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [poll, setPoll] = useState<any>(null)
  const { identity, isAuthenticated } = useIcpAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pollId = searchParams.get('id')

  // Fetch poll data
  useEffect(() => {
    async function fetchPoll() {
      if (!pollId) {
        setErr('No poll ID provided')
        setLoading(false)
        return
      }

      if (!isAuthenticated) {
        setLoading(false)
        return
      }

      try {
        const { createBackendWithIdentity } = await import('@/lib/icp')
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const backend = await createBackendWithIdentity({ canisterId, host, identity })

        const pollData = await backend.get_poll(BigInt(pollId))

        if (pollData && pollData.length > 0) {
          setPoll(pollData[0])
        } else {
          setErr('Poll not found')
        }
      } catch (error) {
        console.error('Error fetching poll:', error)
        setErr('Failed to load poll')
      } finally {
        setLoading(false)
      }
    }

    fetchPoll()
  }, [pollId, identity, isAuthenticated])

  const formatDate = (timestampNs: any) => {
    if (!timestampNs) return 'Unknown'
    const date = new Date(Number(timestampNs) / 1_000_000)
    return date.toLocaleDateString('en-US', {
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

  const handleViewResults = () => {
    router.push(`/results?pollId=${pollId}`)
  }

  const handleViewPolls = () => {
    router.push('/creator?tab=polls')
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 py-8 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading poll details...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to view this poll.</p>
        </div>
      </div>
    )
  }

  if (!pollId || err) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Unable to Load Poll</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{err || 'No poll ID provided'}</p>
          <Button onClick={() => router.push('/creator?tab=polls')}>
            Back to Polls
          </Button>
        </div>
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Poll Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The requested poll could not be found.</p>
          <Button onClick={() => router.push('/creator?tab=polls')}>
            Back to Polls
          </Button>
        </div>
      </div>
    )
  }

  const pollStatus = statusToString(poll.status)
  const totalVotes = Number(poll.totalVotes || 0n)

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-8 px-4">
      {/* Breadcrumb Navigation */}
      <PollBreadcrumb pollTitle={poll.title} pollId={pollId!} currentPage="details" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{poll.title}</h1>
          <p className="text-gray-600 dark:text-gray-400">{poll.description}</p>
        </div>
        <Badge className={
          pollStatus === 'Active' ? 'bg-green-100 text-green-800 border-green-200' :
          pollStatus === 'Paused' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
          pollStatus === 'Closed' ? 'bg-gray-100 text-gray-800 border-gray-200' :
          'bg-blue-100 text-blue-800 border-blue-200'
        }>
          {pollStatus}
        </Badge>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Polls cannot be edited after creation. You can view all details below and check the results.
        </p>
      </div>

      {/* Poll Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Poll Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Poll ID</label>
              <p className="text-base font-mono">{poll.id.toString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Votes</label>
              <p className="text-base">{totalVotes}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Participants</label>
              <p className="text-base">{poll.voterPrincipals?.length || 0}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created By</label>
              <p className="text-base font-mono text-xs break-all">{poll.createdBy?.toString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</label>
              <p className="text-base">{formatDate(poll.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Closes At</label>
              <p className="text-base">{formatDate(poll.closesAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Poll Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Poll Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {poll.options && poll.options.map((option: any, index: number) => {
              const votes = Number(option.votes || 0n)
              const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Badge variant="outline" className="min-w-[32px] h-8 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium">{option.text}</p>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-semibold">{votes}</p>
                    <p className="text-sm text-gray-500">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      {poll.config && poll.config.length > 0 && poll.config[0] && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Responses</label>
                <p className="text-base">
                  {poll.config[0].maxResponses && poll.config[0].maxResponses.length > 0
                    ? Number(poll.config[0].maxResponses[0])
                    : 'Unlimited'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Allow Anonymous</label>
                <p className="text-base">{poll.config[0].allowAnonymous ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Allow Multiple Votes</label>
                <p className="text-base">{poll.config[0].allowMultiple ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Visibility</label>
                <p className="text-base capitalize">{poll.config[0].visibility || 'Public'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Reward Distribution</label>
                <p className="text-base">
                  {'Fixed' in poll.config[0].rewardDistributionType ? 'Fixed' : 'Equal Split'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funding Information */}
      {poll.fundingInfo && poll.fundingInfo.length > 0 && poll.fundingInfo[0] && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Funding & Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Token</label>
                <p className="text-base font-semibold">{poll.fundingInfo[0].tokenSymbol}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Fund</label>
                <p className="text-base">
                  {formatTokenAmount(poll.fundingInfo[0].totalFund, Number(poll.fundingInfo[0].tokenDecimals))} {poll.fundingInfo[0].tokenSymbol}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Reward Per Vote</label>
                <p className="text-base">
                  {formatTokenAmount(poll.fundingInfo[0].rewardPerResponse, Number(poll.fundingInfo[0].tokenDecimals))} {poll.fundingInfo[0].tokenSymbol}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Responses</label>
                <p className="text-base">
                  {poll.fundingInfo[0].maxResponses && poll.fundingInfo[0].maxResponses.length > 0
                    ? Number(poll.fundingInfo[0].maxResponses[0])
                    : 'Unlimited (budget-based)'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Responses</label>
                <p className="text-base">{Number(poll.fundingInfo[0].currentResponses)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Remaining Fund</label>
                <p className="text-base">
                  {formatTokenAmount(poll.fundingInfo[0].remainingFund, Number(poll.fundingInfo[0].tokenDecimals))} {poll.fundingInfo[0].tokenSymbol}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Funding Type</label>
                <p className="text-base">
                  {'SelfFunded' in poll.fundingInfo[0].fundingType ? 'Self-Funded' :
                   'Crowdfunded' in poll.fundingInfo[0].fundingType ? 'Crowdfunded' :
                   'Treasury-Funded'}
                </p>
              </div>
              {poll.fundingInfo[0].tokenCanister && poll.fundingInfo[0].tokenCanister.length > 0 && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Token Canister</label>
                  <p className="text-sm font-mono break-all">{poll.fundingInfo[0].tokenCanister[0].toString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleViewPolls}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Polls
        </Button>
        <Button
          type="button"
          onClick={handleViewResults}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          View Results
        </Button>
      </div>
    </div>
  )
}

export default function EditPollPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto space-y-6 py-8 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <EditPollContent />
    </Suspense>
  )
}
