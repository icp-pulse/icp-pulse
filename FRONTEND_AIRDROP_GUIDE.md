# Frontend Airdrop Integration Guide

## Overview

This guide shows how to fetch and display airdrop allocations on the frontend using the airdrop canister.

## Available Query Functions

### 1. Get User's Airdrops
```typescript
get_user_airdrops(user: Principal) -> [UserAirdropInfo]
```

### 2. Get All Campaigns
```typescript
get_all_campaigns() -> [AirdropCampaign]
get_active_campaigns() -> [AirdropCampaign]
```

### 3. Check Eligibility
```typescript
check_eligibility(user: Principal, campaignId: bigint) -> Result<bigint, string>
```

### 4. Get User Activity
```typescript
get_user_activity(user: Principal, pollIds: bigint[], surveyIds: bigint[]) -> Result<UserActivity, string>
```

## Setup: Create Airdrop Actor

```typescript
// lib/airdrop.ts
import { createAirdropActor } from '@/lib/staking'
import { useIdentity } from '@/hooks/useIdentity' // Your auth hook

export function useAirdrop() {
  const { identity } = useIdentity()

  const airdropActor = createAirdropActor(
    {
      canisterId: process.env.NEXT_PUBLIC_AIRDROP_CANISTER_ID!,
      host: process.env.NEXT_PUBLIC_IC_HOST || 'https://ic0.app'
    },
    identity
  )

  return airdropActor
}
```

## 1. Fetch User's Airdrop Allocations

### Hook: `useUserAirdrops`

```typescript
// hooks/useUserAirdrops.ts
import { useState, useEffect } from 'react'
import { Principal } from '@dfinity/principal'
import { useAirdrop } from '@/lib/airdrop'
import { UserAirdropInfo } from '@/lib/staking'

export function useUserAirdrops(userPrincipal?: string) {
  const [airdrops, setAirdrops] = useState<UserAirdropInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const airdropActor = useAirdrop()

  useEffect(() => {
    async function fetchAirdrops() {
      if (!userPrincipal || !airdropActor) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const principal = Principal.fromText(userPrincipal)
        const result = await airdropActor.get_user_airdrops(principal)
        setAirdrops(result)
        setError(null)
      } catch (err) {
        console.error('Error fetching airdrops:', err)
        setError('Failed to load airdrops')
      } finally {
        setLoading(false)
      }
    }

    fetchAirdrops()
  }, [userPrincipal, airdropActor])

  return { airdrops, loading, error, refetch: () => fetchAirdrops() }
}
```

## 2. Display User Airdrops Component

### Component: `AirdropList.tsx`

```tsx
// components/airdrop/AirdropList.tsx
import { useUserAirdrops } from '@/hooks/useUserAirdrops'
import { formatPulse } from '@/lib/staking'
import { useIdentity } from '@/hooks/useIdentity'

export function AirdropList() {
  const { principal } = useIdentity()
  const { airdrops, loading, error } = useUserAirdrops(principal?.toText())

  if (loading) {
    return <div className="animate-pulse">Loading airdrops...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  if (airdrops.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No airdrops available</p>
        <p className="text-sm mt-2">Participate in polls and surveys to earn rewards!</p>
      </div>
    )
  }

  // Separate unclaimed and claimed
  const unclaimed = airdrops.filter(a => 'Unclaimed' in a.claimStatus)
  const claimed = airdrops.filter(a => 'Claimed' in a.claimStatus)

  return (
    <div className="space-y-6">
      {/* Unclaimed Airdrops */}
      {unclaimed.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Available to Claim</h3>
          <div className="grid gap-4">
            {unclaimed.map((airdrop) => (
              <AirdropCard key={`${airdrop.campaignId}`} airdrop={airdrop} />
            ))}
          </div>
        </div>
      )}

      {/* Claimed Airdrops */}
      {claimed.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Already Claimed</h3>
          <div className="grid gap-4 opacity-60">
            {claimed.map((airdrop) => (
              <AirdropCard key={`${airdrop.campaignId}`} airdrop={airdrop} claimed />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

### Component: `AirdropCard.tsx`

```tsx
// components/airdrop/AirdropCard.tsx
import { useState } from 'react'
import { UserAirdropInfo, formatPulse } from '@/lib/staking'
import { useAirdrop } from '@/lib/airdrop'
import { toast } from 'react-hot-toast'

interface AirdropCardProps {
  airdrop: UserAirdropInfo
  claimed?: boolean
}

export function AirdropCard({ airdrop, claimed = false }: AirdropCardProps) {
  const [claiming, setClaiming] = useState(false)
  const airdropActor = useAirdrop()

  const handleClaim = async () => {
    try {
      setClaiming(true)
      const result = await airdropActor.claim_airdrop(airdrop.campaignId)

      if ('ok' in result) {
        toast.success(`Claimed ${formatPulse(result.ok, 8)} PULSE!`)
        // Refresh the page or refetch airdrops
        window.location.reload()
      } else {
        toast.error(result.err)
      }
    } catch (error) {
      console.error('Claim error:', error)
      toast.error('Failed to claim airdrop')
    } finally {
      setClaiming(false)
    }
  }

  const isExpired = Date.now() > Number(airdrop.expiresAt) / 1_000_000
  const canClaim = !claimed && !isExpired

  return (
    <div className={`border rounded-lg p-6 ${claimed ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-semibold text-lg">{airdrop.campaignName}</h4>
          <p className="text-sm text-gray-600 mt-1">{airdrop.reason}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {formatPulse(airdrop.amount, 8)}
          </div>
          <div className="text-sm text-gray-500">PULSE</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {claimed && airdrop.claimedAt[0] && (
            <span>Claimed on {new Date(Number(airdrop.claimedAt[0]) / 1_000_000).toLocaleDateString()}</span>
          )}
          {!claimed && isExpired && (
            <span className="text-red-500">Expired</span>
          )}
          {!claimed && !isExpired && (
            <span>Expires {new Date(Number(airdrop.expiresAt) / 1_000_000).toLocaleDateString()}</span>
          )}
        </div>

        {canClaim && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {claiming ? 'Claiming...' : 'Claim Now'}
          </button>
        )}
      </div>
    </div>
  )
}
```

## 3. Display User Activity & Eligibility

### Component: `UserActivityCard.tsx`

```tsx
// components/airdrop/UserActivityCard.tsx
import { useState, useEffect } from 'react'
import { Principal } from '@dfinity/principal'
import { useAirdrop } from '@/lib/airdrop'
import { UserActivity, formatUserActivity, getTierForScore, ENGAGEMENT_TIERS } from '@/lib/staking'

interface UserActivityCardProps {
  userPrincipal: string
  pollIds: bigint[]
  surveyIds: bigint[]
}

export function UserActivityCard({ userPrincipal, pollIds, surveyIds }: UserActivityCardProps) {
  const [activity, setActivity] = useState<UserActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const airdropActor = useAirdrop()

  useEffect(() => {
    async function fetchActivity() {
      try {
        const principal = Principal.fromText(userPrincipal)
        const result = await airdropActor.get_user_activity(principal, pollIds, surveyIds)

        if ('ok' in result) {
          setActivity(result.ok)
        }
      } catch (error) {
        console.error('Error fetching activity:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [userPrincipal, pollIds, surveyIds, airdropActor])

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-lg"></div>
  }

  if (!activity) {
    return null
  }

  const tier = getTierForScore(activity.totalScore, Object.values(ENGAGEMENT_TIERS))

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Your Activity Score</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{activity.voteCount.toString()}</div>
          <div className="text-sm text-gray-600">Votes</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">{activity.surveyCount.toString()}</div>
          <div className="text-sm text-gray-600">Surveys</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{activity.pollsCreated.toString()}</div>
          <div className="text-sm text-gray-600">Polls Created</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-orange-600">{activity.surveysCreated.toString()}</div>
          <div className="text-sm text-gray-600">Surveys Created</div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Total Score</div>
            <div className="text-2xl font-bold">{activity.totalScore.toString()}</div>
          </div>
          {tier && (
            <div className="text-right">
              <div className="text-sm text-gray-600">Engagement Tier</div>
              <div className={`text-xl font-bold ${getTierColor(tier.name)}`}>
                {tier.name}
              </div>
            </div>
          )}
        </div>
      </div>

      {activity.firstActivity[0] && (
        <div className="mt-4 text-sm text-gray-500">
          Member since {new Date(Number(activity.firstActivity[0]) / 1_000_000).toLocaleDateString()}
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
    default: return 'text-gray-600'
  }
}
```

## 4. Check Campaign Eligibility

### Component: `CampaignEligibility.tsx`

```tsx
// components/airdrop/CampaignEligibility.tsx
import { useState, useEffect } from 'react'
import { Principal } from '@dfinity/principal'
import { useAirdrop } from '@/lib/airdrop'
import { formatPulse } from '@/lib/staking'

interface CampaignEligibilityProps {
  campaignId: bigint
  userPrincipal: string
}

export function CampaignEligibility({ campaignId, userPrincipal }: CampaignEligibilityProps) {
  const [eligible, setEligible] = useState<bigint | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const airdropActor = useAirdrop()

  useEffect(() => {
    async function checkEligibility() {
      try {
        const principal = Principal.fromText(userPrincipal)
        const result = await airdropActor.check_eligibility(principal, campaignId)

        if ('ok' in result) {
          setEligible(result.ok)
          setError(null)
        } else {
          setEligible(null)
          setError(result.err)
        }
      } catch (err) {
        console.error('Eligibility check error:', err)
        setError('Failed to check eligibility')
      } finally {
        setChecking(false)
      }
    }

    checkEligibility()
  }, [campaignId, userPrincipal, airdropActor])

  if (checking) {
    return <div className="text-sm text-gray-500">Checking eligibility...</div>
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>
  }

  if (eligible) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
        <span>✓ Eligible for {formatPulse(eligible, 8)} PULSE</span>
      </div>
    )
  }

  return null
}
```

## 5. Display Active Campaigns

### Component: `ActiveCampaigns.tsx`

```tsx
// components/airdrop/ActiveCampaigns.tsx
import { useState, useEffect } from 'react'
import { useAirdrop } from '@/lib/airdrop'
import { AirdropCampaign, formatPulse } from '@/lib/staking'
import { CampaignEligibility } from './CampaignEligibility'
import { useIdentity } from '@/hooks/useIdentity'

export function ActiveCampaigns() {
  const [campaigns, setCampaigns] = useState<AirdropCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const { principal } = useIdentity()
  const airdropActor = useAirdrop()

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const activeCampaigns = await airdropActor.get_active_campaigns()
        setCampaigns(activeCampaigns)
      } catch (error) {
        console.error('Error fetching campaigns:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [airdropActor])

  if (loading) {
    return <div>Loading campaigns...</div>
  }

  if (campaigns.length === 0) {
    return <div className="text-gray-500">No active campaigns</div>
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <div key={campaign.id.toString()} className="border rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold">{campaign.name}</h3>
              <p className="text-gray-600 mt-1">{campaign.description}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Pool</div>
              <div className="text-lg font-bold">{formatPulse(campaign.totalAmount, 8)} PULSE</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500">Claimed: </span>
              <span className="font-semibold">{formatPulse(campaign.claimedAmount, 8)} PULSE</span>
            </div>
            <div>
              <span className="text-gray-500">Claims: </span>
              <span className="font-semibold">{campaign.claimCount.toString()} users</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm text-gray-500 mb-2">
              Expires: {new Date(Number(campaign.endTime) / 1_000_000).toLocaleDateString()}
            </div>
            {principal && (
              <CampaignEligibility
                campaignId={campaign.id}
                userPrincipal={principal.toText()}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

## 6. Complete Airdrop Page

### Page: `app/airdrop/page.tsx`

```tsx
// app/airdrop/page.tsx
'use client'

import { useIdentity } from '@/hooks/useIdentity'
import { AirdropList } from '@/components/airdrop/AirdropList'
import { ActiveCampaigns } from '@/components/airdrop/ActiveCampaigns'
import { UserActivityCard } from '@/components/airdrop/UserActivityCard'

export default function AirdropPage() {
  const { principal, isAuthenticated } = useIdentity()

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Airdrops</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-lg">Please connect your wallet to view airdrops</p>
        </div>
      </div>
    )
  }

  // Get all poll and survey IDs (you'd fetch these from your backend)
  const pollIds = [1n, 2n, 3n] // Replace with actual poll IDs
  const surveyIds = [1n, 2n] // Replace with actual survey IDs

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Airdrops</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* User's Airdrops */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Your Airdrops</h2>
            <AirdropList />
          </section>

          {/* Active Campaigns */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Active Campaigns</h2>
            <ActiveCampaigns />
          </section>
        </div>

        <div className="space-y-6">
          {/* User Activity */}
          <UserActivityCard
            userPrincipal={principal!.toText()}
            pollIds={pollIds}
            surveyIds={surveyIds}
          />

          {/* Info Card */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold mb-2">How to Earn Airdrops</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• Vote in polls (+1 point each)</li>
              <li>• Complete surveys (+2 points each)</li>
              <li>• Create polls (+5 points each)</li>
              <li>• Create surveys (+5 points each)</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="text-sm text-gray-600">Your points determine your tier and allocation share in airdrop campaigns.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## 7. Navigation Link

Add to your main navigation:

```tsx
// components/Navigation.tsx
<Link href="/airdrop" className="nav-link">
  Airdrops
  {unclaimedCount > 0 && (
    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
      {unclaimedCount}
    </span>
  )}
</Link>
```

## Summary

### Key Functions to Use:

1. **`get_user_airdrops(principal)`** - Get user's allocations
2. **`get_active_campaigns()`** - List active campaigns
3. **`check_eligibility(principal, campaignId)`** - Check if eligible
4. **`get_user_activity(principal, pollIds, surveyIds)`** - Get activity score
5. **`claim_airdrop(campaignId)`** - Claim allocation

### Data Flow:

```
User connects wallet
  ↓
Fetch user airdrops (get_user_airdrops)
  ↓
Display unclaimed allocations
  ↓
User clicks "Claim"
  ↓
Call claim_airdrop(campaignId)
  ↓
Tokens transferred to user
  ↓
Refresh airdrop list
```

### Environment Variables Needed:

```env
NEXT_PUBLIC_AIRDROP_CANISTER_ID=27ftn-piaaa-aaaao-a4p6a-cai
NEXT_PUBLIC_IC_HOST=https://ic0.app
```

This gives you a complete, production-ready airdrop interface! 🚀
