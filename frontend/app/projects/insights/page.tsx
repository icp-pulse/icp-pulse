'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { PollSelector } from '@/components/insights/poll-selector'
import { InsightDisplay } from '@/components/insights/insight-display'
import { PremiumBadge } from '@/components/insights/premium-badge'
import { LoginButton } from '@/components/LoginButton'
import { ArrowLeft, Sparkles, Crown, Zap, TrendingUp, Target, Lightbulb, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getUserPremiumStatus, canUseAIInsight, incrementAIInsightUsage, getTierInfo, TIER_LIMITS, PremiumTier } from '@/lib/premium'
import type { Poll as BackendPoll } from '@/../../src/declarations/polls_surveys_backend/polls_surveys_backend.did'

interface Project {
  id: bigint
  name: string
  slug: string
}

interface Insights {
  overview: string
  keyFindings: string[]
  sentimentAnalysis: string
  trends: string[]
  recommendations: string[]
  pollBreakdowns: {
    pollTitle: string
    winningOption: string
    insights: string
  }[]
}

export default function ProjectInsightsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { identity, isAuthenticated } = useIcpAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [polls, setPolls] = useState<BackendPoll[]>([])
  const [selectedPollIds, setSelectedPollIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [userTier, setUserTier] = useState<PremiumTier>(PremiumTier.FREE)
  const [usageInfo, setUsageInfo] = useState<{ used: number; limit: number }>({ used: 0, limit: 3 })

  const projectId = searchParams.get('id')

  useEffect(() => {
    if (!projectId) {
      toast({
        title: 'Project ID missing',
        description: 'Please provide a valid project ID.',
        variant: 'destructive'
      })
      router.push('/projects')
      return
    }

    if (isAuthenticated && identity) {
      fetchData()
      updateUserStatus()
    } else {
      setLoading(false)
    }
  }, [projectId, identity, isAuthenticated])

  const updateUserStatus = () => {
    if (!identity) return

    const userPrincipal = identity.getPrincipal().toString()
    const status = getUserPremiumStatus(userPrincipal)
    setUserTier(status.tier)

    const limits = TIER_LIMITS[status.tier]
    setUsageInfo({
      used: status.aiInsightsUsed,
      limit: limits.aiInsightsPerMonth === -1 ? Infinity : limits.aiInsightsPerMonth
    })
  }

  const fetchData = async () => {
    if (!projectId) return

    try {
      setLoading(true)
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      // Fetch project details
      const projects = await backend.list_projects(0n, 100n)
      const foundProject = projects.find(p => p.id.toString() === projectId)

      if (!foundProject) {
        toast({
          title: 'Project not found',
          description: 'The requested project could not be found.',
          variant: 'destructive'
        })
        router.push('/projects')
        return
      }

      setProject(foundProject)

      // Fetch all polls for this project
      const pollSummaries = await backend.list_polls_by_project(BigInt(projectId), 0n, 100n)
      const pollDetails: BackendPoll[] = []

      for (const summary of pollSummaries) {
        const pollData = await backend.get_poll(summary.id)
        if (pollData && pollData.length > 0 && pollData[0]) {
          pollDetails.push(pollData[0])
        }
      }

      setPolls(pollDetails)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load project data. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!identity) {
      toast({
        title: 'Authentication required',
        description: 'Please connect your wallet to use AI insights.',
        variant: 'destructive'
      })
      return
    }

    if (selectedPollIds.length === 0) {
      toast({
        title: 'No polls selected',
        description: 'Please select at least one poll to analyze.',
        variant: 'destructive'
      })
      return
    }

    // Check usage limits
    const userPrincipal = identity.getPrincipal().toString()
    const canUse = canUseAIInsight(userPrincipal)

    if (!canUse.allowed) {
      setShowUpgradeDialog(true)
      return
    }

    try {
      setAnalyzing(true)

      // Prepare poll data
      const selectedPolls = polls.filter(p => selectedPollIds.includes(p.id.toString()))
      const pollsData = selectedPolls.map(poll => ({
        id: poll.id.toString(),
        title: poll.title,
        description: poll.description,
        options: poll.options.map(opt => ({
          text: opt.text,
          votes: Number(opt.votes)
        })),
        totalVotes: Number(poll.totalVotes),
        createdAt: poll.createdAt.toString(),
        closesAt: poll.closesAt.toString()
      }))

      // Call AI analysis API (same approach as ai-chatbox)
      const response = await fetch('/api/analyze-polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          polls: pollsData,
          projectName: project?.name,
          analysisType: userTier === PremiumTier.FREE ? 'standard' : 'advanced',
          userPrincipal
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed')
      }

      setInsights(result.insights)
      incrementAIInsightUsage(userPrincipal)
      updateUserStatus()

      toast({
        title: 'Analysis complete!',
        description: `Generated insights for ${selectedPollIds.length} poll${selectedPollIds.length > 1 ? 's' : ''}.`,
      })
    } catch (error) {
      console.error('Error analyzing polls:', error)
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to generate insights. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setAnalyzing(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <Sparkles className="w-16 h-16 text-blue-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
              AI Insights
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              Connect your wallet to access AI-powered poll analysis.
            </p>
            <LoginButton />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const tierInfo = getTierInfo(userTier)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/projects')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-blue-500" />
                AI Insights
              </h1>
              {project && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Analyzing polls for <span className="font-semibold">{project.name}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <PremiumBadge tier={userTier} size="lg" />
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Usage this month</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {usageInfo.used} / {usageInfo.limit === Infinity ? '∞' : usageInfo.limit}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Features Banner */}
        {userTier === PremiumTier.FREE && (
          <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-purple-500" />
                    Upgrade to Premium
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Get 50 AI insights per month, analyze up to 20 polls, export results, and unlock advanced analytics.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tierInfo.benefits.slice(0, 3).map((benefit, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  onClick={() => setShowUpgradeDialog(true)}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Poll Selection */}
          <div className="lg:col-span-1">
            <PollSelector
              polls={polls}
              selectedPollIds={selectedPollIds}
              onSelectionChange={setSelectedPollIds}
              userPrincipal={identity?.getPrincipal().toString()}
              loading={loading}
            />

            {/* Analyze Button */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing || selectedPollIds.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg"
                >
                  {analyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate AI Insights
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
                  {usageInfo.limit === Infinity
                    ? 'Unlimited analyses remaining'
                    : `${Math.max(0, usageInfo.limit - usageInfo.used)} analyses remaining this month`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Insights Display */}
          <div className="lg:col-span-2">
            {insights ? (
              <InsightDisplay
                insights={insights}
                projectName={project?.name}
                canExport={userTier !== PremiumTier.FREE}
              />
            ) : (
              <Card className="h-full">
                <CardContent className="flex flex-col items-center justify-center py-24">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                    <TrendingUp className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Analysis Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
                    Select polls from the left panel and click "Generate AI Insights" to get started.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 w-full max-w-2xl">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Target className="w-6 h-6 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Key Findings</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Data-driven insights</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Trends</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pattern analysis</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Lightbulb className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Recommendations</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Actionable advice</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-2xl">
              <Crown className="w-6 h-6 text-purple-500" />
              Upgrade to Premium
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              You've reached your monthly limit of {usageInfo.limit} AI insights. Upgrade to Premium for more!
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Free Tier */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <PremiumBadge tier={PremiumTier.FREE} size="md" />
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">$0</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">per month</p>
              </div>
              <ul className="mt-6 space-y-3">
                {getTierInfo(PremiumTier.FREE).benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Zap className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium Tier */}
            <div className="border-2 border-purple-500 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
              <div className="flex items-center justify-between">
                <PremiumBadge tier={PremiumTier.PREMIUM} size="md" />
                <Badge className="bg-green-500 text-white">Popular</Badge>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">$29</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">per month</p>
              </div>
              <ul className="mt-6 space-y-3">
                {getTierInfo(PremiumTier.PREMIUM).benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Crown className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Maybe Later</AlertDialogCancel>
            <AlertDialogAction className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
