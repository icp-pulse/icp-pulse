'use client'

import { Badge } from '@/components/ui/badge'
import { Crown, Zap } from 'lucide-react'
import { PremiumTier } from '@/lib/premium'

interface PremiumBadgeProps {
  tier: PremiumTier
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function PremiumBadge({ tier, size = 'md', showIcon = true }: PremiumBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  if (tier === PremiumTier.FREE) {
    return (
      <Badge
        variant="outline"
        className={`${sizeClasses[size]} bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300`}
      >
        {showIcon && <Zap className={`${iconSizes[size]} mr-1`} />}
        Free
      </Badge>
    )
  }

  if (tier === PremiumTier.PREMIUM) {
    return (
      <Badge
        className={`${sizeClasses[size]} bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0`}
      >
        {showIcon && <Crown className={`${iconSizes[size]} mr-1`} />}
        Premium
      </Badge>
    )
  }

  if (tier === PremiumTier.ENTERPRISE) {
    return (
      <Badge
        className={`${sizeClasses[size]} bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0`}
      >
        {showIcon && <Crown className={`${iconSizes[size]} mr-1`} />}
        Enterprise
      </Badge>
    )
  }

  return null
}
