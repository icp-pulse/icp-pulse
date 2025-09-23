"use client"

import { useEffect, useState } from 'react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { createBackendWithIdentity } from '@/lib/icp'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Coins, Gift, CheckCircle, Clock, AlertCircle, Vote, BarChart3, Trophy, Calendar, Wallet } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import Link from 'next/link'
import { WalletBalance } from '@/components/WalletBalance'

import type { PendingReward, BackendPendingReward, Poll } from '@/lib/types'

interface UserVote {
  pollId: string
  pollTitle: string
  optionId: string
  optionText: string
  votedAt: number
  pollStatus: 'active' | 'closed'
  hasReward: boolean
  rewardAmount?: string
  rewardToken?: string
}

interface DashboardStats {
  totalVotes: number
  pendingRewards: number
  claimedRewards: number
  totalRewardValue: number
}

export default function ParticipantDashboard() {
  const { identity, isAuthenticated, principalText } = useIcpAuth()
  const [loading, setLoading] = useState(true)
  const [votingHistory, setVotingHistory] = useState<UserVote[]>([])
  const [rewards, setRewards] = useState<PendingReward[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalVotes: 0,
    pendingRewards: 0,
    claimedRewards: 0,
    totalRewardValue: 0
  })
  const [claiming, setClaiming] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const loadDashboardData = async () => {
      if (isAuthenticated && identity) {
        try {
          setLoading(true)

          // Track dashboard page visit
          analytics.track('page_viewed', {
            path: '/dashboard',
            page_title: 'Participant Dashboard'
          })

          const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
          const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
          const backend = await createBackendWithIdentity({ canisterId, host, identity })

          const userPrincipal = identity.getPrincipal()

          // Load rewards
          const backendRewards = await backend.get_user_rewards(userPrincipal)
          const transformedRewards: PendingReward[] = backendRewards.map(reward => ({
            id: reward.id,
            pollId: reward.pollId,
            pollTitle: reward.pollTitle,
            userPrincipal: reward.userPrincipal.toText(),
            amount: reward.amount,
            tokenSymbol: reward.tokenSymbol,
            tokenDecimals: reward.tokenDecimals,
            tokenCanister: reward.tokenCanister.length > 0 ? reward.tokenCanister[0]?.toText() || null : null,
            status: reward.status,
            claimedAt: reward.claimedAt.length > 0 ? reward.claimedAt[0] || null : null,
            votedAt: reward.votedAt
          }))
          setRewards(transformedRewards)

          // Calculate stats
          const pendingRewards = transformedRewards.filter(r => 'pending' in r.status)
          const claimedRewards = transformedRewards.filter(r => 'claimed' in r.status)
          const totalRewardValue = pendingRewards.reduce((sum, reward) => {
            if (reward.tokenSymbol === 'PULSE') {
              const amount = Number(reward.amount) / Math.pow(10, reward.tokenDecimals)
              return sum + amount
            }
            return sum
          }, 0)

          // Mock voting history (since we don't have this endpoint yet)
          // In a real implementation, you'd call something like:
          // const userVotes = await backend.get_user_voting_history(userPrincipal)
          const mockVotingHistory: UserVote[] = [
            {
              pollId: '1',
              pollTitle: 'What features should we prioritize next?',
              optionId: '2',
              optionText: 'Mobile App Development',
              votedAt: Date.now() - 86400000, // 1 day ago
              pollStatus: 'active',
              hasReward: true,
              rewardAmount: '10',
              rewardToken: 'PULSE'
            },
            {
              pollId: '2',
              pollTitle: 'Preferred token for rewards?',
              optionId: '1',
              optionText: 'PULSE Token',
              votedAt: Date.now() - 172800000, // 2 days ago
              pollStatus: 'closed',
              hasReward: true,
              rewardAmount: '5',
              rewardToken: 'PULSE'
            },
            {
              pollId: '3',
              pollTitle: 'Community governance model?',
              optionId: '3',
              optionText: 'Hybrid DAO + Traditional',
              votedAt: Date.now() - 259200000, // 3 days ago
              pollStatus: 'closed',
              hasReward: false
            }
          ]

          setVotingHistory(mockVotingHistory)
          setStats({
            totalVotes: mockVotingHistory.length,
            pendingRewards: pendingRewards.length,
            claimedRewards: claimedRewards.length,
            totalRewardValue
          })

        } catch (error) {
          console.error('Failed to load dashboard data:', error)
          analytics.track('error_occurred', {
            error_type: 'dashboard_load_failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            component: 'ParticipantDashboard',
            action: 'load_dashboard_data'
          })
        } finally {
          setLoading(false)
        }
      }
    }

    loadDashboardData()
  }, [isAuthenticated, identity])

  const formatTokenAmount = (amount: bigint, decimals: number): string => {
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

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleClaimReward = async (rewardId: string) => {
    setClaiming(prev => ({ ...prev, [rewardId]: true }))

    try {
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity: identity! })

      const success = await backend.claim_reward(rewardId)

      if (success) {
        const claimedReward = rewards.find(r => r.id === rewardId)

        if (claimedReward) {
          analytics.track('reward_claimed', {
            reward_id: rewardId,
            poll_id: claimedReward.pollId.toString(),
            amount: formatTokenAmount(claimedReward.amount, claimedReward.tokenDecimals),
            token_symbol: claimedReward.tokenSymbol
          })
        }

        // Update local state
        setRewards(prev => prev.map(reward =>
          reward.id === rewardId
            ? { ...reward, status: { claimed: null }, claimedAt: BigInt(Date.now() * 1000000) }
            : reward
        ))

        // Update stats
        setStats(prev => ({
          ...prev,
          pendingRewards: prev.pendingRewards - 1,
          claimedRewards: prev.claimedRewards + 1
        }))
      }
    } catch (error) {
      console.error('Failed to claim reward:', error)
      analytics.track('error_occurred', {
        error_type: 'reward_claim_failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        component: 'ParticipantDashboard',
        action: 'claim_reward'
      })
    } finally {
      setClaiming(prev => ({ ...prev, [rewardId]: false }))
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please connect your wallet to view your dashboard.</p>
          <Button asChild>
            <Link href="/">Connect Wallet</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const pendingRewards = rewards.filter(r => 'pending' in r.status)
  const claimedRewards = rewards.filter(r => 'claimed' in r.status)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Participant Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {principalText?.slice(0, 8)}...{principalText?.slice(-8)}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Vote className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Votes</p>
                <p className="text-2xl font-bold">{stats.totalVotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Rewards</p>
                <p className="text-2xl font-bold">{stats.pendingRewards}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Claimed Rewards</p>
                <p className="text-2xl font-bold">{stats.claimedRewards}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Value</p>
                <p className="text-2xl font-bold">{stats.totalRewardValue.toFixed(2)} PULSE</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Balance Section */}
      <div className="mb-8">
        <WalletBalance showRefresh={true} />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="voting-history" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="voting-history">Voting History</TabsTrigger>
          <TabsTrigger value="rewards">My Rewards</TabsTrigger>
          <TabsTrigger value="wallet">Wallet Details</TabsTrigger>
        </TabsList>

        {/* Voting History Tab */}
        <TabsContent value="voting-history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Vote className="h-5 w-5 text-blue-500" />
                Polls You've Voted On ({votingHistory.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {votingHistory.length > 0 ? (
                <div className="space-y-4">
                  {votingHistory.map((vote) => (
                    <div key={`${vote.pollId}-${vote.votedAt}`} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{vote.pollTitle}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Your vote: <span className="font-medium">{vote.optionText}</span>
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(vote.votedAt)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={vote.pollStatus === 'active' ? 'default' : 'secondary'}>
                            {vote.pollStatus === 'active' ? 'Active' : 'Closed'}
                          </Badge>
                          {vote.hasReward && (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              <Coins className="h-3 w-3 mr-1" />
                              {vote.rewardAmount} {vote.rewardToken}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Vote className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No votes yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start participating in polls to see your voting history here.
                  </p>
                  <Button asChild>
                    <Link href="/polls">Browse Polls</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards">
          <div className="space-y-6">
            {/* Pending Rewards */}
            {pendingRewards.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Pending Rewards ({pendingRewards.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingRewards.map((reward) => (
                      <div key={reward.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium">{reward.pollTitle}</h3>
                          <p className="text-sm text-muted-foreground">
                            Voted on {formatDate(Number(reward.votedAt) / 1000000)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">
                              {formatTokenAmount(reward.amount, reward.tokenDecimals)} {reward.tokenSymbol}
                            </Badge>
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              Pending
                            </Badge>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleClaimReward(reward.id)}
                          disabled={claiming[reward.id]}
                          className="ml-4"
                        >
                          {claiming[reward.id] ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Claiming...
                            </div>
                          ) : (
                            'Claim Reward'
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Claimed Rewards */}
            {claimedRewards.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Claimed Rewards ({claimedRewards.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {claimedRewards.map((reward) => (
                      <div key={reward.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-900/10">
                        <div className="flex-1">
                          <h3 className="font-medium">{reward.pollTitle}</h3>
                          <p className="text-sm text-muted-foreground">
                            Voted on {formatDate(Number(reward.votedAt) / 1000000)} •
                            Claimed on {reward.claimedAt ? formatDate(Number(reward.claimedAt) / 1000000) : 'Unknown'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">
                              {formatTokenAmount(reward.amount, reward.tokenDecimals)} {reward.tokenSymbol}
                            </Badge>
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              Claimed
                            </Badge>
                          </div>
                        </div>
                        <div className="ml-4 text-green-600">
                          <CheckCircle className="h-6 w-6" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {rewards.length === 0 && (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <Gift className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No rewards yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Participate in polls and surveys to earn token rewards!
                  </p>
                  <Button asChild>
                    <Link href="/polls">Browse Polls</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Wallet Details Tab */}
        <TabsContent value="wallet">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detailed Wallet Balance */}
            <WalletBalance showRefresh={true} />

            {/* Wallet Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-purple-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="w-full">
                  <Link href="/rewards">
                    <Gift className="h-4 w-4 mr-2" />
                    Claim Rewards
                  </Link>
                </Button>

                <Button variant="outline" asChild className="w-full">
                  <Link href="/polls">
                    <Vote className="h-4 w-4 mr-2" />
                    Vote on Polls
                  </Link>
                </Button>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Wallet Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Principal ID:</span>
                      <span className="font-mono text-xs">
                        {principalText?.slice(0, 12)}...{principalText?.slice(-12)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network:</span>
                      <Badge variant="outline">
                        {process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'Local' : 'Mainnet'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Connected via:</span>
                      <Badge variant="secondary">Internet Identity</Badge>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Transaction History</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Recent activity from polls and rewards
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <span>Reward claimed</span>
                      <span className="text-green-600">+5 PULSE</span>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <span>Poll vote</span>
                      <span className="text-blue-600">Voted</span>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                      <span>Reward earned</span>
                      <span className="text-orange-600">+10 PULSE</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}