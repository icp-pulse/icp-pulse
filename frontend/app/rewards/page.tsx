"use client"

import { useEffect, useState } from 'react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { createBackendWithIdentity } from '@/lib/icp'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Coins, Gift, CheckCircle, Clock, AlertCircle } from 'lucide-react'

import type { PendingReward, RewardStatus } from '@/lib/types'

interface DisplayReward {
  id: string
  pollId: string
  pollTitle: string
  amount: bigint
  tokenSymbol: string
  tokenDecimals: number
  tokenCanister?: string
  status: 'pending' | 'claimed' | 'processing'
  claimedAt?: number
  votedAt: number
}

export default function RewardsPage() {
  const { identity, isAuthenticated } = useIcpAuth()
  const [rewards, setRewards] = useState<DisplayReward[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<Record<string, boolean>>({})

  // Load user rewards from backend
  useEffect(() => {
    const loadRewards = async () => {
      if (isAuthenticated && identity) {
        try {
          setLoading(true)
          const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
          const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
          const backend = await createBackendWithIdentity({ canisterId, host, identity })

          const userPrincipal = identity.getPrincipal()
          const backendRewards = await backend.get_user_rewards(userPrincipal)

          // Transform backend rewards to display format
          const displayRewards: DisplayReward[] = backendRewards.map(reward => ({
            id: reward.id,
            pollId: reward.pollId.toString(),
            pollTitle: reward.pollTitle,
            amount: reward.amount,
            tokenSymbol: reward.tokenSymbol,
            tokenDecimals: reward.tokenDecimals,
            tokenCanister: reward.tokenCanister && reward.tokenCanister.length > 0 ? reward.tokenCanister[0]?.toString() : undefined,
            status: 'pending' in reward.status ? 'pending' :
                   'claimed' in reward.status ? 'claimed' : 'processing',
            claimedAt: reward.claimedAt && reward.claimedAt.length > 0 ? Number(reward.claimedAt[0]) / 1000000 : undefined, // Convert nanoseconds to milliseconds
            votedAt: Number(reward.votedAt) / 1000000 // Convert nanoseconds to milliseconds
          }))

          setRewards(displayRewards)
        } catch (error) {
          console.error('Failed to load rewards:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    loadRewards()
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
        setRewards(prev => prev.map(reward =>
          reward.id === rewardId
            ? { ...reward, status: 'claimed' as const, claimedAt: Date.now() }
            : reward
        ))
      } else {
        alert('Failed to claim reward. Please try again.')
      }
    } catch (error) {
      console.error('Failed to claim reward:', error)
      alert('Failed to claim reward. Please try again.')
    } finally {
      setClaiming(prev => ({ ...prev, [rewardId]: false }))
    }
  }

  const pendingRewards = rewards.filter(r => r.status === 'pending')
  const claimedRewards = rewards.filter(r => r.status === 'claimed')
  const totalPendingValue = pendingRewards.reduce((sum, reward) => {
    if (reward.tokenSymbol === 'PULSE') {
      return sum + Number(formatTokenAmount(reward.amount, reward.tokenDecimals))
    }
    return sum
  }, 0)

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
          <p className="text-muted-foreground">Please connect your wallet to view your rewards.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your rewards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <Gift className="h-8 w-8 text-primary" />
          Your Rewards
        </h1>
        <p className="text-muted-foreground">
          Claim tokens earned from participating in polls and surveys
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Rewards</p>
                <p className="text-2xl font-bold">{pendingRewards.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Gift className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pending Value</p>
                <p className="text-2xl font-bold">{totalPendingValue.toFixed(2)} PULSE</p>
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
                <p className="text-2xl font-bold">{claimedRewards.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Rewards */}
      {pendingRewards.length > 0 && (
        <Card className="mb-8">
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
                      Voted on {formatDate(reward.votedAt)}
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
                      Voted on {formatDate(reward.votedAt)} • Claimed on {reward.claimedAt ? formatDate(reward.claimedAt) : 'Unknown'}
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
              <a href="/polls">Browse Polls</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}