"use client"

import { useState, useEffect } from 'react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { Trophy, Plus, Edit, Trash2, CheckCircle, Clock, Users, Star, AlertCircle } from 'lucide-react'
import { createActor } from '@/lib/icp'
import { useRouter } from 'next/navigation'
import { useIsAdmin } from '@/components/AdminGuard'

const AIRDROP_CANISTER_ID = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID || '27ftn-piaaa-aaaao-a4p6a-cai'

interface Quest {
  id: bigint
  campaignId: bigint
  name: string
  description: string
  points: bigint
  icon: string
  order: bigint
  isActive: boolean
}

interface Campaign {
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

export default function QuestAdmin() {
  const router = useRouter()
  const { isAuthenticated, principalText } = useIcpAuth()
  const isAdmin = useIsAdmin()
  const [quests, setQuests] = useState<Quest[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<bigint>(1n)

  useEffect(() => {
    console.log('Quest Admin useEffect - Auth Status:', {
      isAuthenticated,
      isAdmin,
      hasPrincipalText: !!principalText
    })

    if (!isAuthenticated) {
      console.log('Redirecting - not authenticated')
      setLoading(false)
      router.push('/admin')
      return
    }

    if (!isAdmin) {
      console.log('Redirecting - not admin')
      setLoading(false)
      router.push('/admin')
      return
    }

    // Only check principalText, not identity object
    if (principalText) {
      console.log('Loading data for principal:', principalText)
      loadData()
    } else {
      console.log('Waiting for principalText to be available...')
      setLoading(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAdmin, principalText])

  const loadData = async () => {
    console.log('loadData() called')
    if (!principalText) {
      console.log('No principalText available, aborting load')
      setLoading(false)
      return
    }
    console.log('Starting data load for principal:', principalText)

    try {
      setLoading(true)
      const canisterId = AIRDROP_CANISTER_ID
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const airdropActor = await createActor({ canisterId, host, idlFactory: (await import('@/lib/staking')).airdropIDL })

      console.log('Fetching campaigns...')
      // Fetch all campaigns
      const allCampaigns = await airdropActor.get_all_campaigns() as Campaign[]
      console.log('Campaigns loaded:', allCampaigns)
      setCampaigns(allCampaigns)

      // If no campaigns exist, just finish loading
      if (allCampaigns.length === 0) {
        console.log('No campaigns found')
        setLoading(false)
        return
      }

      // Set selected campaign to first campaign if current selection doesn't exist
      const campaignExists = allCampaigns.some(c => c.id === selectedCampaign)
      if (!campaignExists && allCampaigns.length > 0) {
        console.log('Selected campaign not found, using first campaign')
        setSelectedCampaign(allCampaigns[0].id)
      }

      // Fetch quests for selected campaign
      const campaignToLoad = campaignExists ? selectedCampaign : allCampaigns[0].id
      console.log('Fetching quests for campaign:', campaignToLoad)
      const campaignQuests = await airdropActor.get_campaign_quests(campaignToLoad) as Quest[]
      console.log('Quests loaded:', campaignQuests)
      setQuests(campaignQuests)
    } catch (error) {
      console.error('Failed to load quests:', error)
      alert(`Error loading quests: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedCampaign && isAuthenticated && principalText) {
      console.log('Campaign changed, reloading data for campaign:', selectedCampaign)
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaign])

  const handleDeactivateQuest = async (questId: bigint) => {
    if (!principalText) return
    if (!confirm('Are you sure you want to deactivate this quest?')) return

    try {
      const canisterId = AIRDROP_CANISTER_ID
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const airdropActor = await createActor({ canisterId, host, idlFactory: (await import('@/lib/staking')).airdropIDL })

      const result = await airdropActor.deactivate_quest(questId)
      if ('ok' in result) {
        alert('Quest deactivated successfully')
        loadData()
      } else {
        alert(`Failed to deactivate quest: ${result.err}`)
      }
    } catch (error) {
      console.error('Failed to deactivate quest:', error)
      alert('Failed to deactivate quest')
    }
  }

  const getCampaignStatus = (status: Campaign['status']) => {
    if ('Active' in status) return 'Active'
    if ('Pending' in status) return 'Pending'
    if ('Completed' in status) return 'Completed'
    if ('Cancelled' in status) return 'Cancelled'
    return 'Unknown'
  }

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
      day: 'numeric'
    })
  }

  const getQuestIcon = (icon: string) => {
    switch (icon) {
      case 'trophy':
        return <Trophy className="w-5 h-5" />
      case 'star':
        return <Star className="w-5 h-5" />
      case 'clock':
        return <Clock className="w-5 h-5" />
      case 'users':
        return <Users className="w-5 h-5" />
      default:
        return <CheckCircle className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading quests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Quest Administration
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage quests and campaigns for the PULSE rewards system
            </p>
          </div>
          <button
            onClick={() => alert('Create quest functionality coming soon')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Quest
          </button>
        </div>
      </div>

      {/* Campaign Selector */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Campaign
        </label>
        <select
          value={selectedCampaign.toString()}
          onChange={(e) => setSelectedCampaign(BigInt(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          {campaigns.map((campaign) => (
            <option key={campaign.id.toString()} value={campaign.id.toString()}>
              {campaign.name} - {getCampaignStatus(campaign.status)} ({formatTokenAmount(campaign.totalAmount)} PULSE)
            </option>
          ))}
        </select>
      </div>

      {/* Campaign Info */}
      {campaigns.find(c => c.id === selectedCampaign) && (
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Pool</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatTokenAmount(campaigns.find(c => c.id === selectedCampaign)!.totalAmount)} PULSE
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Claimed</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatTokenAmount(campaigns.find(c => c.id === selectedCampaign)!.claimedAmount)} PULSE
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {campaigns.find(c => c.id === selectedCampaign)!.claimCount.toString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">End Date</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatDate(campaigns.find(c => c.id === selectedCampaign)!.endTime)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quests List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Campaign Quests ({quests.length})
          </h2>
        </div>

        {quests.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Quests Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first quest to start rewarding users
            </p>
            <button
              onClick={() => alert('Create quest functionality coming soon')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Create First Quest
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {quests.map((quest) => (
              <div
                key={quest.id.toString()}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${
                      quest.isActive
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                    }`}>
                      {getQuestIcon(quest.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {quest.name}
                        </h3>
                        {quest.isActive ? (
                          <span className="px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {quest.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {quest.points.toString()} points
                          </span>
                        </div>
                        <div className="text-gray-500 dark:text-gray-500">
                          Order: #{quest.order.toString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert('Edit quest functionality coming soon')}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit quest"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {quest.isActive && (
                      <button
                        onClick={() => handleDeactivateQuest(quest.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Deactivate quest"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
