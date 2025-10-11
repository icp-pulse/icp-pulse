"use client"

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createActor } from '@/lib/icp'
import { airdropIDL } from '@/lib/staking'
import {
  Gift,
  Plus,
  Calendar,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  Play,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

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

interface Allocation {
  user: string
  amount: bigint
  claimed: boolean
  reason: string
}

export default function AirdropAdmin() {
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<bigint | null>(null)
  const [showAllocations, setShowAllocations] = useState<bigint | null>(null)
  const [showManualAlloc, setShowManualAlloc] = useState<bigint | null>(null)

  // Form states
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    totalAmount: '',
    durationDays: '90'
  })

  const [manualAlloc, setManualAlloc] = useState({
    principal: '',
    amount: '',
    reason: ''
  })

  // Fetch all campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['allCampaigns'],
    queryFn: async () => {
      const canisterId = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createActor({ canisterId, host, idlFactory: airdropIDL })
      return await backend.get_all_campaigns() as Campaign[]
    },
    staleTime: 10000,
  })

  // Fetch campaign allocations
  const { data: allocations } = useQuery({
    queryKey: ['campaignAllocations', showAllocations?.toString()],
    queryFn: async () => {
      if (!showAllocations) return []
      const canisterId = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createActor({ canisterId, host, idlFactory: airdropIDL })
      const result = await backend.get_campaign(showAllocations)
      if (result[0]) {
        // Extract allocations from campaign data - you may need to adjust based on your actual data structure
        return [] as Allocation[] // Placeholder
      }
      return []
    },
    enabled: !!showAllocations,
    staleTime: 10000,
  })

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof newCampaign) => {
      const canisterId = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createActor({ canisterId, host, idlFactory: airdropIDL })

      // Convert amount to smallest unit (8 decimals)
      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(data.totalAmount) * 100_000_000))
      const duration = BigInt(data.durationDays)

      const result = await backend.create_campaign(
        data.name,
        data.description,
        amountInSmallestUnit,
        duration
      )

      if ('err' in result) {
        throw new Error(result.err)
      }
      return result.ok
    },
    onSuccess: (campaignId) => {
      toast({
        title: "Campaign created successfully!",
        description: `Campaign ID: ${campaignId}`,
      })
      setShowCreateForm(false)
      setNewCampaign({ name: '', description: '', totalAmount: '', durationDays: '90' })
      queryClient.invalidateQueries({ queryKey: ['allCampaigns'] })
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create campaign",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Start campaign mutation
  const startCampaignMutation = useMutation({
    mutationFn: async (campaignId: bigint) => {
      const canisterId = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createActor({ canisterId, host, idlFactory: airdropIDL })
      const result = await backend.start_campaign(campaignId)
      if ('err' in result) {
        throw new Error(result.err)
      }
      return result.ok
    },
    onSuccess: () => {
      toast({
        title: "Campaign started successfully!",
        description: "Users can now claim their allocations",
      })
      queryClient.invalidateQueries({ queryKey: ['allCampaigns'] })
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start campaign",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Add manual allocation mutation
  const addAllocationMutation = useMutation({
    mutationFn: async ({ campaignId, data }: { campaignId: bigint, data: typeof manualAlloc }) => {
      const canisterId = process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createActor({ canisterId, host, idlFactory: airdropIDL })

      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(data.amount) * 100_000_000))

      const result = await backend.add_allocation(
        campaignId,
        data.principal,
        amountInSmallestUnit,
        data.reason
      )

      if ('err' in result) {
        throw new Error(result.err)
      }
      return result.ok
    },
    onSuccess: () => {
      toast({
        title: "Allocation added successfully!",
        description: "User can now claim their airdrop",
      })
      setManualAlloc({ principal: '', amount: '', reason: '' })
      setShowManualAlloc(null)
      queryClient.invalidateQueries({ queryKey: ['allCampaigns'] })
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add allocation",
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
    if (!timestamp || timestamp === 0n) return 'N/A'
    try {
      const ms = Number(timestamp / 1_000_000n)
      return new Date(ms).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch (e) {
      return 'Invalid Date'
    }
  }

  const getStatusInfo = (status: Campaign['status']) => {
    if ('Pending' in status) {
      return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock }
    }
    if ('Active' in status) {
      return { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: Play }
    }
    return { label: 'Completed', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', icon: CheckCircle }
  }

  const pendingCampaigns = campaigns?.filter(c => 'Pending' in c.status) || []
  const activeCampaigns = campaigns?.filter(c => 'Active' in c.status) || []
  const completedCampaigns = campaigns?.filter(c => 'Completed' in c.status) || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Gift className="w-8 h-8 text-purple-600" />
              Airdrop Campaign Manager
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create and manage PULSE token airdrop campaigns
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Campaigns</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {campaigns?.length || 0}
              </p>
            </div>
            <Gift className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {activeCampaigns.length}
              </p>
            </div>
            <Play className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {pendingCampaigns.length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Allocated</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {campaigns ? formatTokenAmount(campaigns.reduce((sum, c) => sum + (c.allocatedAmount ? BigInt(c.allocatedAmount) : 0n), 0n)) : '0'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PULSE</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Create Campaign Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border-2 border-purple-200 dark:border-purple-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Campaign</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                placeholder="e.g., Early Adopter Rewards Q1 2025"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration (Days)
              </label>
              <input
                type="number"
                value={newCampaign.durationDays}
                onChange={(e) => setNewCampaign({ ...newCampaign, durationDays: e.target.value })}
                placeholder="90"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Cannot be changed after creation
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={newCampaign.description}
                onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                placeholder="Thank you for being an early supporter of ICP Pulse!"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Pool (PULSE)
              </label>
              <input
                type="number"
                value={newCampaign.totalAmount}
                onChange={(e) => setNewCampaign({ ...newCampaign, totalAmount: e.target.value })}
                placeholder="500000"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Amount in PULSE tokens
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => createCampaignMutation.mutate(newCampaign)}
              disabled={createCampaignMutation.isPending || !newCampaign.name || !newCampaign.totalAmount}
              className="inline-flex items-center px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createCampaignMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </>
              )}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="space-y-6">
          {/* Active Campaigns */}
          {activeCampaigns.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-green-600" />
                Active Campaigns ({activeCampaigns.length})
              </h2>
              <div className="space-y-4">
                {activeCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id.toString()}
                    campaign={campaign}
                    formatTokenAmount={formatTokenAmount}
                    formatDate={formatDate}
                    getStatusInfo={getStatusInfo}
                    showManualAlloc={showManualAlloc}
                    setShowManualAlloc={setShowManualAlloc}
                    manualAlloc={manualAlloc}
                    setManualAlloc={setManualAlloc}
                    addAllocationMutation={addAllocationMutation}
                    showAllocations={showAllocations}
                    setShowAllocations={setShowAllocations}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending Campaigns */}
          {pendingCampaigns.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                Pending Campaigns ({pendingCampaigns.length})
              </h2>
              <div className="space-y-4">
                {pendingCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id.toString()}
                    campaign={campaign}
                    formatTokenAmount={formatTokenAmount}
                    formatDate={formatDate}
                    getStatusInfo={getStatusInfo}
                    onStart={() => startCampaignMutation.mutate(campaign.id)}
                    isStarting={startCampaignMutation.isPending}
                    showManualAlloc={showManualAlloc}
                    setShowManualAlloc={setShowManualAlloc}
                    manualAlloc={manualAlloc}
                    setManualAlloc={setManualAlloc}
                    addAllocationMutation={addAllocationMutation}
                    showAllocations={showAllocations}
                    setShowAllocations={setShowAllocations}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Campaigns */}
          {completedCampaigns.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-gray-600" />
                Completed Campaigns ({completedCampaigns.length})
              </h2>
              <div className="space-y-4">
                {completedCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id.toString()}
                    campaign={campaign}
                    formatTokenAmount={formatTokenAmount}
                    formatDate={formatDate}
                    getStatusInfo={getStatusInfo}
                    showManualAlloc={showManualAlloc}
                    setShowManualAlloc={setShowManualAlloc}
                    manualAlloc={manualAlloc}
                    setManualAlloc={setManualAlloc}
                    addAllocationMutation={addAllocationMutation}
                    showAllocations={showAllocations}
                    setShowAllocations={setShowAllocations}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
          <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Campaigns Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Create your first airdrop campaign to get started.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Campaign
          </button>
        </div>
      )}
    </div>
  )
}

// Campaign Card Component
interface CampaignCardProps {
  campaign: Campaign
  formatTokenAmount: (amount: bigint) => string
  formatDate: (timestamp: bigint) => string
  getStatusInfo: (status: Campaign['status']) => { label: string; color: string; icon: any }
  onStart?: () => void
  isStarting?: boolean
  showManualAlloc: bigint | null
  setShowManualAlloc: (id: bigint | null) => void
  manualAlloc: { principal: string; amount: string; reason: string }
  setManualAlloc: (data: { principal: string; amount: string; reason: string }) => void
  addAllocationMutation: any
  showAllocations: bigint | null
  setShowAllocations: (id: bigint | null) => void
}

function CampaignCard({
  campaign,
  formatTokenAmount,
  formatDate,
  getStatusInfo,
  onStart,
  isStarting,
  showManualAlloc,
  setShowManualAlloc,
  manualAlloc,
  setManualAlloc,
  addAllocationMutation,
  showAllocations,
  setShowAllocations,
}: CampaignCardProps) {
  const statusInfo = getStatusInfo(campaign.status)
  const StatusIcon = statusInfo.icon
  const allocatedAmount = campaign.allocatedAmount ? BigInt(campaign.allocatedAmount) : 0n
  const claimedAmount = campaign.claimedAmount ? BigInt(campaign.claimedAmount) : 0n
  const allocations = campaign.allocations ? BigInt(campaign.allocations) : 0n
  const createdAt = campaign.createdAt ? BigInt(campaign.createdAt) : 0n
  const endTime = campaign.endTime ? BigInt(campaign.endTime) : 0n
  const allocationPercentage = campaign.totalAmount > 0n
    ? Number((allocatedAmount * 100n) / campaign.totalAmount)
    : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {campaign.name}
            </h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            {campaign.description}
          </p>
        </div>
        <div className="text-right ml-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Campaign ID</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">#{campaign.id.toString()}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Pool</p>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {formatTokenAmount(campaign.totalAmount)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">PULSE</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Allocated</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatTokenAmount(allocatedAmount)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{allocationPercentage}%</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Claimed</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatTokenAmount(claimedAmount)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">PULSE</p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Participants</p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {allocations.toString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">users</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Allocation Progress</span>
          <span>{allocationPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${allocationPercentage}%` }}
          />
        </div>
      </div>

      {/* Dates */}
      {(createdAt > 0n || (campaign.startTime && campaign.startTime[0]) || endTime > 0n) && (
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
          {createdAt > 0n && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Created: {formatDate(createdAt)}</span>
            </div>
          )}
          {campaign.startTime && campaign.startTime[0] && (
            <div className="flex items-center gap-1">
              <Play className="w-4 h-4" />
              <span>Started: {formatDate(campaign.startTime[0])}</span>
            </div>
          )}
          {endTime > 0n && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Ends: {formatDate(endTime)}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onStart && (
          <button
            onClick={onStart}
            disabled={isStarting}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Campaign
              </>
            )}
          </button>
        )}

        <button
          onClick={() => setShowManualAlloc(showManualAlloc === campaign.id ? null : campaign.id)}
          className="inline-flex items-center px-4 py-2 border border-purple-600 text-purple-600 dark:text-purple-400 font-medium rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Allocation
        </button>

        <button
          onClick={() => setShowAllocations(showAllocations === campaign.id ? null : campaign.id)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Users className="w-4 h-4 mr-2" />
          View Allocations
          {showAllocations === campaign.id ? (
            <ChevronUp className="w-4 h-4 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-1" />
          )}
        </button>
      </div>

      {/* Manual Allocation Form */}
      {showManualAlloc === campaign.id && (
        <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Add Manual Allocation</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Principal ID
              </label>
              <input
                type="text"
                value={manualAlloc.principal}
                onChange={(e) => setManualAlloc({ ...manualAlloc, principal: e.target.value })}
                placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (PULSE)
                </label>
                <input
                  type="number"
                  value={manualAlloc.amount}
                  onChange={(e) => setManualAlloc({ ...manualAlloc, amount: e.target.value })}
                  placeholder="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={manualAlloc.reason}
                  onChange={(e) => setManualAlloc({ ...manualAlloc, reason: e.target.value })}
                  placeholder="Early adopter"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => addAllocationMutation.mutate({ campaignId: campaign.id, data: manualAlloc })}
                disabled={addAllocationMutation.isPending || !manualAlloc.principal || !manualAlloc.amount}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {addAllocationMutation.isPending ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => setShowManualAlloc(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allocations List */}
      {showAllocations === campaign.id && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Allocations ({allocations.toString()})
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Use the CLI command to view detailed allocations:
          </p>
          <code className="block mt-2 p-2 bg-gray-800 text-green-400 rounded text-xs overflow-x-auto">
            dfx canister call airdrop get_campaign &apos;({campaign.id.toString()} : nat)&apos; --network ic --query
          </code>
        </div>
      )}
    </div>
  )
}
