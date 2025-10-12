"use client"

import { useEffect, useState } from 'react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { Trophy, X, ArrowRight, Star, Sparkles, Rocket, Gift, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { createActor } from '@/lib/icp'

const AIRDROP_CANISTER_ID = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID || '27ftn-piaaa-aaaao-a4p6a-cai'

// Type definitions
interface AirdropCampaign {
  id: bigint
  name: string
  description: string
  totalAmount: bigint
  startTime: bigint
  endTime: bigint
  status: { Pending: null } | { Active: null } | { Completed: null } | { Cancelled: null }
  claimedAmount: bigint
  claimCount: bigint
}

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

interface Announcement {
  id: string
  title: string
  description: string
  ctaText: string
  ctaLink: string
  icon: 'rocket' | 'sparkles' | 'gift' | 'star'
  gradient: string
}

interface BannerSlide {
  type: 'airdrop' | 'quest' | 'announcement'
  data: AirdropCampaign | { quests: UserQuestInfo[]; summary: UserPointsSummary } | Announcement
}

export function CampaignCarouselBanner() {
  const [showBanner, setShowBanner] = useState(true)
  const { isAuthenticated, principalText, identity } = useIcpAuth()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<BannerSlide[]>([])
  const [loading, setLoading] = useState(true)

  // Static announcements
  const announcements: Announcement[] = [
    {
      id: 'ido-sale',
      title: '🚀 PULSE Token IDO - Coming Soon!',
      description: 'Join the decentralized token distribution | Multi-pool vesting | Secure on ICP',
      ctaText: 'Participate Now',
      ctaLink: 'https://ej3ry-6qaaa-aaaai-atlza-cai.icp0.io/',
      icon: 'rocket',
      gradient: 'from-blue-600 via-purple-600 to-pink-600'
    },
    {
      id: 'quest-launch',
      title: '🎯 Quest System - Earn PULSE Tokens!',
      description: 'Complete quests and earn points to claim your share of 50,000 PULSE tokens',
      ctaText: 'Start Quests',
      ctaLink: '/quests',
      icon: 'sparkles',
      gradient: 'from-purple-600 via-indigo-600 to-blue-600'
    },
    {
      id: 'early-adopter',
      title: '💎 Early Adopter Rewards',
      description: 'Join True Pulse now and participate in exclusive airdrop campaigns for early supporters',
      ctaText: 'Learn More',
      ctaLink: '/airdrop',
      icon: 'gift',
      gradient: 'from-green-600 via-teal-600 to-cyan-600'
    },
    {
      id: 'community',
      title: '⭐ Join Our Growing Community',
      description: 'Connect with thousands of users creating polls, surveys, and making decisions on-chain',
      ctaText: 'Get Started',
      ctaLink: '/polls',
      icon: 'star',
      gradient: 'from-orange-600 via-red-600 to-pink-600'
    }
  ]

  useEffect(() => {
    if (isAuthenticated && principalText && identity) {
      loadCampaignData()
    } else {
      // For non-authenticated users, only show announcements
      setSlides(announcements.map(ann => ({ type: 'announcement', data: ann })))
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, principalText, identity])

  // Auto-rotate slides every 5 seconds
  useEffect(() => {
    if (slides.length <= 1) return

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [slides.length])

  const loadCampaignData = async () => {
    if (!principalText || !identity) return

    try {
      setLoading(true)
      const canisterId = AIRDROP_CANISTER_ID
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const airdropActor = await createActor({ canisterId, host, idlFactory: (await import('@/lib/staking')).airdropIDL })

      const slidesData: BannerSlide[] = []

      // Fetch active airdrop campaigns
      try {
        const activeCampaigns = await airdropActor.get_active_campaigns() as AirdropCampaign[]
        activeCampaigns.forEach(campaign => {
          slidesData.push({ type: 'airdrop', data: campaign })
        })
      } catch (error) {
        console.error('Failed to fetch airdrop campaigns:', error)
      }

      // Fetch user quest data for campaign ID 1
      try {
        const userQuests = await airdropActor.get_user_quests(principalText, 1n) as UserQuestInfo[]
        const summary = await airdropActor.get_user_points(principalText, 1n) as UserPointsSummary

        if (userQuests.length > 0) {
          slidesData.push({
            type: 'quest',
            data: { quests: userQuests, summary }
          })
        }
      } catch (error) {
        console.error('Failed to fetch quest data:', error)
      }

      // Add announcements
      announcements.forEach(ann => {
        slidesData.push({ type: 'announcement', data: ann })
      })

      setSlides(slidesData)
    } catch (error) {
      console.error('Failed to load campaign data:', error)
      // Fallback to showing only announcements
      setSlides(announcements.map(ann => ({ type: 'announcement', data: ann })))
    } finally {
      setLoading(false)
    }
  }

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const formatTokenAmount = (amount: bigint): string => {
    try {
      const num = Number(amount) / 100_000_000 // Assuming 8 decimals
      return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
    } catch {
      return '0'
    }
  }

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'rocket': return <Rocket className="w-6 h-6" />
      case 'sparkles': return <Sparkles className="w-6 h-6" />
      case 'gift': return <Gift className="w-6 h-6" />
      case 'star': return <Star className="w-6 h-6" />
      default: return <Trophy className="w-6 h-6" />
    }
  }

  if (!showBanner) return null

  if (loading) {
    return (
      <div className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white pt-16 md:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0">
                <Trophy className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm md:text-base font-medium">Loading campaigns...</p>
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

  if (slides.length === 0) return null

  const currentSlideData = slides[currentSlide]

  return (
    <div className={`relative bg-gradient-to-r ${
      currentSlideData.type === 'announcement'
        ? (currentSlideData.data as Announcement).gradient
        : 'from-purple-600 via-blue-600 to-indigo-600'
    } text-white pt-16 md:pt-20 transition-all duration-500`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left Arrow */}
          {slides.length > 1 && (
            <button
              onClick={handlePrevSlide}
              className="hidden md:flex flex-shrink-0 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Slide Content */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {currentSlideData.type === 'announcement'
                ? getIconComponent((currentSlideData.data as Announcement).icon)
                : currentSlideData.type === 'airdrop'
                ? <Gift className="w-6 h-6" />
                : <Trophy className="w-6 h-6" />
              }
            </div>
            <div className="flex-1 min-w-0">
              {currentSlideData.type === 'announcement' && (
                <div>
                  <p className="text-sm md:text-base font-bold truncate">
                    {(currentSlideData.data as Announcement).title}
                  </p>
                  <p className="text-xs md:text-sm opacity-90 truncate hidden sm:block">
                    {(currentSlideData.data as Announcement).description}
                  </p>
                </div>
              )}

              {currentSlideData.type === 'airdrop' && (
                <div>
                  <p className="text-sm md:text-base font-bold truncate">
                    🎁 Airdrop: {(currentSlideData.data as AirdropCampaign).name}
                  </p>
                  <p className="text-xs md:text-sm opacity-90 truncate hidden sm:block">
                    {formatTokenAmount((currentSlideData.data as AirdropCampaign).totalAmount)} PULSE available • {
                      Number((currentSlideData.data as AirdropCampaign).claimCount)
                    } claimed
                  </p>
                </div>
              )}

              {currentSlideData.type === 'quest' && (
                <div>
                  {(() => {
                    const questData = currentSlideData.data as { quests: UserQuestInfo[]; summary: UserPointsSummary }
                    const completedCount = questData.quests.filter(q => q.completed).length
                    const totalQuests = questData.quests.length
                    const points = Number(questData.summary.userPoints)

                    return (
                      <>
                        <p className="text-sm md:text-base font-bold">
                          🎯 Quest Progress: {completedCount}/{totalQuests} completed
                        </p>
                        {points > 0 && (
                          <p className="text-xs md:text-sm opacity-90 hidden sm:block">
                            <Star className="w-4 h-4 inline mb-1" /> {points} points earned • {
                              formatTokenAmount(questData.summary.estimatedPulse)
                            } PULSE estimated
                          </p>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex items-center gap-3">
            {currentSlideData.type === 'announcement' && (
              <a
                href={(currentSlideData.data as Announcement).ctaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-purple-600 hover:bg-gray-100 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                {(currentSlideData.data as Announcement).ctaText}
                <ArrowRight className="w-4 h-4" />
              </a>
            )}

            {currentSlideData.type === 'airdrop' && (
              <Link href="/airdrop">
                <button className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-purple-600 hover:bg-gray-100 rounded-lg font-medium whitespace-nowrap transition-colors">
                  Claim Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            )}

            {currentSlideData.type === 'quest' && (
              <Link href="/quests">
                <button className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-purple-600 hover:bg-gray-100 rounded-lg font-medium whitespace-nowrap transition-colors">
                  View Quests
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowBanner(false)}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Right Arrow */}
          {slides.length > 1 && (
            <button
              onClick={handleNextSlide}
              className="hidden md:flex flex-shrink-0 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Slide Indicators */}
        {slides.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide ? 'bg-white w-6' : 'bg-white/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
