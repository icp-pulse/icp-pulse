'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter } from 'next/navigation'
import { Coins, TrendingUp, Users, Target, Search, Filter, Heart, Flame, Clock, ArrowUpDown, Plus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { PollCrowdfunding } from '@/components/polls/poll-crowdfunding'

import type { Poll as BackendPoll, Survey as BackendSurvey } from '@/../../src/declarations/polls_surveys_backend/polls_surveys_backend.did'

interface Project {
  id: bigint
  name: string
}

export default function CrowdfundingPage() {
  const [polls, setPolls] = useState<BackendPoll[]>([])
  const [surveys, setSurveys] = useState<BackendSurvey[]>([])
  const [filteredItems, setFilteredItems] = useState<(BackendPoll | BackendSurvey)[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [projectFilter, setProjectFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState<BackendPoll | null>(null)
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

      // Fetch projects
      const projectData = await backend.list_projects(0n, 100n)
      setProjects(projectData)

      // Fetch all polls and filter for crowdfunded ones
      let allPolls: BackendPoll[] = []
      let allSurveys: BackendSurvey[] = []

      for (const project of projectData) {
        try {
          // Fetch polls
          const projectPolls = await backend.list_polls_by_project(project.id, 0n, 50n)
          for (const pollSummary of projectPolls) {
            const poll = await backend.get_poll(pollSummary.id)
            if (poll && poll.length > 0 && poll[0]) {
              const p = poll[0]
              // Only include polls with funding info and crowdfunded type
              if (p.fundingInfo && p.fundingInfo.length > 0 && p.fundingInfo[0]) {
                const fundingInfo = p.fundingInfo[0]
                if ('Crowdfunded' in fundingInfo.fundingType) {
                  allPolls.push(p)
                }
              }
            }
          }

          // Fetch surveys
          const projectSurveys = await backend.list_surveys_by_project(project.id, 0n, 50n)
          for (const surveySummary of projectSurveys) {
            const survey = await backend.get_survey(surveySummary.id)
            if (survey && survey.length > 0 && survey[0]) {
              const s = survey[0]
              // Only include surveys with funding info and crowdfunded type
              if (s.fundingInfo && s.fundingInfo.length > 0 && s.fundingInfo[0]) {
                const fundingInfo = s.fundingInfo[0]
                if ('Crowdfunded' in fundingInfo.fundingType) {
                  allSurveys.push(s)
                }
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching data for project ${project.id}:`, err)
        }
      }

      setPolls(allPolls)
      setSurveys(allSurveys)
      setFilteredItems([...allPolls, ...allSurveys])
    } catch (err) {
      console.error('Error fetching crowdfunding data:', err)
      toast({
        title: "Error",
        description: "Failed to load crowdfunding opportunities",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort
  useEffect(() => {
    let filtered: (BackendPoll | BackendSurvey)[] = [...polls, ...surveys]

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(item => item.scopeId.toString() === projectFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return Number(b.createdAt) - Number(a.createdAt)
        case 'funding':
          const aFunding = a.fundingInfo?.[0]?.totalFund || 0n
          const bFunding = b.fundingInfo?.[0]?.totalFund || 0n
          return Number(bFunding) - Number(aFunding)
        case 'progress':
          const aProgress = a.fundingInfo?.[0] ? (Number(a.fundingInfo[0].currentResponses) / Number(a.fundingInfo[0].maxResponses)) : 0
          const bProgress = b.fundingInfo?.[0] ? (Number(b.fundingInfo[0].currentResponses) / Number(b.fundingInfo[0].maxResponses)) : 0
          return bProgress - aProgress
        case 'contributors':
          const aContributors = Number(a.fundingInfo?.[0]?.contributors.length || 0)
          const bContributors = Number(b.fundingInfo?.[0]?.contributors.length || 0)
          return bContributors - aContributors
        default:
          return 0
      }
    })

    setFilteredItems(filtered)
  }, [polls, surveys, searchQuery, projectFilter, sortBy])

  const getProject = (scopeId: bigint) => {
    return projects.find(p => p.id === scopeId)
  }

  const isPoll = (item: BackendPoll | BackendSurvey): item is BackendPoll => {
    return 'options' in item
  }

  const formatTimeLeft = (closesAt: bigint) => {
    const now = BigInt(Date.now()) * 1_000_000n
    const timeLeft = Number(closesAt - now)

    if (timeLeft <= 0) return 'Ended'

    const days = Math.floor(timeLeft / (1_000_000 * 1000 * 60 * 60 * 24))
    const hours = Math.floor((timeLeft % (1_000_000 * 1000 * 60 * 60 * 24)) / (1_000_000 * 1000 * 60 * 60))

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`
    return 'Less than 1 hour left'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold mb-4">Crowdfunding</h1>
          <p className="text-gray-600 dark:text-gray-400">Please login to view crowdfunding opportunities.</p>
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Coins className="h-7 w-7 text-blue-600" />
                Crowdfunding
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Support polls and surveys by contributing to their reward pools
              </p>
            </div>
            <Button
              onClick={() => router.push('/polls/new')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Crowdfunded Poll
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Campaigns</p>
                    <p className="text-2xl font-bold mt-1">{filteredItems.length}</p>
                  </div>
                  <Target className="h-10 w-10 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Contributors</p>
                    <p className="text-2xl font-bold mt-1">
                      {filteredItems.reduce((sum, item) =>
                        sum + (item.fundingInfo?.[0]?.contributors.length || 0), 0
                      )}
                    </p>
                  </div>
                  <Users className="h-10 w-10 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Funded</p>
                    <p className="text-2xl font-bold mt-1">
                      {filteredItems.reduce((sum, item) => {
                        const funding = item.fundingInfo?.[0]
                        if (!funding) return sum
                        return sum + Number(funding.totalFund) / Math.pow(10, funding.tokenDecimals)
                      }, 0).toFixed(2)} PULSE
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search campaigns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="funding">Highest Funding</SelectItem>
                  <SelectItem value="progress">Most Progress</SelectItem>
                  <SelectItem value="contributors">Most Contributors</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
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
        </div>

        {/* Campaigns Grid */}
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Coins className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Crowdfunding Campaigns</h3>
              <p className="text-gray-500 text-center mb-4">
                There are no active crowdfunding campaigns at the moment.
              </p>
              <Button onClick={() => router.push('/polls/new')}>
                Create Crowdfunded Poll
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredItems.map((item) => {
              const project = getProject(item.scopeId)
              const fundingInfo = item.fundingInfo?.[0]
              if (!fundingInfo) return null

              const tokenSymbol = fundingInfo.tokenSymbol
              const tokenDecimals = fundingInfo.tokenDecimals
              const totalFundDisplay = Number(fundingInfo.totalFund) / Math.pow(10, tokenDecimals)
              const rewardPerResponse = Number(fundingInfo.rewardPerResponse) / Math.pow(10, tokenDecimals)
              const contributorCount = fundingInfo.contributors.length
              const fundingProgress = Number(fundingInfo.maxResponses) > 0
                ? (Number(fundingInfo.currentResponses) / Number(fundingInfo.maxResponses)) * 100
                : 0
              const isActive = 'active' in item.status
              const timeLeft = formatTimeLeft(item.closesAt)

              return (
                <Card key={`${isPoll(item) ? 'poll' : 'survey'}-${item.id}`} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                            {isActive ? 'Active' : 'Closed'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {isPoll(item) ? 'Poll' : 'Survey'}
                          </Badge>
                          {project && (
                            <Badge variant="outline" className="text-xs">
                              {project.name}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg mb-1">{item.title}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-xl font-bold text-blue-600">
                          {totalFundDisplay.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{tokenSymbol} Raised</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-xl font-bold text-green-600">
                          {contributorCount}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Contributors</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-xl font-bold text-purple-600">
                          {rewardPerResponse.toFixed(6)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{tokenSymbol}/Vote</div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="font-medium">
                          {fundingInfo.currentResponses}/{fundingInfo.maxResponses} funded
                        </span>
                      </div>
                      <Progress value={fundingProgress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{fundingProgress.toFixed(1)}% funded</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeLeft}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          if (isPoll(item)) {
                            setSelectedItem(item)
                          }
                        }}
                        disabled={!isActive}
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        Contribute
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (isPoll(item)) {
                            router.push(`/results?pollId=${item.id}`)
                          }
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Contribution Modal */}
        {selectedItem && selectedItem.fundingInfo?.[0] && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">{selectedItem.title}</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                    ✕
                  </Button>
                </div>
                <PollCrowdfunding
                  pollId={selectedItem.id}
                  fundingInfo={{
                    ...selectedItem.fundingInfo[0],
                    tokenCanister: selectedItem.fundingInfo[0].tokenCanister.length > 0
                      ? [selectedItem.fundingInfo[0].tokenCanister[0]!.toString()]
                      : []
                  }}
                  onContribute={() => {
                    setSelectedItem(null)
                    fetchData()
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
