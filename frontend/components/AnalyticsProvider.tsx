'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { analytics } from '@/lib/analytics'

interface AnalyticsProviderProps {
  children: React.ReactNode
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname()

  useEffect(() => {
    // Initialize PostHog
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

    if (apiKey) {
      analytics.init(apiKey, apiHost)
    }
  }, [])

  useEffect(() => {
    // Track page views on route changes
    if (analytics.isInitialized()) {
      analytics.trackPageView(pathname, document.title)
    }
  }, [pathname])

  return <>{children}</>
}