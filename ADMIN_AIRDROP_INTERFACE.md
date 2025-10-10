# Admin Airdrop Interface Guide

## Overview

Admin interface for previewing, verifying, and executing airdrop allocations before they go live. This ensures transparency and allows for validation before distribution.

## Admin Page Structure

```
/admin/airdrops
  ├── Campaign Management
  ├── Allocation Preview
  ├── User Activity Analysis
  └── Execution Controls
```

## 1. Admin Allocation Preview Component

### Component: `AllocationPreview.tsx`

```tsx
// components/admin/AllocationPreview.tsx
'use client'

import { useState } from 'react'
import { Principal } from '@dfinity/principal'
import { useAirdrop } from '@/lib/airdrop'
import { formatPulse, UserActivity, getTierForScore, ENGAGEMENT_TIERS, tiersToTuples } from '@/lib/staking'

interface AllocationPreviewProps {
  campaignId: bigint
  pollIds: bigint[]
  surveyIds: bigint[]
  users: string[] // Principal strings
  totalPool: bigint
}

interface PreviewUser {
  principal: string
  activity: UserActivity
  tier: { name: string; minScore: bigint; weight: bigint } | null
  shares: bigint
  estimatedAmount: bigint
}

export function AllocationPreview({
  campaignId,
  pollIds,
  surveyIds,
  users,
  totalPool
}: AllocationPreviewProps) {
  const [previewing, setPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewUser[]>([])
  const [totalShares, setTotalShares] = useState(0n)
  const airdropActor = useAirdrop()

  const handlePreview = async () => {
    setPreviewing(true)
    const previewResults: PreviewUser[] = []
    let sharesTotal = 0n

    try {
      // Fetch activity for each user
      for (const userPrincipal of users) {
        try {
          const principal = Principal.fromText(userPrincipal)
          const result = await airdropActor.get_user_activity(principal, pollIds, surveyIds)

          if ('ok' in result) {
            const activity = result.ok
            const tier = getTierForScore(activity.totalScore, Object.values(ENGAGEMENT_TIERS))
            const shares = tier ? tier.weight : 0n

            previewResults.push({
              principal: userPrincipal,
              activity,
              tier,
              shares,
              estimatedAmount: 0n // Will calculate after we have total shares
            })

            sharesTotal += shares
          }
        } catch (error) {
          console.error(`Error fetching activity for ${userPrincipal}:`, error)
        }
      }

      // Calculate estimated amounts based on shares
      const resultsWithAmounts = previewResults.map(user => ({
        ...user,
        estimatedAmount: sharesTotal > 0n ? (totalPool * user.shares) / sharesTotal : 0n
      }))

      // Sort by estimated amount (highest first)
      resultsWithAmounts.sort((a, b) =>
        Number(b.estimatedAmount - a.estimatedAmount)
      )

      setPreviewData(resultsWithAmounts)
      setTotalShares(sharesTotal)
    } finally {
      setPreviewing(false)
    }
  }

  const handleExecute = async () => {
    if (!confirm(`Are you sure you want to allocate to ${previewData.length} users?`)) {
      return
    }

    try {
      const tiers = Object.values(ENGAGEMENT_TIERS)
      const principals = users.map(p => Principal.fromText(p))

      const result = await airdropActor.auto_allocate_by_engagement(
        campaignId,
        pollIds,
        surveyIds,
        principals,
        tiersToTuples(tiers)
      )

      if ('ok' in result) {
        alert(result.ok)
        // Refresh or redirect
      } else {
        alert(`Error: ${result.err}`)
      }
    } catch (error) {
      console.error('Allocation error:', error)
      alert('Failed to execute allocation')
    }
  }

  // Group by tier for summary
  const tierSummary = previewData.reduce((acc, user) => {
    const tierName = user.tier?.name || 'None'
    if (!acc[tierName]) {
      acc[tierName] = { count: 0, totalAmount: 0n, users: [] }
    }
    acc[tierName].count++
    acc[tierName].totalAmount += user.estimatedAmount
    acc[tierName].users.push(user)
    return acc
  }, {} as Record<string, { count: number; totalAmount: bigint; users: PreviewUser[] }>)

  return (
    <div className="space-y-6">
      {/* Preview Controls */}
      <div className="flex gap-4">
        <button
          onClick={handlePreview}
          disabled={previewing}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {previewing ? 'Loading Preview...' : 'Preview Allocations'}
        </button>

        {previewData.length > 0 && (
          <button
            onClick={handleExecute}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Execute Allocation ({previewData.length} users)
          </button>
        )}
      </div>

      {/* Summary Statistics */}
      {previewData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Users</div>
            <div className="text-2xl font-bold">{previewData.length}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Pool</div>
            <div className="text-2xl font-bold">{formatPulse(totalPool, 8)} PULSE</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Shares</div>
            <div className="text-2xl font-bold">{totalShares.toString()}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Avg per User</div>
            <div className="text-2xl font-bold">
              {formatPulse(totalPool / BigInt(previewData.length), 8)}
            </div>
          </div>
        </div>
      )}

      {/* Tier Distribution */}
      {Object.keys(tierSummary).length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Distribution by Tier</h3>
          <div className="space-y-3">
            {Object.entries(tierSummary)
              .sort((a, b) => Number(b[1].totalAmount - a[1].totalAmount))
              .map(([tierName, data]) => (
                <div key={tierName} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-4">
                    <div className={`font-semibold ${getTierColor(tierName)}`}>
                      {tierName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {data.count} users
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatPulse(data.totalAmount, 8)} PULSE</div>
                    <div className="text-sm text-gray-500">
                      {((Number(data.totalAmount) / Number(totalPool)) * 100).toFixed(1)}% of pool
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Detailed User List */}
      {previewData.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">User Allocations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shares</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {previewData.map((user) => (
                  <tr key={user.principal} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm">
                        {user.principal.substring(0, 8)}...{user.principal.substring(user.principal.length - 6)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        <div>🗳️ {user.activity.voteCount.toString()} votes</div>
                        <div>📋 {user.activity.surveyCount.toString()} surveys</div>
                        {(user.activity.pollsCreated > 0n || user.activity.surveysCreated > 0n) && (
                          <div className="text-green-600">
                            ✨ Creator ({(user.activity.pollsCreated + user.activity.surveysCreated).toString()})
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-lg font-semibold">{user.activity.totalScore.toString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${getTierColor(user.tier?.name || 'None')}`}>
                        {user.tier?.name || 'None'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">{user.shares.toString()}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-blue-600">
                        {formatPulse(user.estimatedAmount, 8)}
                      </div>
                      <div className="text-xs text-gray-500">PULSE</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function getTierColor(tierName: string): string {
  switch (tierName) {
    case 'Platinum': return 'text-purple-600'
    case 'Gold': return 'text-yellow-600'
    case 'Silver': return 'text-gray-600'
    case 'Bronze': return 'text-orange-600'
    default: return 'text-gray-400'
  }
}
```

## 2. Campaign Management Component

### Component: `CampaignManager.tsx`

```tsx
// components/admin/CampaignManager.tsx
import { useState, useEffect } from 'react'
import { useAirdrop } from '@/lib/airdrop'
import { AirdropCampaign, formatPulse } from '@/lib/staking'

export function CampaignManager() {
  const [campaigns, setCampaigns] = useState<AirdropCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const airdropActor = useAirdrop()

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const allCampaigns = await airdropActor.get_all_campaigns()
      setCampaigns(allCampaigns)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreating(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const totalAmount = BigInt(formData.get('totalAmount') as string)
    const durationDays = BigInt(formData.get('durationDays') as string)

    try {
      const result = await airdropActor.create_campaign(
        name,
        description,
        totalAmount,
        durationDays
      )

      if ('ok' in result) {
        alert(`Campaign created with ID: ${result.ok}`)
        fetchCampaigns()
        e.currentTarget.reset()
      } else {
        alert(`Error: ${result.err}`)
      }
    } catch (error) {
      console.error('Create campaign error:', error)
      alert('Failed to create campaign')
    } finally {
      setCreating(false)
    }
  }

  const handleStartCampaign = async (campaignId: bigint) => {
    if (!confirm('Start this campaign? Ensure it has been funded with PULSE tokens.')) {
      return
    }

    try {
      const result = await airdropActor.start_campaign(campaignId)

      if ('ok' in result) {
        alert(result.ok)
        fetchCampaigns()
      } else {
        alert(`Error: ${result.err}`)
      }
    } catch (error) {
      console.error('Start campaign error:', error)
      alert('Failed to start campaign')
    }
  }

  if (loading) {
    return <div>Loading campaigns...</div>
  }

  return (
    <div className="space-y-6">
      {/* Create Campaign Form */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Create New Campaign</h3>
        <form onSubmit={handleCreateCampaign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Q1 2025 Active Users Reward"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              required
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Reward for platform engagement in Q1 2025"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Pool (e8s)
              </label>
              <input
                type="number"
                name="totalAmount"
                required
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="100000000000000"
              />
              <div className="text-xs text-gray-500 mt-1">
                1M PULSE = 100,000,000,000,000 e8s
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (days)
              </label>
              <input
                type="number"
                name="durationDays"
                required
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Campaign'}
          </button>
        </form>
      </div>

      {/* Campaigns List */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">All Campaigns</h3>
        </div>
        <div className="divide-y">
          {campaigns.map((campaign) => (
            <div key={campaign.id.toString()} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-lg">{campaign.name}</h4>
                  <p className="text-gray-600 text-sm mt-1">{campaign.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={campaign.status} />
                  {'Pending' in campaign.status && (
                    <button
                      onClick={() => handleStartCampaign(campaign.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Total Pool</div>
                  <div className="font-semibold">{formatPulse(campaign.totalAmount, 8)} PULSE</div>
                </div>
                <div>
                  <div className="text-gray-500">Claimed</div>
                  <div className="font-semibold">{formatPulse(campaign.claimedAmount, 8)} PULSE</div>
                </div>
                <div>
                  <div className="text-gray-500">Claims</div>
                  <div className="font-semibold">{campaign.claimCount.toString()} users</div>
                </div>
                <div>
                  <div className="text-gray-500">Ends</div>
                  <div className="font-semibold">
                    {new Date(Number(campaign.endTime) / 1_000_000).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: { [key: string]: null } }) {
  const statusName = Object.keys(status)[0]
  const colors = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Active: 'bg-green-100 text-green-800',
    Completed: 'bg-gray-100 text-gray-800',
    Cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[statusName as keyof typeof colors]}`}>
      {statusName}
    </span>
  )
}
```

## 3. Complete Admin Page

### Page: `app/admin/airdrops/page.tsx`

```tsx
// app/admin/airdrops/page.tsx
'use client'

import { useState } from 'react'
import { CampaignManager } from '@/components/admin/CampaignManager'
import { AllocationPreview } from '@/components/admin/AllocationPreview'
import { useIdentity } from '@/hooks/useIdentity'

export default function AdminAirdropsPage() {
  const { principal, isAuthenticated } = useIdentity()
  const [selectedCampaign, setSelectedCampaign] = useState<bigint | null>(null)
  const [userList, setUserList] = useState('')

  // TODO: Add admin check
  // if (!isAdmin(principal)) return <div>Unauthorized</div>

  if (!isAuthenticated) {
    return <div>Please connect wallet</div>
  }

  const users = userList
    .split('\n')
    .map(u => u.trim())
    .filter(u => u.length > 0)

  // You'd fetch these from your backend
  const pollIds = [1n, 2n, 3n]
  const surveyIds = [1n, 2n]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Airdrop Administration</h1>
        <p className="text-gray-600 mt-2">Manage campaigns and allocations</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Campaign Management */}
        <div>
          <CampaignManager />
        </div>

        {/* Right: Allocation Preview */}
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Allocation Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign ID
                </label>
                <input
                  type="number"
                  value={selectedCampaign?.toString() || ''}
                  onChange={(e) => setSelectedCampaign(BigInt(e.target.value || 0))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Principals (one per line)
                </label>
                <textarea
                  value={userList}
                  onChange={(e) => setUserList(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  placeholder="principal-1&#10;principal-2&#10;principal-3"
                />
                <div className="text-sm text-gray-500 mt-1">
                  {users.length} users to analyze
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Preview (Full Width) */}
      {selectedCampaign && users.length > 0 && (
        <div className="mt-8">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">Allocation Preview</h2>
            <AllocationPreview
              campaignId={selectedCampaign}
              pollIds={pollIds}
              surveyIds={surveyIds}
              users={users}
              totalPool={100_000_000_000_000n} // 1M PULSE - fetch from campaign
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

## 4. Export User List Helper

### Component: `ExportUserList.tsx`

```tsx
// components/admin/ExportUserList.tsx
import { useState } from 'react'
import { useAirdrop } from '@/lib/airdrop'

export function ExportUserList() {
  const [pollIds, setPollIds] = useState('1,2,3')
  const [surveyIds, setSurveyIds] = useState('1,2')
  const [userList, setUserList] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFetchActiveUsers = async () => {
    setLoading(true)
    try {
      // Fetch from polls_surveys_backend
      const response = await fetch('/api/get-active-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollIds: pollIds.split(',').map(id => parseInt(id.trim())),
          surveyIds: surveyIds.split(',').map(id => parseInt(id.trim()))
        })
      })

      const data = await response.json()
      const uniqueUsers = [...new Set(data.users)] // Remove duplicates
      setUserList(uniqueUsers.join('\n'))
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Fetch Active Users</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Poll IDs (comma separated)
          </label>
          <input
            type="text"
            value={pollIds}
            onChange={(e) => setPollIds(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="1,2,3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Survey IDs (comma separated)
          </label>
          <input
            type="text"
            value={surveyIds}
            onChange={(e) => setSurveyIds(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="1,2"
          />
        </div>

        <button
          onClick={handleFetchActiveUsers}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Fetching...' : 'Fetch Active Users'}
        </button>

        {userList && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Principals ({userList.split('\n').length} users)
            </label>
            <textarea
              value={userList}
              readOnly
              rows={10}
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm bg-gray-50"
            />
            <button
              onClick={() => navigator.clipboard.writeText(userList)}
              className="mt-2 px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
            >
              Copy to Clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

## Summary

### Admin Workflow:

1. **Create Campaign** → Set name, description, pool size, duration
2. **Fetch Active Users** → Get list of user principals from polls/surveys
3. **Preview Allocation** → See exact distribution before executing
4. **Review Data**:
   - User activity breakdown
   - Tier distribution
   - Individual allocations
   - Percentage of pool
5. **Execute** → Auto-allocate based on engagement tiers
6. **Fund Campaign** → Transfer PULSE to airdrop canister
7. **Start Campaign** → Activate for user claims

### Key Admin Features:

✅ **Preview Before Execute** - See exact allocations
✅ **Tier Distribution** - Visual breakdown by engagement level
✅ **User Activity Details** - Votes, surveys, creations
✅ **Total Pool Management** - Track claimed vs remaining
✅ **Campaign Status** - Pending → Active → Completed
✅ **Export/Import Users** - Easy user list management

This gives you full transparency and control before any tokens are distributed! 🎯
