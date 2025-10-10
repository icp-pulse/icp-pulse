// Staking utilities for ICP Pulse
// Handles interactions with staking, PULSEG, and airdrop canisters

import { Actor, HttpAgent, type Identity } from '@dfinity/agent'

export type CanisterConfig = { canisterId: string; host?: string }

// Staking Period Types
export enum StakingPeriod {
  Flexible = 'Flexible',
  ThirtyDays = '30 Days',
  NinetyDays = '90 Days',
  OneYear = '1 Year',
}

// Staking Status
export enum StakeStatus {
  Active = 'Active',
  Unstaking = 'Unstaking',
  Completed = 'Completed',
}

// Claim Status
export enum ClaimStatus {
  Unclaimed = 'Unclaimed',
  Claimed = 'Claimed',
  Expired = 'Expired',
}

// Airdrop Status
export enum AirdropStatus {
  Pending = 'Pending',
  Active = 'Active',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

// Type definitions matching backend
export interface StakeInfo {
  id: bigint
  owner: string
  pulseAmount: bigint
  pulsegEarned: bigint
  pulsegClaimed: bigint
  lockPeriod: { [key: string]: null }
  startTime: bigint
  endTime: bigint
  rewardRate: bigint
  lastClaimTime: bigint
  status: { [key: string]: null }
}

export interface StakingStats {
  totalPulseStaked: bigint
  totalPulsegDistributed: bigint
  totalStakers: bigint
  activeStakes: bigint
  averageStakingPeriod: bigint
}

export interface AirdropCampaign {
  id: bigint
  name: string
  description: string
  totalAmount: bigint
  startTime: bigint
  endTime: bigint
  status: { [key: string]: null }
  claimedAmount: bigint
  claimCount: bigint
}

export interface UserAirdropInfo {
  campaignId: bigint
  campaignName: string
  amount: bigint
  reason: string
  claimStatus: { [key: string]: null }
  claimedAt: [] | [bigint]
  expiresAt: bigint
}

export interface UserActivity {
  user: string
  voteCount: bigint
  surveyCount: bigint
  pollsCreated: bigint
  surveysCreated: bigint
  totalScore: bigint
  firstActivity: [] | [bigint]
}

export interface EngagementTier {
  name: string
  minScore: bigint
  weight: bigint
}

// IDL definitions for staking canister
export const stakingIDL = ({ IDL }: any) => {
  const StakingPeriod = IDL.Variant({
    'Flexible': IDL.Null,
    'ThirtyDays': IDL.Null,
    'NinetyDays': IDL.Null,
    'OneYear': IDL.Null,
  })

  const StakeStatus = IDL.Variant({
    'Active': IDL.Null,
    'Unstaking': IDL.Null,
    'Completed': IDL.Null,
  })

  const StakeInfo = IDL.Record({
    'id': IDL.Nat,
    'owner': IDL.Principal,
    'pulseAmount': IDL.Nat,
    'pulsegEarned': IDL.Nat,
    'pulsegClaimed': IDL.Nat,
    'lockPeriod': StakingPeriod,
    'startTime': IDL.Int,
    'endTime': IDL.Int,
    'rewardRate': IDL.Nat,
    'lastClaimTime': IDL.Int,
    'status': StakeStatus,
  })

  const StakingStats = IDL.Record({
    'totalPulseStaked': IDL.Nat,
    'totalPulsegDistributed': IDL.Nat,
    'totalStakers': IDL.Nat,
    'activeStakes': IDL.Nat,
    'averageStakingPeriod': IDL.Nat,
  })

  const Result = IDL.Variant({ 'ok': IDL.Nat, 'err': IDL.Text })
  const Result_1 = IDL.Variant({ 'ok': IDL.Text, 'err': IDL.Text })

  return IDL.Service({
    'initialize': IDL.Func([IDL.Principal, IDL.Principal], [Result_1], []),
    'stake': IDL.Func([IDL.Nat, StakingPeriod], [Result], []),
    'unstake': IDL.Func([IDL.Nat], [Result_1], []),
    'claim_rewards': IDL.Func([IDL.Nat], [Result], []),
    'get_user_stakes': IDL.Func([IDL.Principal], [IDL.Vec(StakeInfo)], ['query']),
    'get_stake': IDL.Func([IDL.Nat], [IDL.Opt(StakeInfo)], ['query']),
    'calculate_pending_rewards': IDL.Func([IDL.Nat], [Result], ['query']),
    'get_total_staked': IDL.Func([], [IDL.Nat], ['query']),
    'get_staking_stats': IDL.Func([], [StakingStats], ['query']),
    'is_initialized': IDL.Func([], [IDL.Bool], ['query']),
    'is_staking_paused': IDL.Func([], [IDL.Bool], ['query']),
    'get_reward_rates': IDL.Func([], [IDL.Vec(IDL.Tuple(StakingPeriod, IDL.Nat))], ['query']),
  })
}

// IDL definitions for airdrop canister
export const airdropIDL = ({ IDL }: any) => {
  const AirdropStatus = IDL.Variant({
    'Pending': IDL.Null,
    'Active': IDL.Null,
    'Completed': IDL.Null,
    'Cancelled': IDL.Null,
  })

  const AirdropCampaign = IDL.Record({
    'id': IDL.Nat,
    'name': IDL.Text,
    'description': IDL.Text,
    'totalAmount': IDL.Nat,
    'startTime': IDL.Int,
    'endTime': IDL.Int,
    'status': AirdropStatus,
    'claimedAmount': IDL.Nat,
    'claimCount': IDL.Nat,
  })

  const ClaimStatus = IDL.Variant({
    'Unclaimed': IDL.Null,
    'Claimed': IDL.Null,
    'Expired': IDL.Null,
  })

  const UserAirdropInfo = IDL.Record({
    'campaignId': IDL.Nat,
    'campaignName': IDL.Text,
    'amount': IDL.Nat,
    'reason': IDL.Text,
    'claimStatus': ClaimStatus,
    'claimedAt': IDL.Opt(IDL.Int),
    'expiresAt': IDL.Int,
  })

  const UserActivity = IDL.Record({
    'user': IDL.Principal,
    'voteCount': IDL.Nat,
    'surveyCount': IDL.Nat,
    'pollsCreated': IDL.Nat,
    'surveysCreated': IDL.Nat,
    'totalScore': IDL.Nat,
    'firstActivity': IDL.Opt(IDL.Int),
  })

  const Result = IDL.Variant({ 'ok': IDL.Nat, 'err': IDL.Text })
  const Result_1 = IDL.Variant({ 'ok': IDL.Text, 'err': IDL.Text })
  const Result_2 = IDL.Variant({ 'ok': UserActivity, 'err': IDL.Text })

  return IDL.Service({
    'initialize': IDL.Func([IDL.Principal, IDL.Principal], [Result_1], []),
    'create_campaign': IDL.Func([IDL.Text, IDL.Text, IDL.Nat, IDL.Nat], [Result], []),
    'start_campaign': IDL.Func([IDL.Nat], [Result_1], []),
    'claim_airdrop': IDL.Func([IDL.Nat], [Result], []),
    'get_user_airdrops': IDL.Func([IDL.Principal], [IDL.Vec(UserAirdropInfo)], ['query']),
    'get_campaign': IDL.Func([IDL.Nat], [IDL.Opt(AirdropCampaign)], ['query']),
    'get_all_campaigns': IDL.Func([], [IDL.Vec(AirdropCampaign)], ['query']),
    'get_active_campaigns': IDL.Func([], [IDL.Vec(AirdropCampaign)], ['query']),
    'check_eligibility': IDL.Func([IDL.Principal, IDL.Nat], [Result], ['query']),
    'is_initialized': IDL.Func([], [IDL.Bool], ['query']),
    // Auto-allocation functions
    'auto_allocate_by_engagement': IDL.Func(
      [IDL.Nat, IDL.Vec(IDL.Nat), IDL.Vec(IDL.Nat), IDL.Vec(IDL.Principal), IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat, IDL.Nat))],
      [Result_1],
      []
    ),
    'auto_allocate_early_adopters': IDL.Func(
      [IDL.Nat, IDL.Vec(IDL.Nat), IDL.Vec(IDL.Nat), IDL.Vec(IDL.Principal), IDL.Int, IDL.Nat],
      [Result_1],
      []
    ),
    'get_user_activity': IDL.Func(
      [IDL.Principal, IDL.Vec(IDL.Nat), IDL.Vec(IDL.Nat)],
      [Result_2],
      []
    ),
  })
}

// IDL for PULSEG token (same as ICRC-1)
export const pulsegIDL = ({ IDL }: any) => {
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  })

  const TransferError = IDL.Variant({
    'GenericError': IDL.Record({
      'message': IDL.Text,
      'error_code': IDL.Nat,
    }),
    'TemporarilyUnavailable': IDL.Null,
    'BadBurn': IDL.Record({ 'min_burn_amount': IDL.Nat }),
    'Duplicate': IDL.Record({ 'duplicate_of': IDL.Nat }),
    'BadFee': IDL.Record({ 'expected_fee': IDL.Nat }),
    'CreatedInFuture': IDL.Record({ 'ledger_time': IDL.Nat64 }),
    'TooOld': IDL.Null,
    'InsufficientFunds': IDL.Record({ 'balance': IDL.Nat }),
  })

  const TransferResult = IDL.Variant({
    'Ok': IDL.Nat,
    'Err': TransferError,
  })

  const Value = IDL.Variant({
    'Int': IDL.Int,
    'Nat': IDL.Nat,
    'Blob': IDL.Vec(IDL.Nat8),
    'Text': IDL.Text,
  })

  return IDL.Service({
    'icrc1_name': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_symbol': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_decimals': IDL.Func([], [IDL.Nat8], ['query']),
    'icrc1_fee': IDL.Func([], [IDL.Nat], ['query']),
    'icrc1_metadata': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, Value))], ['query']),
    'icrc1_total_supply': IDL.Func([], [IDL.Nat], ['query']),
    'icrc1_minting_account': IDL.Func([], [IDL.Opt(Account)], ['query']),
    'icrc1_balance_of': IDL.Func([Account], [IDL.Nat], ['query']),
    'icrc1_transfer': IDL.Func([
      IDL.Record({
        'to': Account,
        'fee': IDL.Opt(IDL.Nat),
        'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
        'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
        'created_at_time': IDL.Opt(IDL.Nat64),
        'amount': IDL.Nat,
      })
    ], [TransferResult], []),
  })
}

// Create staking actor
export async function createStakingActor(
  { canisterId, host }: CanisterConfig,
  identity?: Identity | null
) {
  const isLocal = !!host && (host.includes('127.0.0.1') || host.includes('localhost'))

  // Handle Plug wallet
  if (!identity && typeof window !== 'undefined' && window.ic?.plug) {
    const plugConnected = await window.ic.plug.isConnected()
    if (plugConnected) {
      try {
        const actor = await window.ic.plug.createActor({
          canisterId,
          interfaceFactory: stakingIDL
        })
        return actor
      } catch (error) {
        console.error('Error creating staking actor with Plug:', error)
        throw new Error('Failed to create actor with Plug wallet')
      }
    }
  }

  if (!identity) {
    throw new Error('No identity provided and Plug wallet not connected')
  }

  const agent = new HttpAgent({
    host,
    identity,
    verifyQuerySignatures: !isLocal
  }) as HttpAgent

  if (isLocal) {
    try {
      await agent.fetchRootKey()
    } catch (error) {
      console.warn('Failed to fetch root key:', error)
    }
  }

  return Actor.createActor(stakingIDL as any, { agent, canisterId }) as any
}

// Create airdrop actor
export async function createAirdropActor(
  { canisterId, host }: CanisterConfig,
  identity?: Identity | null
) {
  const isLocal = !!host && (host.includes('127.0.0.1') || host.includes('localhost'))

  // Handle Plug wallet
  if (!identity && typeof window !== 'undefined' && window.ic?.plug) {
    const plugConnected = await window.ic.plug.isConnected()
    if (plugConnected) {
      try {
        const actor = await window.ic.plug.createActor({
          canisterId,
          interfaceFactory: airdropIDL
        })
        return actor
      } catch (error) {
        console.error('Error creating airdrop actor with Plug:', error)
        throw new Error('Failed to create actor with Plug wallet')
      }
    }
  }

  if (!identity) {
    throw new Error('No identity provided and Plug wallet not connected')
  }

  const agent = new HttpAgent({
    host,
    identity,
    verifyQuerySignatures: !isLocal
  }) as HttpAgent

  if (isLocal) {
    try {
      await agent.fetchRootKey()
    } catch (error) {
      console.warn('Failed to fetch root key:', error)
    }
  }

  return Actor.createActor(airdropIDL as any, { agent, canisterId }) as any
}

// Create PULSEG token actor
export async function createPulsegActor(
  { canisterId, host }: CanisterConfig,
  identity?: Identity | null
) {
  const isLocal = !!host && (host.includes('127.0.0.1') || host.includes('localhost'))

  // Handle Plug wallet
  if (!identity && typeof window !== 'undefined' && window.ic?.plug) {
    const plugConnected = await window.ic.plug.isConnected()
    if (plugConnected) {
      try {
        const actor = await window.ic.plug.createActor({
          canisterId,
          interfaceFactory: pulsegIDL
        })
        return actor
      } catch (error) {
        console.error('Error creating PULSEG actor with Plug:', error)
        throw new Error('Failed to create actor with Plug wallet')
      }
    }
  }

  if (!identity) {
    throw new Error('No identity provided and Plug wallet not connected')
  }

  const agent = new HttpAgent({
    host,
    identity,
    verifyQuerySignatures: !isLocal
  }) as HttpAgent

  if (isLocal) {
    try {
      await agent.fetchRootKey()
    } catch (error) {
      console.warn('Failed to fetch root key:', error)
    }
  }

  return Actor.createActor(pulsegIDL as any, { agent, canisterId }) as any
}

// Utility functions
export function formatPulse(amount: bigint, decimals: number = 8): string {
  const divisor = BigInt(10 ** decimals)
  const whole = amount / divisor
  const fraction = amount % divisor
  const fractionStr = fraction.toString().padStart(decimals, '0')
  return `${whole}.${fractionStr}`
}

export function parsePulse(amount: string, decimals: number = 8): bigint {
  const [whole, fraction = '0'] = amount.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFraction)
}

export function getStakingPeriodVariant(period: StakingPeriod): { [key: string]: null } {
  switch (period) {
    case StakingPeriod.Flexible:
      return { 'Flexible': null }
    case StakingPeriod.ThirtyDays:
      return { 'ThirtyDays': null }
    case StakingPeriod.NinetyDays:
      return { 'NinetyDays': null }
    case StakingPeriod.OneYear:
      return { 'OneYear': null }
    default:
      return { 'Flexible': null }
  }
}

export function getAPYForPeriod(period: StakingPeriod): number {
  switch (period) {
    case StakingPeriod.Flexible:
      return 5
    case StakingPeriod.ThirtyDays:
      return 15
    case StakingPeriod.NinetyDays:
      return 30
    case StakingPeriod.OneYear:
      return 50
    default:
      return 5
  }
}

export function getDurationForPeriod(period: StakingPeriod): number {
  switch (period) {
    case StakingPeriod.Flexible:
      return 0
    case StakingPeriod.ThirtyDays:
      return 30
    case StakingPeriod.NinetyDays:
      return 90
    case StakingPeriod.OneYear:
      return 365
    default:
      return 0
  }
}

export function calculateProjectedRewards(
  amount: bigint,
  period: StakingPeriod,
  decimals: number = 8
): string {
  const apy = getAPYForPeriod(period)
  const duration = getDurationForPeriod(period)

  if (duration === 0) {
    // For flexible staking, calculate for 1 year
    const rewards = (amount * BigInt(apy)) / BigInt(100)
    return formatPulse(rewards, decimals)
  }

  const rewards = (amount * BigInt(apy) * BigInt(duration)) / (BigInt(100) * BigInt(365))
  return formatPulse(rewards, decimals)
}

// Predefined engagement tiers for airdrop campaigns
export const ENGAGEMENT_TIERS = {
  BRONZE: { name: 'Bronze', minScore: 5n, weight: 1n },
  SILVER: { name: 'Silver', minScore: 20n, weight: 2n },
  GOLD: { name: 'Gold', minScore: 50n, weight: 5n },
  PLATINUM: { name: 'Platinum', minScore: 100n, weight: 10n },
}

// Convert engagement tiers to tuple format for canister calls
export function tiersToTuples(tiers: EngagementTier[]): [string, bigint, bigint][] {
  return tiers.map(tier => [tier.name, tier.minScore, tier.weight])
}

// Calculate activity score preview (client-side estimation)
export function calculateActivityScore(
  votes: number,
  surveys: number,
  pollsCreated: number,
  surveysCreated: number
): bigint {
  // Matches backend calculation: votes * 1 + surveys * 2 + polls * 5 + surveys * 5
  return BigInt(votes * 1 + surveys * 2 + pollsCreated * 5 + surveysCreated * 5)
}

// Get tier for a given score
export function getTierForScore(score: bigint, tiers: EngagementTier[]): EngagementTier | null {
  let selectedTier: EngagementTier | null = null

  for (const tier of tiers) {
    if (score >= tier.minScore) {
      if (!selectedTier || tier.minScore > selectedTier.minScore) {
        selectedTier = tier
      }
    }
  }

  return selectedTier
}

// Format user activity for display
export function formatUserActivity(activity: UserActivity): string {
  const parts = []

  if (activity.voteCount > 0n) {
    parts.push(`${activity.voteCount} votes`)
  }
  if (activity.surveyCount > 0n) {
    parts.push(`${activity.surveyCount} surveys`)
  }
  if (activity.pollsCreated > 0n) {
    parts.push(`${activity.pollsCreated} polls created`)
  }
  if (activity.surveysCreated > 0n) {
    parts.push(`${activity.surveysCreated} surveys created`)
  }

  return parts.join(', ') || 'No activity'
}

// Window type extension for Plug wallet
declare global {
  interface Window {
    ic?: {
      plug?: {
        isConnected: () => Promise<boolean>
        createActor: (options: {
          canisterId: string
          interfaceFactory: any
        }) => Promise<any>
      }
    }
  }
}
