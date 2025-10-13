"use client"

import { LiquidityDashboard } from '@/components/liquidity-dashboard'
import { useEffect } from 'react'
import { analytics } from '@/lib/analytics'

export default function LiquidityPage() {
  useEffect(() => {
    // Track page view
    analytics.track('page_viewed', {
      path: '/liquidity',
      page_title: 'Liquidity Pool'
    })
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <LiquidityDashboard />
    </div>
  )
}
