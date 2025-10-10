"use client"

import { useEffect, useState } from 'react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { Trophy, X, ArrowRight, Star, Target } from 'lucide-react'
import Link from 'next/link'
import { createActor } from '@/lib/icp'

const AIRDROP_CANISTER_ID = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID || '27ftn-piaaa-aaaao-a4p6a-cai'

interface UserPointsSummary {
  campaignId: bigint
  userPoints: bigint
  totalPoints: bigint
  percentageShare: bigint
  estimatedPulse: bigint
}

interface QuestProgress {
  pollsCreated: bigint
  votescast: bigint
  surveysCreated: bigint
  surveysCompleted: bigint
  rewardsClaimed: bigint
}

interface QuestRequirements {
  minPolls: bigint
  minVotes: bigint
  minSurveys: bigint
  minSubmissions: bigint
  minRewards: bigint
}

interface UserQuestInfo {
  questId: bigint
  campaignId: bigint
  name: string
  description: string
  points: bigint
  requirements: QuestRequirements
  progress: QuestProgress
  completed: boolean
  completedAt: bigint[] | []
  claimed: boolean
  icon: string
  order: bigint
}

export function QuestsBanner() {
  const [showBanner, setShowBanner] = useState(true)
  const { isAuthenticated, principalText, identity } = useIcpAuth()
  const [questStats, setQuestStats] = useState<{
    completed: number
    total: number
    points: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated && principalText && identity) {
      loadQuestStats()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, principalText, identity])

  const loadQuestStats = async () => {
    if (!principalText || !identity) return

    try {
      setLoading(true)
      const canisterId = AIRDROP_CANISTER_ID
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const airdropActor = await createActor({ canisterId, host, idlFactory: (await import('@/lib/staking')).airdropIDL })

      // Fetch user quests for campaign ID 1
      const userQuests = await airdropActor.get_user_quests(principalText, 1n) as UserQuestInfo[]

      // Fetch points summary
      const summary = await airdropActor.get_user_points(principalText, 1n) as UserPointsSummary

      const completedCount = userQuests.filter(q => q.completed).length
      const totalQuests = userQuests.length

      setQuestStats({
        completed: completedCount,
        total: totalQuests,
        points: Number(summary.userPoints),
      })
    } catch (error) {
      console.error('Failed to load quest stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!showBanner) return null
  if (!isAuthenticated) {
    // Show generic banner for non-authenticated users
    return (
      <div className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white pt-16 md:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm md:text-base font-medium">
                  <span className="font-bold">🎯 Complete Quests, Earn PULSE!</span> Join our quest system to earn rewards by engaging with the platform.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/quests">
                <button className="px-4 py-2 text-sm bg-white text-purple-600 hover:bg-gray-100 rounded-lg font-medium whitespace-nowrap transition-colors">
                  View Quests
                </button>
              </Link>
              <button
                onClick={() => setShowBanner(false)}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close banner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    // Show loading state
    return (
      <div className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white pt-16 md:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0">
                <Trophy className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm md:text-base font-medium">Loading your quest progress...</p>
              </div>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show personalized quest stats for authenticated users
  return (
    <div className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white pt-16 md:pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="flex-1">
              {questStats && questStats.total > 0 ? (
                <p className="text-sm md:text-base font-medium">
                  <span className="font-bold">🎯 Quest Progress:</span> {questStats.completed}/{questStats.total} completed
                  {questStats.points > 0 && (
                    <span className="ml-2">
                      • <Star className="w-4 h-4 inline mb-1" /> {questStats.points} points earned
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm md:text-base font-medium">
                  <span className="font-bold">🎯 Start Your Quest Journey!</span> Complete quests to earn PULSE tokens.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/quests">
              <button className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-purple-600 hover:bg-gray-100 rounded-lg font-medium whitespace-nowrap transition-colors">
                {questStats && questStats.completed > 0 ? 'Continue' : 'Start Quests'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <button
              onClick={() => setShowBanner(false)}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
