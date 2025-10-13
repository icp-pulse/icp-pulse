/**
 * Premium tier management for True Pulse
 * Handles user tier checking, feature access, and usage limits
 */

export enum PremiumTier {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

export interface TierLimits {
  aiInsightsPerMonth: number
  maxPollsPerAnalysis: number
  exportEnabled: boolean
  analysisHistory: boolean
  advancedAnalytics: boolean
}

export const TIER_LIMITS: Record<PremiumTier, TierLimits> = {
  [PremiumTier.FREE]: {
    aiInsightsPerMonth: 3,
    maxPollsPerAnalysis: 5,
    exportEnabled: false,
    analysisHistory: false,
    advancedAnalytics: false
  },
  [PremiumTier.PREMIUM]: {
    aiInsightsPerMonth: 50,
    maxPollsPerAnalysis: 20,
    exportEnabled: true,
    analysisHistory: true,
    advancedAnalytics: true
  },
  [PremiumTier.ENTERPRISE]: {
    aiInsightsPerMonth: -1, // unlimited
    maxPollsPerAnalysis: -1, // unlimited
    exportEnabled: true,
    analysisHistory: true,
    advancedAnalytics: true
  }
}

export interface UserPremiumStatus {
  tier: PremiumTier
  aiInsightsUsed: number
  lastResetDate: string
}

/**
 * Get user's premium tier from localStorage (temporary solution)
 * TODO: Replace with backend API call to check actual subscription
 */
export function getUserTier(userPrincipal?: string): PremiumTier {
  if (typeof window === 'undefined') return PremiumTier.FREE

  try {
    const stored = localStorage.getItem(`premium_tier_${userPrincipal}`)
    if (stored && Object.values(PremiumTier).includes(stored as PremiumTier)) {
      return stored as PremiumTier
    }
  } catch (e) {
    console.error('Error reading premium tier:', e)
  }

  return PremiumTier.FREE
}

/**
 * Set user's premium tier in localStorage (for demo/testing)
 * TODO: Replace with backend subscription management
 */
export function setUserTier(userPrincipal: string, tier: PremiumTier): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(`premium_tier_${userPrincipal}`, tier)
  } catch (e) {
    console.error('Error setting premium tier:', e)
  }
}

/**
 * Get user's premium status including usage stats
 */
export function getUserPremiumStatus(userPrincipal?: string): UserPremiumStatus {
  if (typeof window === 'undefined' || !userPrincipal) {
    return {
      tier: PremiumTier.FREE,
      aiInsightsUsed: 0,
      lastResetDate: new Date().toISOString()
    }
  }

  try {
    const stored = localStorage.getItem(`premium_status_${userPrincipal}`)
    if (stored) {
      const status: UserPremiumStatus = JSON.parse(stored)

      // Check if we need to reset monthly usage
      const lastReset = new Date(status.lastResetDate)
      const now = new Date()
      const monthsSinceReset = (now.getFullYear() - lastReset.getFullYear()) * 12 +
                               (now.getMonth() - lastReset.getMonth())

      if (monthsSinceReset >= 1) {
        // Reset usage for new month
        status.aiInsightsUsed = 0
        status.lastResetDate = now.toISOString()
        localStorage.setItem(`premium_status_${userPrincipal}`, JSON.stringify(status))
      }

      return status
    }
  } catch (e) {
    console.error('Error reading premium status:', e)
  }

  // Return default status
  const defaultStatus: UserPremiumStatus = {
    tier: getUserTier(userPrincipal),
    aiInsightsUsed: 0,
    lastResetDate: new Date().toISOString()
  }

  localStorage.setItem(`premium_status_${userPrincipal}`, JSON.stringify(defaultStatus))
  return defaultStatus
}

/**
 * Check if user can perform an AI insight analysis
 */
export function canUseAIInsight(userPrincipal?: string): {
  allowed: boolean
  reason?: string
  remaining?: number
} {
  if (!userPrincipal) {
    return { allowed: false, reason: 'Please connect your wallet first' }
  }

  const status = getUserPremiumStatus(userPrincipal)
  const limits = TIER_LIMITS[status.tier]

  // Unlimited for enterprise
  if (limits.aiInsightsPerMonth === -1) {
    return { allowed: true }
  }

  // Check if user has remaining analyses
  if (status.aiInsightsUsed >= limits.aiInsightsPerMonth) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${limits.aiInsightsPerMonth} AI insights. Upgrade to Premium for more!`
    }
  }

  return {
    allowed: true,
    remaining: limits.aiInsightsPerMonth - status.aiInsightsUsed
  }
}

/**
 * Increment AI insight usage counter
 */
export function incrementAIInsightUsage(userPrincipal: string): void {
  if (typeof window === 'undefined') return

  try {
    const status = getUserPremiumStatus(userPrincipal)
    status.aiInsightsUsed += 1
    localStorage.setItem(`premium_status_${userPrincipal}`, JSON.stringify(status))
  } catch (e) {
    console.error('Error incrementing AI insight usage:', e)
  }
}

/**
 * Check if user can select a certain number of polls
 */
export function canSelectPolls(
  userPrincipal: string | undefined,
  selectedCount: number
): { allowed: boolean; reason?: string; max?: number } {
  if (!userPrincipal) {
    return { allowed: false, reason: 'Please connect your wallet first' }
  }

  const status = getUserPremiumStatus(userPrincipal)
  const limits = TIER_LIMITS[status.tier]

  // Unlimited for enterprise
  if (limits.maxPollsPerAnalysis === -1) {
    return { allowed: true }
  }

  if (selectedCount > limits.maxPollsPerAnalysis) {
    return {
      allowed: false,
      reason: `Maximum ${limits.maxPollsPerAnalysis} polls per analysis. Upgrade to Premium for more!`,
      max: limits.maxPollsPerAnalysis
    }
  }

  return { allowed: true, max: limits.maxPollsPerAnalysis }
}

/**
 * Get tier display name and benefits
 */
export function getTierInfo(tier: PremiumTier): {
  name: string
  price: string
  benefits: string[]
} {
  switch (tier) {
    case PremiumTier.FREE:
      return {
        name: 'Free',
        price: '$0/month',
        benefits: [
          '3 AI insights per month',
          'Analyze up to 5 polls',
          'Basic analytics'
        ]
      }
    case PremiumTier.PREMIUM:
      return {
        name: 'Premium',
        price: '$29/month',
        benefits: [
          '50 AI insights per month',
          'Analyze up to 20 polls',
          'Advanced analytics',
          'Export to PDF/Markdown',
          'Analysis history',
          'Priority support'
        ]
      }
    case PremiumTier.ENTERPRISE:
      return {
        name: 'Enterprise',
        price: 'Custom',
        benefits: [
          'Unlimited AI insights',
          'Unlimited polls per analysis',
          'Advanced analytics',
          'Export to PDF/Markdown',
          'Analysis history',
          'Dedicated support',
          'Custom integrations'
        ]
      }
  }
}
