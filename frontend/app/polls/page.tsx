'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter } from 'next/navigation'
import { Clock, Users, Vote, CheckCircle, BarChart3, Search, Filter, TrendingUp, Grid, List, Plus, ArrowUpDown, Flame, Star, Eye } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { analytics } from '@/lib/analytics'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const { identity, isAuthenticated } = useIcpAuth()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [identity, isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    if (!isAuthenticated) return
    
    try {
      setLoading(true)
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })
      
      // Fetch projects first
      const projectData = await backend.list_projects(0n, 100n)
      setProjects(projectData)
      
      // Fetch polls from all projects
      let allPolls: BackendPoll[] = []
      for (const project of projectData) {
        try {
          const projectPolls = await backend.list_polls_by_project(project.id, 0n, 50n)
          
          // Get detailed poll information
          for (const pollSummary of projectPolls) {
            const poll = await backend.get_poll(pollSummary.id)
            if (poll && poll.length > 0 && poll[0]) {
              allPolls.push(poll[0])
            }
          }
        } catch (err) {
          console.error(`Error fetching polls for project ${project.id}:`, err)
        }
      }
      
      setPolls(allPolls)
      setFilteredPolls(allPolls)

      // Track page view
      analytics.track('page_viewed', {
        path: '/polls',
        page_title: 'Browse Polls'
      })
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
      setLoading(false)
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
        return statusFilter === 'active' ? isActive : !isActive
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

  const handleVote = async (pollId: bigint, optionId: bigint) => {
    if (!identity || votingPoll) return
    
    try {
      setVotingPoll(pollId)
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })
      
      const success = await backend.vote(pollId, optionId)
      
      if (success) {
        // Refresh the poll data
        await fetchData()
        toast({
          title: "Vote submitted!",
          description: "Your vote has been recorded successfully.",
          duration: 3000,
        })
      } else {
        setError('Failed to vote. You may have already voted on this poll.')
        toast({
          title: "Vote failed",
          description: "You may have already voted on this poll or the poll has ended.",
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (err) {
      console.error('Error voting:', err)
      setError('Failed to submit vote')
      toast({
        title: "Error",
        description: "An unexpected error occurred while submitting your vote.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setVotingPoll(null)
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-4">Browse Polls</h1>
          <p className="text-gray-600 dark:text-gray-400">Please login to view and vote on polls.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Browse Polls</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Discover and participate in community polls
              </p>
            </div>
            <Button
              onClick={() => router.push('/polls/new')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Poll
            </Button>
          </div>

          {/* Tabs Navigation */}
          <Tabs value="trending" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="bg-transparent p-0 space-x-8">
                <TabsTrigger
                  value="trending"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-2"
                >
                  <Flame className="h-4 w-4 mr-2" />
                  Trending
                </TabsTrigger>
                <TabsTrigger
                  value="watchlist"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-2"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Watchlist
                </TabsTrigger>
                <TabsTrigger
                  value="voted"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-2"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Voted
                </TabsTrigger>
              </TabsList>

              {/* Search and Filters */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by poll title or description"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 bg-white dark:bg-gray-800"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-40 bg-white dark:bg-gray-800">
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
                              {Number(poll.rewardFund) > 0 ? (
                                <div className="font-medium text-green-600">
                                  {(Number(poll.rewardFund) / 100_000_000).toFixed(2)} ICP
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
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
                                <AlertDialog>
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
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Vote on: {poll.title}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Choose your option:
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="space-y-2">
                                      {poll.options.map((option) => (
                                        <Button
                                          key={option.id}
                                          variant="outline"
                                          onClick={() => handleVote(poll.id, option.id)}
                                          className="w-full justify-start"
                                        >
                                          {option.text}
                                        </Button>
                                      ))}
                                    </div>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    </AlertDialogFooter>
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
                    const isVoting = votingPoll === poll.id

                    return (
                      <Card key={poll.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {poll.title.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm truncate">{poll.title}</CardTitle>
                              {project && (
                                <p className="text-xs text-gray-500">{project.name}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <Badge variant={isActive ? "default" : "secondary"}>
                              {isActive ? 'Active' : 'Closed'}
                            </Badge>
                            {userVoted && (
                              <Badge variant="outline">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Voted
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between text-sm mb-3">
                            <span className="text-gray-500">Total Votes</span>
                            <span className="font-medium">{Number(poll.totalVotes)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm mb-4">
                            <span className="text-gray-500">Time Left</span>
                            <span className="font-medium">{timeLeft}</span>
                          </div>
                          {isActive && !userVoted ? (
                            <Button
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              onClick={() => router.push(`/results?pollId=${poll.id}`)}
                            >
                              <Vote className="h-4 w-4 mr-2" />
                              Vote Now
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => router.push(`/results?pollId=${poll.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Results
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
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
      </div>
    </div>
  )
}
