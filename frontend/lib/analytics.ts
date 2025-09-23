import posthog from 'posthog-js'

export interface AnalyticsEvents {
  // Authentication events
  user_login: { method: 'internet_identity' }
  user_logout: Record<string, never>

  // Project events
  project_created: { project_id: string; project_name: string }
  project_viewed: { project_id: string }

  // Poll events
  poll_created: {
    poll_id: string
    project_id: string
    has_rewards: boolean
    reward_amount?: string
    option_count: number
  }
  poll_voted: {
    poll_id: string
    project_id: string
    option_id: string
    has_rewards: boolean
  }
  poll_viewed: { poll_id: string; project_id: string }
  poll_results_viewed: { poll_id: string; project_id: string }

  // Survey events
  survey_created: {
    survey_id: string
    project_id: string
    question_count: number
    has_rewards: boolean
    reward_amount?: string
    allow_anonymous: boolean
  }
  survey_submitted: {
    survey_id: string
    project_id: string
    question_count: number
    has_rewards: boolean
  }
  survey_viewed: { survey_id: string; project_id: string }

  // Reward events
  reward_claimed: {
    reward_id: string
    poll_id: string
    amount: string
    token_symbol: string
  }
  rewards_page_viewed: Record<string, never>

  // Navigation events
  page_viewed: { path: string; page_title?: string }

  // UI interaction events
  button_clicked: { button_name: string; page?: string }

  // Error events
  error_occurred: {
    error_type: string
    error_message: string
    component?: string
    action?: string
  }
}

class Analytics {
  private initialized = false

  init(apiKey: string, apiHost?: string) {
    if (typeof window === 'undefined' || this.initialized) return

    posthog.init(apiKey, {
      api_host: apiHost || 'https://app.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // We'll handle this manually
      capture_pageleave: true,
      cross_subdomain_cookie: false,
    })

    this.initialized = true
  }

  identify(userId: string, properties?: Record<string, any>) {
    if (!this.initialized) return
    posthog.identify(userId, properties)
  }

  track<K extends keyof AnalyticsEvents>(
    event: K,
    properties: AnalyticsEvents[K]
  ) {
    if (!this.initialized) return
    posthog.capture(event, properties)
  }

  trackPageView(path: string, title?: string) {
    if (!this.initialized) return
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      path,
      page_title: title
    })
  }

  setUserProperties(properties: Record<string, any>) {
    if (!this.initialized) return
    posthog.setPersonProperties(properties)
  }

  reset() {
    if (!this.initialized) return
    posthog.reset()
  }

  isInitialized() {
    return this.initialized
  }
}

export const analytics = new Analytics()