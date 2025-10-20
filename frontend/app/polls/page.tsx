'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { LoginButton } from '@/components/LoginButton'
import { useRouter } from 'next/navigation'
import { Clock, Users, Vote, CheckCircle, BarChart3, Search, Filter, TrendingUp, Grid, List, Plus, ArrowUpDown, Flame, Star, Eye, Wallet, User } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { analytics } from '@/lib/analytics'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

// Use the actual backend types
import type { Poll as BackendPoll, PollSummary } from '@/../../src/declarations/polls_surveys_backend/polls_surveys_backend.did'

interface Project {
  id: bigint
  name: string
  slug: string
  status: string
}

export default function PollsPage() {
  const [polls, setPolls] = useState<BackendPoll[]>([])
  const [filteredPolls, setFilteredPolls] = useState<BackendPoll[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [votingPoll, setVotingPoll] = useState<bigint | null>(null)
  const [votingOption, setVotingOption] = useState<bigint | null>(null)
  const [openVoteDialog, setOpenVoteDialog] = useState<bigint | null>(null)
  const [voteSuccessDialog, setVoteSuccessDialog] = useState<bigint | null>(null)
  const [voteSuccess, setVoteSuccess] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [projectFilter, setProjectFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')
  const [userVotes, setUserVotes] = useState<Record<string, bigint>>({}) // pollId -> optionId mapping
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const { identity, isAuthenticated } = useIcpAuth()
  const router = useRouter()

  useEffect(() => {
    fetchData(0)
    // Load user votes from localStorage
    const storedVotes = localStorage.getItem(`userVotes_${identity?.getPrincipal().toString()}`)
    if (storedVotes) {
      try {
        const parsed = JSON.parse(storedVotes)
        // Convert string option IDs back to bigint
        const votesMap: Record<string, bigint> = {}
        Object.keys(parsed).forEach(pollId => {
          votesMap[pollId] = BigInt(parsed[pollId])
        })
        setUserVotes(votesMap)
      } catch (e) {
        console.error('Error loading user votes from localStorage:', e)
      }
    }
  }, [identity, isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async (pageNum: number = 0) => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      if (pageNum === 0) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      // Fetch projects first (only on initial load)
      if (pageNum === 0) {
        const projectData = await backend.list_projects(0n, 100n)
        setProjects(projectData)
      }

      // Pagination settings
      const POLLS_PER_PAGE = 15
      const offset = BigInt(pageNum * POLLS_PER_PAGE)

      // Fetch polls with pagination
      let newPolls: BackendPoll[] = []
      const pollIdsSet = new Set<string>() // Track unique poll IDs to avoid duplicates
      const currentProjects = pageNum === 0 ? await backend.list_projects(0n, 100n) : projects

      // First, fetch user's own polls (including unassociated ones)
      try {
        const myPollSummaries = await backend.list_my_polls(offset, BigInt(POLLS_PER_PAGE))
        for (const pollSummary of myPollSummaries) {
          const pollIdStr = pollSummary.id.toString()
          if (!pollIdsSet.has(pollIdStr)) {
            const poll = await backend.get_poll(pollSummary.id)
            if (poll && poll.length > 0 && poll[0]) {
              newPolls.push(poll[0])
              pollIdsSet.add(pollIdStr)
            }
          }
          if (newPolls.length >= POLLS_PER_PAGE) break
        }
      } catch (err) {
        console.error('Error fetching user polls:', err)
      }

      // Then, fetch polls from projects (if we still need more)
      if (newPolls.length < POLLS_PER_PAGE) {
        for (const project of currentProjects) {
          try {
            const projectPolls = await backend.list_polls_by_project(project.id, offset, BigInt(POLLS_PER_PAGE))

            // Get detailed poll information
            for (const pollSummary of projectPolls) {
              const pollIdStr = pollSummary.id.toString()
              // Only add if we haven't seen this poll yet
              if (!pollIdsSet.has(pollIdStr)) {
                const poll = await backend.get_poll(pollSummary.id)
                if (poll && poll.length > 0 && poll[0]) {
                  newPolls.push(poll[0])
                  pollIdsSet.add(pollIdStr)
                }
              }

              // Stop if we've reached the desired number of polls for this page
              if (newPolls.length >= POLLS_PER_PAGE) break
            }

            // Stop fetching from other projects if we have enough polls
            if (newPolls.length >= POLLS_PER_PAGE) break
          } catch (err) {
            console.error(`Error fetching polls for project ${project.id}:`, err)
          }
        }
      }

      // Update state
      if (pageNum === 0) {
        setPolls(newPolls)
        setFilteredPolls(newPolls)
      } else {
        setPolls(prev => [...prev, ...newPolls])
      }

      // Check if there are more polls to load
      setHasMore(newPolls.length === POLLS_PER_PAGE)

      // Track page view (only on initial load)
      if (pageNum === 0) {
        analytics.track('page_viewed', {
          path: '/polls',
          page_title: 'Browse Polls'
        })
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load polls')

      analytics.track('error_occurred', {
        error_type: 'polls_load_failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
        component: 'PollsPage',
        action: 'fetch_data'
      })
    } finally {
      if (pageNum === 0) {
        setLoading(false)
      } else {
        setLoadingMore(false)
      }
    }
  }

  // Refresh a single poll after voting
  const refreshSinglePoll = async (pollId: bigint) => {
    try {
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      const pollData = await backend.get_poll(pollId)
      if (pollData && pollData.length > 0 && pollData[0]) {
        setPolls(prevPolls => prevPolls.map(poll =>
          poll.id === pollId ? pollData[0] : poll
        ))
      }
    } catch (err) {
      console.error('Error refreshing poll:', err)
    }
  }

  // Filter and sort polls
  useEffect(() => {
    let filtered = [...polls]

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(poll =>
        poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poll.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(poll => {
        const isActive = 'active' in poll.status
        const hasEnded = isPollEnded(poll)

        if (statusFilter === 'active') {
          // For active filter, show only polls that are status=active AND haven't ended by time
          return isActive && !hasEnded
        } else {
          // For closed filter, show polls that are status=closed OR have ended by time
          return !isActive || hasEnded
        }
      })
    }

    // Apply project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(poll => poll.scopeId.toString() === projectFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'votes':
          return Number(b.totalVotes) - Number(a.totalVotes)
        case 'recent':
          return Number(b.createdAt) - Number(a.createdAt)
        case 'ending':
          return Number(a.closesAt) - Number(b.closesAt)
        case 'rewards':
          return Number(b.rewardFund) - Number(a.rewardFund)
        default:
          return 0
      }
    })

    setFilteredPolls(filtered)
  }, [polls, searchQuery, statusFilter, projectFilter, sortBy])

  // Intersection Observer for infinite scroll
  const observerTarget = useRef(null)

  useEffect(() => {
    if (!hasMore || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setPage(prev => prev + 1)
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loadingMore])

  // Load more when page changes
  useEffect(() => {
    if (page > 0) {
      fetchData(page)
    }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVote = async (pollId: bigint, optionId: bigint) => {
    if (!isAuthenticated || votingPoll) return

    try {
      setVotingPoll(pollId)
      setVotingOption(optionId)
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      // Get fresh poll data to verify current state
      const currentPoll = polls.find(p => p.id === pollId)
      if (!currentPoll) {
        throw new Error('Poll not found')
      }

      // Check if user has already voted
      const userPrincipal = identity?.getPrincipal().toString()
      const hasVoted = currentPoll.voterPrincipals.some(
        principal => principal.toString() === userPrincipal
      )

      if (hasVoted) {
        setError('You have already voted on this poll.')
        setOpenVoteDialog(null)
        toast({
          title: "✗ Already voted",
          description: "You have already cast your vote on this poll. Each user can only vote once.",
          variant: "destructive",
          className: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
          duration: 5000,
        })
        setVotingPoll(null)
        setVotingOption(null)
        return
      }

      // Check if poll is still active
      const isActive = 'active' in currentPoll.status
      if (!isActive) {
        setError('This poll has ended and is no longer accepting votes.')
        setOpenVoteDialog(null)
        toast({
          title: "✗ Poll ended",
          description: "This poll has ended and is no longer accepting votes.",
          variant: "destructive",
          className: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
          duration: 5000,
        })
        setVotingPoll(null)
        setVotingOption(null)
        return
      }

      // Check if poll has reached max responses
      if (currentPoll.config && currentPoll.config.length > 0) {
        const config = currentPoll.config[0]
        if (config && config.maxResponses && config.maxResponses.length > 0) {
          const maxResponses = config.maxResponses[0]
          if (maxResponses !== undefined && currentPoll.totalVotes >= maxResponses) {
            setError('This poll has reached its maximum number of responses.')
            setOpenVoteDialog(null)
            toast({
              title: "✗ Poll full",
              description: "This poll has reached its maximum number of responses and is no longer accepting votes.",
              variant: "destructive",
              className: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
              duration: 5000,
            })
            setVotingPoll(null)
            setVotingOption(null)
            return
          }
        }
      }

      // Add detailed logging for debugging
      console.log('=== Vote Submission Debug Info ===')
      console.log('Backend actor:', backend)
      console.log('Poll ID:', pollId, 'Type:', typeof pollId)
      console.log('Option ID:', optionId, 'Type:', typeof optionId)
      console.log('Current poll data:', currentPoll)

      // Try vote_v2 first (with detailed errors), fallback to vote if not available
      let voteResult
      let success = false
      let errorMessage = ''

      try {
        // Use vote_v2 which returns Result<Text, Text> with detailed error messages
        if (typeof backend.vote_v2 === 'function') {
          console.log('Using vote_v2 for detailed error messages')
          voteResult = await backend.vote_v2(pollId, optionId)
          console.log('vote_v2 response:', voteResult)

          if ('ok' in voteResult) {
            success = true
            console.log('Vote successful:', voteResult.ok)
          } else if ('err' in voteResult) {
            errorMessage = voteResult.err
            console.error('Vote failed with error:', errorMessage)
          }
        } else {
          // Fallback to original vote function
          console.log('Using original vote function')
          success = await backend.vote(pollId, optionId)
          console.log('Vote response:', success, 'Type:', typeof success)
        }
      } catch (voteError) {
        console.error('Vote call threw an error:', voteError)
        throw voteError // Re-throw to be caught by outer try/catch
      }

      if (success) {
        // Save vote to localStorage and state
        const pollIdStr = pollId.toString()
        const newVotes = { ...userVotes, [pollIdStr]: optionId }
        setUserVotes(newVotes)

        // Save to localStorage (convert bigints to strings for JSON)
        const votesToStore: Record<string, string> = {}
        Object.keys(newVotes).forEach(key => {
          votesToStore[key] = newVotes[key].toString()
        })
        localStorage.setItem(`userVotes_${identity?.getPrincipal().toString()}`, JSON.stringify(votesToStore))

        // Optimistically update local state
        setPolls(prevPolls => prevPolls.map(poll => {
          if (poll.id === pollId) {
            const updatedOptions = poll.options.map(opt =>
              opt.id === optionId
                ? { ...opt, votes: opt.votes + 1n }
                : opt
            )
            const userPrincipalObj = identity?.getPrincipal()
            return {
              ...poll,
              options: updatedOptions,
              totalVotes: poll.totalVotes + 1n,
              voterPrincipals: userPrincipalObj
                ? [...poll.voterPrincipals, userPrincipalObj]
                : poll.voterPrincipals
            }
          }
          return poll
        }))

        // Refresh poll data in the background
        refreshSinglePoll(pollId)

        // Show success state in the current dialog
        setVoteSuccess(true)

        analytics.track('poll_voted', {
          poll_id: pollId.toString(),
          project_id: currentPoll.scopeId.toString(),
          option_id: optionId.toString(),
          has_rewards: Number(currentPoll.rewardFund) > 0,
        })
      } else {
        // Vote returned false - fetch latest poll state to diagnose
        console.log('=== Vote Failed - Fetching Latest Poll State ===')
        try {
          const latestPollData = await backend.get_poll(pollId)
          console.log('Latest poll data from backend:', latestPollData)

          if (latestPollData && latestPollData.length > 0 && latestPollData[0]) {
            const latestPoll = latestPollData[0]
            console.log('Poll status:', latestPoll.status)
            console.log('Poll closesAt:', latestPoll.closesAt, 'Current time (ns):', BigInt(Date.now()) * 1_000_000n)
            console.log('Poll totalVotes:', latestPoll.totalVotes)
            console.log('Voter principals:', latestPoll.voterPrincipals.map((p: any) => p.toString()))
            console.log('User principal:', identity?.getPrincipal().toString())
            console.log('Poll fundingInfo:', latestPoll.fundingInfo)
          } else {
            console.log('Poll not found in backend')
          }
        } catch (pollFetchError) {
          console.error('Error fetching poll state:', pollFetchError)
        }

        // Display the detailed error message from vote_v2 or a generic message
        const displayError = errorMessage || 'Failed to vote. Please refresh the page and try again.'
        setError(displayError)
        setOpenVoteDialog(null)
        toast({
          title: "✗ Vote failed",
          description: errorMessage || "Unable to submit your vote. Please check the browser console for details, then refresh the page and try again.",
          variant: "destructive",
          className: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
          duration: 8000,
        })

        // Refresh to get latest state
        await refreshSinglePoll(pollId)
      }
    } catch (err) {
      console.error('Error voting:', err)
      setError('An unexpected error occurred. Please try again.')
      setOpenVoteDialog(null)
      toast({
        title: "✗ Error",
        description: err instanceof Error ? err.message : "An unexpected error occurred while submitting your vote.",
        variant: "destructive",
        className: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
        duration: 5000,
      })
    } finally {
      setVotingPoll(null)
      setVotingOption(null)
    }
  }

  const formatTimeLeft = (closesAt: bigint) => {
    const now = BigInt(Date.now()) * 1_000_000n // Convert to nanoseconds
    const timeLeft = Number(closesAt - now)
    
    if (timeLeft <= 0) return 'Ended'
    
    const days = Math.floor(timeLeft / (1_000_000 * 1000 * 60 * 60 * 24))
    const hours = Math.floor((timeLeft % (1_000_000 * 1000 * 60 * 60 * 24)) / (1_000_000 * 1000 * 60 * 60))
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`
    return 'Less than 1 hour left'
  }

  const getProject = (scopeId: bigint) => {
    return projects.find(p => p.id === scopeId)
  }

  const hasUserVoted = (poll: BackendPoll) => {
    return poll.voterPrincipals.some(principal => principal.toString() === identity?.getPrincipal().toString())
  }

  const isPollEnded = (poll: BackendPoll) => {
    const now = BigInt(Date.now()) * 1_000_000n // Convert to nanoseconds
    return now >= poll.closesAt
  }

  const getVotePercentage = (votes: bigint, totalVotes: bigint) => {
    return totalVotes > 0n ? Math.round((Number(votes) / Number(totalVotes)) * 100) : 0
  }

  const getTrendingPolls = () => {
    return [...filteredPolls]
      .sort((a, b) => Number(b.totalVotes) - Number(a.totalVotes))
      .slice(0, 5)
  }

  const getPercentageChange = (poll: BackendPoll) => {
    // Mock percentage change for demonstration
    const changes = ['+12.5%', '+8.3%', '-2.1%', '+25.7%', '+4.2%', '-1.8%']
    return changes[Number(poll.id) % changes.length]
  }

  const getVolumeChange = (poll: BackendPoll) => {
    // Mock volume change for demonstration
    const volumes = ['+127%', '+89%', '-15%', '+234%', '+67%', '-8%']
    return volumes[Number(poll.id) % volumes.length]
  }

  const formatTimeAgo = (timestamp: bigint) => {
    const now = Date.now()
    const createdAt = Number(timestamp) / 1_000_000 // Convert nanoseconds to milliseconds
    const diffMs = now - createdAt
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  const formatPrincipal = (principal: any) => {
    const principalStr = principal.toString()
    if (principalStr.length <= 12) return principalStr
    return `${principalStr.slice(0, 6)}...${principalStr.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Card className="shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-12 px-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
                Connect Your Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Please connect your wallet to view and participate in community polls.
              </p>
              <LoginButton />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Browse Polls</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Discover and participate in community polls
              </p>
            </div>
            <Button
              onClick={() => router.push('/polls/new')}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Poll
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Active Polls</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {polls.filter(p => 'active' in p.status).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-200 dark:bg-blue-800/50 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Voted Today</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {polls.filter(p => hasUserVoted(p)).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-200 dark:bg-green-800/50 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Points Earned</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {polls.filter(p => hasUserVoted(p)).reduce((acc, p) => acc + (p.fundingInfo && p.fundingInfo.length > 0 && p.fundingInfo[0] ? Number(p.fundingInfo[0].rewardPerResponse) / Math.pow(10, p.fundingInfo[0].tokenDecimals) : 0), 0).toFixed(0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-200 dark:bg-purple-800/50 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Streak</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                      {polls.filter(p => hasUserVoted(p)).length > 0 ? '1' : '0'} 🔥
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-200 dark:bg-orange-800/50 rounded-full flex items-center justify-center">
                    <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Navigation */}
          <Tabs value="trending" className="w-full">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <TabsList className="bg-transparent p-0 space-x-4 sm:space-x-8 overflow-x-auto">
                <TabsTrigger
                  value="trending"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-2 whitespace-nowrap"
                >
                  <Flame className="h-4 w-4 mr-2" />
                  Trending
                </TabsTrigger>
                <TabsTrigger
                  value="watchlist"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-2 whitespace-nowrap"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Watchlist
                </TabsTrigger>
                <TabsTrigger
                  value="voted"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-2 whitespace-nowrap"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Voted
                </TabsTrigger>
              </TabsList>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search polls..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-48 md:w-64 bg-white dark:bg-gray-800"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32 bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-full sm:w-40 bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id.toString()} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="trending" className="space-y-6">
              {/* Trending Polls Header */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  Trending Polls
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Aggregated from {polls.length} active polls.
                </p>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="votes">Top Volume</SelectItem>
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="ending">Ending Soon</SelectItem>
                        <SelectItem value="rewards">Highest Rewards</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-500">
                      {filteredPolls.length} polls
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">{error}</p>
                  <Button variant="ghost" onClick={() => setError(null)} className="mt-2">
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Polls Table/Grid */}
              {filteredPolls.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Vote className="w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No Polls Found</h3>
                    <p className="text-gray-500 text-center mb-4">
                      {polls.length === 0
                        ? "There are no active polls at the moment. Check back later or create your own poll."
                        : "No polls match your current filters. Try adjusting your search criteria."
                      }
                    </p>
                    <Button onClick={() => router.push('/polls/new')}>
                      Create First Poll
                    </Button>
                  </CardContent>
                </Card>
              ) : viewMode === 'table' ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b bg-gray-50 dark:bg-gray-900/50">
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>Poll</TableHead>
                        <TableHead className="text-right">Votes (24h)</TableHead>
                        <TableHead className="text-right">Total Votes</TableHead>
                        <TableHead className="text-right">Volume Change</TableHead>
                        <TableHead className="text-right">Rewards</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPolls.map((poll, index) => {
                        const project = getProject(poll.scopeId)
                        const userVoted = hasUserVoted(poll)
                        const isActive = 'active' in poll.status
                        const timeLeft = formatTimeLeft(poll.closesAt)
                        const isVoting = votingPoll === poll.id
                        const percentageChange = getPercentageChange(poll)
                        const volumeChange = getVolumeChange(poll)

                        return (
                          <TableRow key={poll.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <TableCell className="text-center font-medium text-gray-500">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">
                                    {poll.title.slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {poll.title}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center gap-2">
                                    {project?.name && (
                                      <Badge variant="outline" className="text-xs">
                                        {project.name}
                                      </Badge>
                                    )}
                                    {userVoted && (
                                      <Badge variant="secondary" className="text-xs">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Voted
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-medium">{Number(poll.totalVotes)}</div>
                              <div className={`text-sm ${percentageChange.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                {percentageChange}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {Number(poll.totalVotes)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`text-sm font-medium ${volumeChange.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                {volumeChange}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {poll.fundingInfo && poll.fundingInfo.length > 0 && poll.fundingInfo[0] ? (
                                <div>
                                  <div className="font-medium text-green-600">
                                    {(Number(poll.fundingInfo[0].totalFund) / Math.pow(10, poll.fundingInfo[0].tokenDecimals)).toFixed(2)} {poll.fundingInfo[0].tokenSymbol}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {(Number(poll.fundingInfo[0].remainingFund) / Math.pow(10, poll.fundingInfo[0].tokenDecimals)).toFixed(2)} left
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">No rewards</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="space-y-1">
                                <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                                  {isActive ? 'Active' : 'Closed'}
                                </Badge>
                                <div className="text-xs text-gray-500">
                                  {timeLeft}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isActive && !userVoted ? (
                                <AlertDialog open={openVoteDialog === poll.id} onOpenChange={(open) => {
                                  if (!open) {
                                    setOpenVoteDialog(null)
                                    setVotingOption(null)
                                    setVoteSuccess(false)
                                  } else {
                                    setOpenVoteDialog(poll.id)
                                  }
                                }}>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      disabled={isVoting}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      <Vote className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    {!voteSuccess ? (
                                      <>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Vote on: {poll.title}</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Choose your option:
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="space-y-2">
                                          {poll.options.map((option) => {
                                            const isVotingThis = votingOption === option.id
                                            return (
                                              <Button
                                                key={option.id}
                                                variant="outline"
                                                onClick={() => handleVote(poll.id, option.id)}
                                                disabled={!!votingPoll}
                                                className="w-full justify-start"
                                              >
                                                {isVotingThis && (
                                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                                )}
                                                {option.text}
                                              </Button>
                                            )
                                          })}
                                        </div>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel
                                            disabled={votingPoll === poll.id}
                                            onClick={() => {
                                              setOpenVoteDialog(null)
                                              setVotingOption(null)
                                              setVoteSuccess(false)
                                            }}
                                          >
                                            Cancel
                                          </AlertDialogCancel>
                                        </AlertDialogFooter>
                                      </>
                                    ) : (
                                      <>
                                        <AlertDialogHeader>
                                          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                                          </div>
                                          <AlertDialogTitle className="text-center text-xl">Vote Submitted Successfully!</AlertDialogTitle>
                                          <AlertDialogDescription className="text-center">
                                            Your vote has been recorded on the blockchain. What would you like to do next?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                                          <AlertDialogAction
                                            onClick={() => {
                                              router.push(`/results?pollId=${poll.id}`)
                                              setOpenVoteDialog(null)
                                              setVotingOption(null)
                                              setVoteSuccess(false)
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                                          >
                                            <BarChart3 className="w-4 h-4 mr-2" />
                                            View Results
                                          </AlertDialogAction>
                                          <AlertDialogCancel
                                            onClick={() => {
                                              setOpenVoteDialog(null)
                                              setVotingOption(null)
                                              setVoteSuccess(false)
                                            }}
                                            className="w-full sm:w-auto mt-0"
                                          >
                                            <Vote className="w-4 w-4 mr-2" />
                                            Vote on Another Poll
                                          </AlertDialogCancel>
                                        </AlertDialogFooter>
                                      </>
                                    )}
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/results?pollId=${poll.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPolls.map((poll) => {
                    const project = getProject(poll.scopeId)
                    const userVoted = hasUserVoted(poll)
                    const isActive = 'active' in poll.status
                    const timeLeft = formatTimeLeft(poll.closesAt)
                    const timeAgo = formatTimeAgo(poll.createdAt)
                    const creatorShort = formatPrincipal(poll.createdBy)

                    return (
                      <Card key={poll.id} className={`overflow-hidden hover:shadow-lg transition-shadow ${
                        userVoted ? 'border-green-300 dark:border-green-700 bg-gradient-to-br from-green-50/30 to-transparent dark:from-green-900/10 dark:to-transparent' : ''
                      }`}>
                        {/* Creator Header */}
                        <CardHeader className="pb-3 border-b">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                                  <User className="w-5 h-5" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                  {creatorShort}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{timeAgo}</span>
                                  {project && (
                                    <>
                                      <span>•</span>
                                      <span>{project.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                                {isActive ? 'Active' : 'Closed'}
                              </Badge>
                              {userVoted && (
                                <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Voted
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        {/* Poll Content */}
                        <CardContent className="pt-4">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {poll.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                            {poll.description}
                          </p>

                          {/* Poll Options */}
                          <div className="space-y-3 mb-4">
                            {poll.options.map((option) => {
                              const percentage = getVotePercentage(option.votes, poll.totalVotes)
                              const userVotedOptionId = userVotes[poll.id.toString()]
                              const userVotedThis = userVoted && userVotedOptionId === option.id

                              // Determine if this is the leading option
                              const maxVotes = Math.max(...poll.options.map(o => Number(o.votes)))
                              const isLeading = Number(option.votes) === maxVotes && maxVotes > 0

                              return (
                                <div
                                  key={option.id}
                                  className={`p-3 rounded-lg border transition-all ${
                                    isActive && !userVoted ? 'cursor-pointer' : 'cursor-default'
                                  } ${
                                    userVotedThis
                                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                  }`}
                                  onClick={() => {
                                    if (isActive && !userVoted) {
                                      setOpenVoteDialog(poll.id)
                                      setVotingOption(option.id)
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {option.text}
                                      </span>
                                      {userVotedThis && (
                                        <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                      )}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                      {percentage}%
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Custom bar chart with dynamic colors */}
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden flex-1">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          userVotedThis
                                            ? 'bg-blue-500 dark:bg-blue-600'
                                            : isLeading && poll.totalVotes > 0n
                                              ? 'bg-green-500 dark:bg-green-600'
                                              : 'bg-gray-400 dark:bg-gray-500'
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-500 min-w-[60px] text-right">
                                      {Number(option.votes)} votes
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Footer Stats and Actions */}
                          <div className="flex items-center justify-between pt-3 border-t">
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{Number(poll.totalVotes)} votes</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{timeLeft}</span>
                              </div>
                              {poll.fundingInfo && poll.fundingInfo.length > 0 && poll.fundingInfo[0] && (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                                  <Star className="w-4 h-4" />
                                  <span>
                                    {(Number(poll.fundingInfo[0].rewardPerResponse) / Math.pow(10, poll.fundingInfo[0].tokenDecimals)).toFixed(2)} {poll.fundingInfo[0].tokenSymbol}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              {isActive && !userVoted ? (
                                <AlertDialog open={openVoteDialog === poll.id && votingOption !== null} onOpenChange={(open) => {
                                  if (!open) {
                                    setOpenVoteDialog(null)
                                    setVotingOption(null)
                                    setVoteSuccess(false)
                                  }
                                }}>
                                  <AlertDialogContent>
                                    {!voteSuccess ? (
                                      <>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Confirm your vote</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to vote for this option? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel
                                            disabled={votingPoll === poll.id}
                                            onClick={() => {
                                              setOpenVoteDialog(null)
                                              setVotingOption(null)
                                              setVoteSuccess(false)
                                            }}
                                          >
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => {
                                              if (votingOption !== null) {
                                                handleVote(poll.id, votingOption)
                                              }
                                            }}
                                            disabled={votingPoll === poll.id}
                                            className="bg-blue-600 hover:bg-blue-700"
                                          >
                                            {votingPoll === poll.id ? (
                                              <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Submitting...
                                              </>
                                            ) : (
                                              'Confirm Vote'
                                            )}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </>
                                    ) : (
                                      <>
                                        <AlertDialogHeader>
                                          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                                          </div>
                                          <AlertDialogTitle className="text-center text-xl">Vote Submitted Successfully!</AlertDialogTitle>
                                          <AlertDialogDescription className="text-center">
                                            Your vote has been recorded on the blockchain. What would you like to do next?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                                          <AlertDialogAction
                                            onClick={() => {
                                              router.push(`/results?pollId=${poll.id}`)
                                              setOpenVoteDialog(null)
                                              setVotingOption(null)
                                              setVoteSuccess(false)
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                                          >
                                            <BarChart3 className="w-4 h-4 mr-2" />
                                            View Results
                                          </AlertDialogAction>
                                          <AlertDialogCancel
                                            onClick={() => {
                                              setOpenVoteDialog(null)
                                              setVotingOption(null)
                                              setVoteSuccess(false)
                                            }}
                                            className="w-full sm:w-auto mt-0"
                                          >
                                            <Vote className="w-4 w-4 mr-2" />
                                            Vote on Another Poll
                                          </AlertDialogCancel>
                                        </AlertDialogFooter>
                                      </>
                                    )}
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : userVoted ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/results?pollId=${poll.id}`)}
                                  className="border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/results?pollId=${poll.id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Results
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {/* Infinite scroll sentinel and loading indicator */}
                  {hasMore && (
                    <div ref={observerTarget} className="col-span-full flex justify-center py-8">
                      {loadingMore && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                          <span>Loading more polls...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="watchlist">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Star className="w-16 h-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Watchlist Coming Soon</h3>
                  <p className="text-gray-500 text-center">
                    Save your favorite polls to keep track of them easily.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voted">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-gray-50 dark:bg-gray-900/50">
                      <TableHead>Poll</TableHead>
                      <TableHead className="text-right">Your Vote</TableHead>
                      <TableHead className="text-right">Total Votes</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPolls.filter(poll => hasUserVoted(poll)).map((poll) => {
                      const project = getProject(poll.scopeId)
                      const isActive = 'active' in poll.status
                      const timeLeft = formatTimeLeft(poll.closesAt)

                      return (
                        <TableRow key={poll.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {poll.title}
                                </div>
                                {project && (
                                  <div className="text-sm text-gray-500">{project.name}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">Submitted</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {Number(poll.totalVotes)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="space-y-1">
                              <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                                {isActive ? 'Active' : 'Closed'}
                              </Badge>
                              <div className="text-xs text-gray-500">
                                {timeLeft}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/results?pollId=${poll.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Vote Success Dialog */}
        <AlertDialog open={voteSuccessDialog !== null} onOpenChange={(open) => !open && setVoteSuccessDialog(null)}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <AlertDialogTitle className="text-center text-xl">Vote Submitted Successfully!</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Your vote has been recorded on the blockchain. What would you like to do next?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
              <AlertDialogAction
                onClick={() => {
                  if (voteSuccessDialog) {
                    router.push(`/results?pollId=${voteSuccessDialog}`)
                  }
                  setVoteSuccessDialog(null)
                }}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Results
              </AlertDialogAction>
              <AlertDialogCancel className="w-full sm:w-auto mt-0">
                <Vote className="w-4 h-4 mr-2" />
                Vote on Another Poll
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
