"use client"

import { useEffect, useState } from 'react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { Trophy, Star, CheckCircle, Lock, TrendingUp, Gift, Zap } from 'lucide-react'
import { Actor, HttpAgent } from '@dfinity/agent'
import { idlFactory as airdropIdlFactory } from '@/../../src/declarations/airdrop/airdrop.did.js'

const AIRDROP_CANISTER_ID = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID || '27ftn-piaaa-aaaao-a4p6a-cai'

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

interface UserPointsSummary {
  campaignId: bigint
  userPoints: bigint
  totalPoints: bigint
  percentageShare: bigint
  estimatedPulse: bigint
}

export default function QuestsPage() {
  const { identity, isAuthenticated, principal } = useIcpAuth()
  const [quests, setQuests] = useState<UserQuestInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [pointsSummary, setPointsSummary] = useState<UserPointsSummary | null>(null)
  const [hasClaimed, setHasClaimed] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    if (isAuthenticated && principal) {
      loadQuests()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, principal])

  const loadQuests = async () => {
    if (!principal || !identity) return

    try {
      setLoading(true)
      const agent = new HttpAgent({
        host: process.env.NEXT_PUBLIC_IC_HOST || 'https://icp-api.io',
        identity,
      })

      if (process.env.NODE_ENV !== 'production') {
        await agent.fetchRootKey()
      }

      const airdropActor = Actor.createActor(airdropIdlFactory, {
        agent,
        canisterId: AIRDROP_CANISTER_ID,
      })

      // Fetch user quests for campaign ID 1 (default quest campaign)
      const userQuests = await airdropActor.get_user_quests(principal, 1n) as UserQuestInfo[]

      // Sort by order
      userQuests.sort((a, b) => Number(a.order) - Number(b.order))

      setQuests(userQuests)

      // Fetch points summary
      const summary = await airdropActor.get_user_points(principal, 1n) as UserPointsSummary
      setPointsSummary(summary)

      // Check if already claimed
      const claimed = await airdropActor.has_claimed_quest_rewards(principal, 1n) as boolean
      setHasClaimed(claimed)

      // Calculate completed count
      const completed = userQuests.filter(q => q.completed).length
      setCompletedCount(completed)
    } catch (error) {
      console.error('Failed to load quests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClaimRewards = async () => {
    if (!principal || !identity || claiming || hasClaimed) return

    try {
      setClaiming(true)
      const agent = new HttpAgent({
        host: process.env.NEXT_PUBLIC_IC_HOST || 'https://icp-api.io',
        identity,
      })

      if (process.env.NODE_ENV !== 'production') {
        await agent.fetchRootKey()
      }

      const airdropActor = Actor.createActor(airdropIdlFactory, {
        agent,
        canisterId: AIRDROP_CANISTER_ID,
      })

      const result = await airdropActor.claim_quest_rewards(1n)

      if ('ok' in result) {
        const amount = result.ok as bigint
        alert(`Successfully claimed ${(Number(amount) / 1e8).toFixed(2)} PULSE!`)
        setHasClaimed(true)
        // Reload quests to update UI
        await loadQuests()
      } else {
        alert(`Failed to claim rewards: ${result.err}`)
      }
    } catch (error) {
      console.error('Failed to claim rewards:', error)
      alert('Failed to claim rewards. Please try again.')
    } finally {
      setClaiming(false)
    }
  }

  const getQuestIcon = (icon: string) => {
    switch (icon) {
      case 'trophy':
        return <Trophy className="w-6 h-6" />
      case 'star':
        return <Star className="w-6 h-6" />
      case 'gift':
        return <Gift className="w-6 h-6" />
      case 'zap':
        return <Zap className="w-6 h-6" />
      case 'trending':
        return <TrendingUp className="w-6 h-6" />
      default:
        return <CheckCircle className="w-6 h-6" />
    }
  }

  const calculateProgress = (quest: UserQuestInfo): number => {
    const progress = quest.progress
    const requirements = quest.requirements

    // Calculate progress percentage based on the most relevant requirement
    let totalRequired = 0
    let totalCompleted = 0

    if (requirements.minPolls > 0n) {
      totalRequired += Number(requirements.minPolls)
      totalCompleted += Math.min(Number(progress.pollsCreated), Number(requirements.minPolls))
    }
    if (requirements.minVotes > 0n) {
      totalRequired += Number(requirements.minVotes)
      totalCompleted += Math.min(Number(progress.votescast), Number(requirements.minVotes))
    }
    if (requirements.minSurveys > 0n) {
      totalRequired += Number(requirements.minSurveys)
      totalCompleted += Math.min(Number(progress.surveysCreated), Number(requirements.minSurveys))
    }
    if (requirements.minSubmissions > 0n) {
      totalRequired += Number(requirements.minSubmissions)
      totalCompleted += Math.min(Number(progress.surveysCompleted), Number(requirements.minSubmissions))
    }
    if (requirements.minRewards > 0n) {
      totalRequired += Number(requirements.minRewards)
      totalCompleted += Math.min(Number(progress.rewardsClaimed), Number(requirements.minRewards))
    }

    return totalRequired > 0 ? (totalCompleted / totalRequired) * 100 : 0
  }

  const getProgressText = (quest: UserQuestInfo): string => {
    const progress = quest.progress
    const requirements = quest.requirements

    const parts: string[] = []

    if (requirements.minPolls > 0n) {
      parts.push(`${progress.pollsCreated}/${requirements.minPolls} polls`)
    }
    if (requirements.minVotes > 0n) {
      parts.push(`${progress.votescast}/${requirements.minVotes} votes`)
    }
    if (requirements.minSurveys > 0n) {
      parts.push(`${progress.surveysCreated}/${requirements.minSurveys} surveys`)
    }
    if (requirements.minSubmissions > 0n) {
      parts.push(`${progress.surveysCompleted}/${requirements.minSubmissions} submissions`)
    }
    if (requirements.minRewards > 0n) {
      parts.push(`${progress.rewardsClaimed}/${requirements.minRewards} rewards`)
    }

    return parts.join(' · ')
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center">
          <Lock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to view and complete quests.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading quests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Quest Board
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Complete quests to earn PULSE tokens and explore the platform
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed Quests</p>
              <p className="text-2xl font-bold">{completedCount}/{quests.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Star className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your Points</p>
              <p className="text-2xl font-bold">{pointsSummary ? Number(pointsSummary.userPoints) : 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your Share</p>
              <p className="text-2xl font-bold">
                {pointsSummary ? (Number(pointsSummary.percentageShare) / 100).toFixed(2) : 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Gift className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Est. Rewards</p>
              <p className="text-2xl font-bold">
                {pointsSummary ? (Number(pointsSummary.estimatedPulse) / 1e8).toFixed(2) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Claim Rewards Section */}
      {pointsSummary && Number(pointsSummary.userPoints) > 0 && (
        <div className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 border-2 border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">Ready to Claim Your Rewards?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                You've earned <span className="font-bold text-purple-600">{Number(pointsSummary.userPoints)} points</span> and can claim{' '}
                <span className="font-bold text-purple-600">{(Number(pointsSummary.estimatedPulse) / 1e8).toFixed(2)} PULSE</span>
                {' '}({(Number(pointsSummary.percentageShare) / 100).toFixed(2)}% of the pool)
              </p>
              {!hasClaimed && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  💡 Your share may change as more users complete quests. Claim now to lock in your current amount!
                </p>
              )}
            </div>
            <div className="ml-4">
              {hasClaimed ? (
                <div className="px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-medium">
                  ✓ Claimed
                </div>
              ) : (
                <button
                  onClick={handleClaimRewards}
                  disabled={claiming}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {claiming ? 'Claiming...' : 'Claim Rewards'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quest List */}
      <div className="space-y-4">
        {quests.map((quest) => {
          const progress = calculateProgress(quest)
          const isCompleted = quest.completed
          const isClaimed = quest.claimed

          return (
            <div
              key={Number(quest.questId)}
              className={`
                bg-white dark:bg-gray-800 rounded-lg p-6 border-2 transition-all
                ${isCompleted
                  ? 'border-green-500 dark:border-green-500'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`
                    p-4 rounded-lg flex-shrink-0
                    ${isCompleted
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                    }
                  `}
                >
                  {isCompleted ? <CheckCircle className="w-6 h-6" /> : getQuestIcon(quest.icon)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{quest.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{quest.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-purple-600">
                        +{Number(quest.points)} points
                      </div>
                      {isCompleted && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          ✓ Completed
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {!isCompleted && (
                    <>
                      <div className="mb-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {getProgressText(quest)}
                      </p>
                    </>
                  )}

                  {isCompleted && quest.completedAt.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Completed: {new Date(Number(quest.completedAt[0]) / 1000000).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {quests.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">No Quests Available</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Check back later for new quests and rewards!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
