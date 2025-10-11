"use client"

import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createActor } from '@/lib/icp'
import { Gift, TrendingUp, Calendar, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'

interface Airdrop {
  campaignId: bigint
  campaignName: string
  campaignDescription: string
  amount: bigint
  claimed: boolean
  claimedAt: [] | [bigint]
  reason: string
}

interface UserActivity {
  user: string
  voteCount: bigint
  surveyCount: bigint
  pollsCreated: bigint
  surveysCreated: bigint
  totalScore: bigint
  firstActivity: [] | [bigint]
}

interface Campaign {
  id: bigint
  name: string
  description: string
  totalAmount: bigint
  allocatedAmount: bigint
  claimedAmount: bigint
  status: { Pending: null } | { Active: null } | { Completed: null }
  startTime: [] | [bigint]
  endTime: bigint
  createdAt: bigint
  allocations: bigint
}

export default function AirdropPage() {
  const { isAuthenticated, principalText } = useIcpAuth()
  const queryClient = useQueryClient()

  // Fetch user's airdrops
  const { data: airdrops, isLoading: airdropsLoading } = useQuery({
    queryKey: ['userAirdrops', principalText],
    queryFn: async () => {
      if (!principalText) return []
      const canisterId = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createActor({ canisterId, host, idlFactory: (await import('@/lib/staking')).airdropIDL })
      const result = await backend.get_user_airdrops(principalText)
      if ('ok' in result) {
        return result.ok as Airdrop[]
      }
      return []
    },
    enabled: isAuthenticated && !!principalText,
    staleTime: 10000,
  })

  // Fetch user activity
  const { data: activity } = useQuery({
    queryKey: ['userActivity', principalText],
    queryFn: async () => {
      if (!principalText) return null
      const canisterId = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createActor({ canisterId, host, idlFactory: (await import('@/lib/staking')).airdropIDL })
      const result = await backend.get_user_activity(
        [1n, 2n, 3n], // Poll IDs
        [1n, 2n],     // Survey IDs
        principalText
      )
      if ('ok' in result) {
        return result.ok as UserActivity
      }
      return null
    },
    enabled: isAuthenticated && !!principalText,
    staleTime: 30000,
  })

  // Fetch active campaigns
  const { data: campaigns } = useQuery({
    queryKey: ['activeCampaigns'],
    queryFn: async () => {
      const canisterId = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createActor({ canisterId, host, idlFactory: (await import('@/lib/staking')).airdropIDL })
      const result = await backend.get_active_campaigns()
      return result as Campaign[]
    },
    staleTime: 60000,
  })

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async (campaignId: bigint) => {
      const canisterId = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createActor({ canisterId, host, idlFactory: (await import('@/lib/staking')).airdropIDL })
      const result = await backend.claim_airdrop(campaignId)
      if ('err' in result) {
        throw new Error(result.err)
      }
      return result.ok
    },
    onSuccess: (_, campaignId) => {
      toast({
        title: "Airdrop claimed successfully!",
        description: "Tokens have been transferred to your wallet",
      })
      queryClient.invalidateQueries({ queryKey: ['userAirdrops'] })
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to claim airdrop",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const formatTokenAmount = (amount: bigint) => {
    const DECIMALS = 8
    const divisor = BigInt(10 ** DECIMALS)
    const tokens = amount / divisor
    const remainder = amount % divisor
    if (remainder === 0n) {
      return tokens.toString()
    }
    const decimal = remainder.toString().padStart(DECIMALS, '0').replace(/0+$/, '')
    return `${tokens}.${decimal}`
  }

  const formatDate = (timestamp: bigint) => {
    const ms = Number(timestamp / 1_000_000n)
    return new Date(ms).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTierForScore = (score: bigint) => {
    if (score >= 100n) return { name: 'Platinum', color: 'from-purple-500 to-purple-700', textColor: 'text-purple-700' }
    if (score >= 50n) return { name: 'Gold', color: 'from-yellow-400 to-yellow-600', textColor: 'text-yellow-700' }
    if (score >= 20n) return { name: 'Silver', color: 'from-gray-300 to-gray-500', textColor: 'text-gray-700' }
    if (score >= 5n) return { name: 'Bronze', color: 'from-orange-400 to-orange-600', textColor: 'text-orange-700' }
    return { name: 'New User', color: 'from-slate-300 to-slate-500', textColor: 'text-slate-700' }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Connect to View Airdrops
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please connect your wallet to view and claim your PULSE token airdrops.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  const totalUnclaimed = airdrops ? airdrops.reduce((sum, a) => !a.claimed ? sum + a.amount : sum, 0n) : 0n
  const totalClaimed = airdrops ? airdrops.reduce((sum, a) => a.claimed ? sum + a.amount : sum, 0n) : 0n
  const unclaimedCount = airdrops?.filter(a => !a.claimed).length || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            PULSE Token Airdrops
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Claim your rewards for being an early adopter and active participant in the ICP Pulse community.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available to Claim</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatTokenAmount(totalUnclaimed)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">PULSE tokens</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Gift className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Claimed</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatTokenAmount(totalClaimed)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">PULSE tokens</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {activity && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Engagement Score</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {activity.totalScore.toString()}
                  </p>
                  <p className={`text-sm font-semibold mt-1 ${getTierForScore(activity.totalScore).textColor}`}>
                    {getTierForScore(activity.totalScore).name} Tier
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activity Breakdown */}
        {activity && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Activity</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {activity.voteCount.toString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Votes Cast</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {activity.surveyCount.toString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Surveys Completed</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {activity.pollsCreated.toString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Polls Created</p>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {activity.surveysCreated.toString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Surveys Created</p>
              </div>
            </div>
          </div>
        )}

        {/* Airdrops List */}
        {airdropsLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : airdrops && airdrops.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Your Airdrops {unclaimedCount > 0 && (
                <span className="text-purple-600 dark:text-purple-400">({unclaimedCount} pending)</span>
              )}
            </h2>
            {airdrops.map((airdrop, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-2 transition-all ${
                  airdrop.claimed
                    ? 'border-green-200 dark:border-green-800'
                    : 'border-purple-200 dark:border-purple-800 hover:shadow-lg'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {airdrop.campaignName}
                      </h3>
                      {airdrop.claimed ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Claimed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                          <Gift className="w-3 h-3 mr-1" />
                          Available
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      {airdrop.campaignDescription}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Gift className="w-4 h-4" />
                        <span>Amount: <span className="font-semibold text-gray-900 dark:text-white">
                          {formatTokenAmount(airdrop.amount)} PULSE
                        </span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Reason: {airdrop.reason}</span>
                      </div>
                      {airdrop.claimed && airdrop.claimedAt[0] && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          <span>Claimed: {formatDate(airdrop.claimedAt[0])}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    {!airdrop.claimed ? (
                      <button
                        onClick={() => claimMutation.mutate(airdrop.campaignId)}
                        disabled={claimMutation.isPending}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {claimMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Claiming...
                          </>
                        ) : (
                          <>
                            <Gift className="w-4 h-4 mr-2" />
                            Claim Now
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="text-right">
                        <div className="inline-flex items-center px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold rounded-lg">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Claimed
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Airdrops Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
              You don&apos;t have any airdrops at the moment. Stay active in the community to be eligible for future campaigns!
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {/* Active Campaigns Info */}
        {campaigns && campaigns.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              Active Campaigns
            </h3>
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div key={campaign.id.toString()} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{campaign.name}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                      {formatTokenAmount(campaign.allocatedAmount)} / {formatTokenAmount(campaign.totalAmount)} allocated
                      {' • '}
                      {campaign.allocations.toString()} participants
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Ends: {formatDate(campaign.endTime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
