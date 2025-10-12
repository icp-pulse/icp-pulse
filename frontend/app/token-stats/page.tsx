"use client"

import { TokenStatsDashboard } from '@/components/token-stats-dashboard'
import { useEffect } from 'react'
import { analytics } from '@/lib/analytics'

export default function TokenStatsPage() {
  useEffect(() => {
    // Track page view
    analytics.track('page_viewed', {
      path: '/token-stats',
      page_title: 'Token Statistics'
    })
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <TokenStatsDashboard />
    </div>
  )
}
