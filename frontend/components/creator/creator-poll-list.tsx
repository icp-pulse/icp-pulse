"use client"

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, MoreHorizontal, Edit, Vote, Users, TrendingUp, Clock, Pause, Play, Gift, Ban, XCircle, Copy, FileDown, DollarSign, Heart, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'

// Helper function to convert ICP Status variant to string
function statusToString(status: any): string {
  if (!status) return 'unknown'
  if (status.active !== undefined) return 'Active'
  if (status.paused !== undefined) return 'Paused'
  if (status.claimsOpen !== undefined) return 'Claims Open'
  if (status.claimsEnded !== undefined) return 'Claims Ended'
  if (status.closed !== undefined) return 'Closed'
  if (typeof status === 'string') return status
  return 'unknown'
}

export default function CreatorPollList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [polls, setPolls] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [donateDialogOpen, setDonateDialogOpen] = useState(false)
  const [selectedPollId, setSelectedPollId] = useState<any>(null)
  const { identity, isAuthenticated, authProvider, principalText } = useIcpAuth()
  const router = useRouter()

  // Fetch user's polls from ICP backend
  useEffect(() => {
    async function fetchMyPolls() {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { createBackendWithIdentity } = await import('@/lib/icp')
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const backend = await createBackendWithIdentity({ canisterId, host, identity })

        // Get poll summaries created by this user
        const myPollSummaries = await backend.list_my_polls(0n, 100n)

        // Fetch full poll details for each summary
        const allPolls: any[] = []
        for (const summary of myPollSummaries) {
          try {
            const fullPoll = await backend.get_poll(summary.id)
            if (fullPoll && fullPoll.length > 0 && fullPoll[0]) {
              allPolls.push(fullPoll[0])
            }
          } catch (err) {
            console.warn(`Failed to fetch poll ${summary.id}:`, err)
            allPolls.push(summary)
          }
        }

        setPolls(allPolls)

        // Fetch user's projects for project association display
        const userProjects = await backend.list_my_projects(0n, 100n)
        setProjects(userProjects)

      } catch (err) {
        console.error('Error fetching polls:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch polls')
      } finally {
        setLoading(false)
      }
    }

    fetchMyPolls()
  }, [identity, isAuthenticated])

  const filteredPolls = polls
    .filter(poll => {
      const matchesSearch = (poll.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (poll.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      const pollStatusString = statusToString(poll.status)
      const matchesStatus = statusFilter === 'all' || pollStatusString === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return Number(b.createdAt) - Number(a.createdAt)
        case 'oldest':
          return Number(a.createdAt) - Number(b.createdAt)
        case 'votes':
          return Number(b.totalVotes) - Number(a.totalVotes)
        case 'ending':
          return Number(a.closesAt) - Number(b.closesAt)
        default:
          return 0
      }
    })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'claims open':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'claims ended':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDaysLeft = (expiresAtNs: any) => {
    const now = new Date()
    const expiry = new Date(Number(expiresAtNs) / 1_000_000)
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getFundingTypeString = (fundingType: any): string => {
    if (!fundingType) return ''
    if (fundingType.SelfFunded !== undefined) return 'Self-Funded'
    if (fundingType.Crowdfunded !== undefined) return 'Crowdfunded'
    if (fundingType.TreasuryFunded !== undefined) return 'Treasury-Funded'
    return ''
  }

  const getFundingTypeColor = (type: string) => {
    switch (type) {
      case 'Self-Funded':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
      case 'Crowdfunded':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'Treasury-Funded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800'
    }
  }

  const formatFundAmount = (amount: bigint, decimals: number): string => {
    const divisor = BigInt(10 ** decimals)
    const quotient = amount / divisor
    const remainder = amount % divisor
    if (remainder === 0n) return quotient.toString()
    const decimal = remainder.toString().padStart(decimals, '0').replace(/0+$/, '')
    return decimal ? `${quotient}.${decimal}` : quotient.toString()
  }

  // Check if current user is the creator of a poll
  const isCreator = (poll: any) => {
    let userPrincipal: string | null = null

    // Handle Plug wallet authentication
    if (authProvider === 'plug') {
      userPrincipal = principalText
    }
    // Handle Internet Identity / NFID authentication
    else if (identity) {
      userPrincipal = identity.getPrincipal().toText()
    } else {
      return false
    }

    if (!userPrincipal) {
      return false
    }

    const pollCreator = poll.createdBy?.toText?.() || poll.createdBy?.toString()
    const match = userPrincipal === pollCreator
    return match
  }

  const getProjectName = (scopeId: any): string => {
    if (!scopeId || scopeId.toString() === '0') return 'No Project'
    const project = projects.find(p => p.id.toString() === scopeId.toString())
    return project ? project.name : 'Unknown Project'
  }

  const getProjectBadgeColor = (scopeId: any): string => {
    if (!scopeId || scopeId.toString() === '0') {
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 border-gray-300 dark:border-gray-700'
    }
    return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
  }

  // Status transition handlers
  const handleStatusTransition = async (pollId: any, action: string) => {
    if (!identity) return

    setSubmitting(true);
    try {
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      let result: any

      switch (action) {
        case 'pause':
          result = await backend.pause_poll(pollId)
          break
        case 'resume':
          result = await backend.resume_poll(pollId)
          break
        case 'start_claiming':
          result = await backend.start_rewards_claiming(pollId)
          break
        case 'end_claiming':
          result = await backend.end_rewards_claiming(pollId)
          break
        case 'close':
          result = await backend.close_poll(pollId)
          break
        default:
          return
      }

      if ('ok' in result) {
        // Fetch the updated poll to get new status
        const updatedPollData = await backend.get_poll(pollId)

        if (updatedPollData && updatedPollData.length > 0 && updatedPollData[0]) {
          // Update the poll in local state
          setPolls(prevPolls =>
            prevPolls.map(p =>
              p.id.toString() === pollId.toString()
                ? updatedPollData[0]
                : p
            )
          )
        }

        toast({
          title: "Success",
          description: "Poll status updated successfully",
          className: "bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800",
        })
      } else if ('err' in result) {
        toast({
          title: "Error",
          description: result.err,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating poll status:', error)
      toast({
        title: "Error",
        description: "Failed to update poll status",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false);
    }
  }

  // Withdraw unused funds - open dialog
  const handleWithdrawFunds = (pollId: any) => {
    setSelectedPollId(pollId)
    setWithdrawDialogOpen(true)
  }

  // Execute withdraw after confirmation
  const executeWithdraw = async () => {
    if (!identity || !selectedPollId) return

    try {
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      const result = await backend.withdraw_unused_funds(selectedPollId)

      if ('ok' in result) {
        // Fetch updated poll
        const updatedPollData = await backend.get_poll(selectedPollId)
        if (updatedPollData && updatedPollData.length > 0 && updatedPollData[0]) {
          setPolls(prevPolls =>
            prevPolls.map(p =>
              p.id.toString() === selectedPollId.toString()
                ? updatedPollData[0]
                : p
            )
          )
        }

        // Format the amounts for display
        const { withdrawnAmount, escrowAmount, tokenSymbol, tokenDecimals } = result.ok
        const formattedWithdrawn = formatFundAmount(withdrawnAmount, tokenDecimals)
        const formattedEscrow = formatFundAmount(escrowAmount, tokenDecimals)

        toast({
          title: "Success",
          description: `Successfully withdrew ${formattedWithdrawn} ${tokenSymbol} to your account. ${formattedEscrow} ${tokenSymbol} remains in escrow for pending claims.`,
          className: "bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800",
        })
      } else if ('err' in result) {
        toast({
          title: "Error",
          description: result.err,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error withdrawing funds:', error)
      toast({
        title: "Error",
        description: "Failed to withdraw funds",
        variant: "destructive",
      })
    } finally {
      setWithdrawDialogOpen(false)
      setSelectedPollId(null)
    }
  }

  // Donate unused funds to treasury - open dialog
  const handleDonateFunds = (pollId: any) => {
    setSelectedPollId(pollId)
    setDonateDialogOpen(true)
  }

  // Execute donation after confirmation
  const executeDonate = async () => {
    if (!identity || !selectedPollId) return

    try {
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      const result = await backend.donate_unused_funds(selectedPollId)

      if ('ok' in result) {
        // Fetch updated poll
        const updatedPollData = await backend.get_poll(selectedPollId)
        if (updatedPollData && updatedPollData.length > 0 && updatedPollData[0]) {
          setPolls(prevPolls =>
            prevPolls.map(p =>
              p.id.toString() === selectedPollId.toString()
                ? updatedPollData[0]
                : p
            )
          )
        }

        // Format the amounts for display
        const { donatedAmount, escrowAmount, tokenSymbol, tokenDecimals } = result.ok
        const formattedDonated = formatFundAmount(donatedAmount, tokenDecimals)
        const formattedEscrow = formatFundAmount(escrowAmount, tokenDecimals)

        toast({
          title: "Success",
          description: `Successfully donated ${formattedDonated} ${tokenSymbol} to the treasury. ${formattedEscrow} ${tokenSymbol} remains in escrow for pending claims.`,
          className: "bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800",
        })
      } else if ('err' in result) {
        toast({
          title: "Error",
          description: result.err,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error donating funds:', error)
      toast({
        title: "Error",
        description: "Failed to donate funds",
        variant: "destructive",
      })
    } finally {
      setDonateDialogOpen(false)
      setSelectedPollId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">My Polls</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your polls and track their performance
          </p>
        </div>
        <Button
          onClick={() => router.push('/polls/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Poll
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Polls</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{polls.length}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Vote className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {polls.filter(p => statusToString(p.status) === 'Active').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Votes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {polls.reduce((sum, p) => sum + Number(p.totalVotes || 0n), 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Participants</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {polls.reduce((sum, p) => sum + (p.voterPrincipals?.length || 0), 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search polls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Paused">Paused</SelectItem>
            <SelectItem value="Claims Open">Claims Open</SelectItem>
            <SelectItem value="Claims Ended">Claims Ended</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="votes">Most Votes</SelectItem>
            <SelectItem value="ending">Ending Soon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your polls...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-red-600 rounded"></div>
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Polls</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      )}

      {/* Polls Grid */}
      {!loading && !error && filteredPolls.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPolls.map((poll) => {
          const daysLeft = getDaysLeft(poll.closesAt || BigInt(Date.now() * 1_000_000))

          // Calculate pending claims and withdrawable amount
          let totalPendingClaims = 0n
          if (poll.fundingInfo && poll.fundingInfo.length > 0 && poll.fundingInfo[0]?.pendingClaims) {
            totalPendingClaims = poll.fundingInfo[0].pendingClaims.reduce(
              (sum: bigint, [_, amount]: [any, bigint]) => sum + amount,
              0n
            )
          }

          const remainingFund = poll.fundingInfo && poll.fundingInfo.length > 0 && poll.fundingInfo[0]
            ? poll.fundingInfo[0].remainingFund
            : 0n
          const withdrawableAmount = remainingFund > totalPendingClaims ? remainingFund - totalPendingClaims : 0n

          return (
            <Card key={poll.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-medium line-clamp-1">{poll.title}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {poll.description}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/polls/${poll.id}`)
                        toast({
                          title: "Link copied!",
                          description: "Poll link has been copied to clipboard",
                        })
                      }}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/results?pollId=${poll.id}`)}>
                        <FileDown className="w-4 h-4 mr-2" />
                        View Results
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Status Management</DropdownMenuLabel>
                      {statusToString(poll.status) === 'Active' && (
                        <>
                          <DropdownMenuItem onClick={() => handleStatusTransition(poll.id, 'pause')}>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause Poll
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusTransition(poll.id, 'start_claiming')}>
                            <Gift className="w-4 h-4 mr-2" />
                            Start Claiming
                          </DropdownMenuItem>
                        </>
                      )}
                      {statusToString(poll.status) === 'Paused' && (
                        <>
                          <DropdownMenuItem onClick={() => handleStatusTransition(poll.id, 'resume')}>
                            <Play className="w-4 h-4 mr-2" />
                            Resume Poll
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusTransition(poll.id, 'start_claiming')}>
                            <Gift className="w-4 h-4 mr-2" />
                            Start Claiming
                          </DropdownMenuItem>
                        </>
                      )}
                      {statusToString(poll.status) === 'Claims Open' && (
                        <DropdownMenuItem onClick={() => handleStatusTransition(poll.id, 'end_claiming')}>
                          <Ban className="w-4 h-4 mr-2" />
                          End Claiming
                        </DropdownMenuItem>
                      )}
                      {statusToString(poll.status) !== 'Closed' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusTransition(poll.id, 'close')}
                          className="text-red-600"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Close Poll
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`w-fit ${getStatusColor(statusToString(poll.status))}`}>
                    {statusToString(poll.status)}
                  </Badge>
                  {poll.fundingInfo && poll.fundingInfo.length > 0 && poll.fundingInfo[0] && (
                    <Badge className={`w-fit text-xs ${getFundingTypeColor(getFundingTypeString(poll.fundingInfo[0].fundingType))}`}>
                      {getFundingTypeString(poll.fundingInfo[0].fundingType)}
                    </Badge>
                  )}
                  <Badge className={`w-fit text-xs ${getProjectBadgeColor(poll.scopeId)}`}>
                    {getProjectName(poll.scopeId)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Poll Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{poll.options?.length || 0}</p>
                    <p className="text-xs text-gray-500">Options</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{Number(poll.totalVotes || 0n)}</p>
                    <p className="text-xs text-gray-500">Votes</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{poll.voterPrincipals?.length || 0}</p>
                    <p className="text-xs text-gray-500">Participants</p>
                  </div>
                </div>

                {/* Time Remaining */}
                {statusToString(poll.status) === 'Active' && (
                  <div className="flex items-center justify-center space-x-2 py-2 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {daysLeft > 0 ? `${daysLeft} days left` :
                       daysLeft === 0 ? 'Expires today' : 'Expired'}
                    </span>
                  </div>
                )}

                {/* Poll Info */}
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Created</span>
                    <span className="font-medium">{poll.createdAt ? new Date(Number(poll.createdAt) / 1_000_000).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Expires</span>
                    <span className="font-medium">{poll.closesAt ? new Date(Number(poll.closesAt) / 1_000_000).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                  {poll.fundingInfo && poll.fundingInfo.length > 0 && poll.fundingInfo[0] && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Reward Fund</span>
                      <span className="font-medium">
                        {formatFundAmount(poll.fundingInfo[0].totalFund, poll.fundingInfo[0].tokenDecimals)} {poll.fundingInfo[0].tokenSymbol}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Management (only for creators) */}
                {isCreator(poll) && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-2">Poll Status Management</p>
                    <div className="flex flex-wrap gap-2">
                      {statusToString(poll.status) === 'Active' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusTransition(poll.id, 'pause')}
                            className="text-xs"
                            disabled={submitting}
                          >
                            <Pause className="w-3 h-3 mr-1" />
                            Pause
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusTransition(poll.id, 'start_claiming')}
                            className="text-xs"
                            disabled={submitting}
                          >
                            <Gift className="w-3 h-3 mr-1" />
                            Start Claiming
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusTransition(poll.id, 'close')}
                            className="text-xs text-red-600 hover:bg-red-50"
                            disabled={submitting}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Close
                          </Button>
                        </>
                      )}
                      {statusToString(poll.status) === 'Paused' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusTransition(poll.id, 'resume')}
                            className="text-xs"
                            disabled={submitting}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Resume
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusTransition(poll.id, 'start_claiming')}
                            className="text-xs"
                            disabled={submitting}
                          >
                            <Gift className="w-3 h-3 mr-1" />
                            Start Claiming
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusTransition(poll.id, 'close')}
                            className="text-xs text-red-600 hover:bg-red-50"
                            disabled={submitting}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Close
                          </Button>
                        </>
                      )}
                      {statusToString(poll.status) === 'Claims Open' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusTransition(poll.id, 'end_claiming')}
                            className="text-xs"
                            disabled={submitting}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            End Claiming
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusTransition(poll.id, 'close')}
                            className="text-xs text-red-600 hover:bg-red-50"
                            disabled={submitting}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Close
                          </Button>
                        </>
                      )}
                      {statusToString(poll.status) === 'Claims Ended' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusTransition(poll.id, 'close')}
                          className="text-xs text-red-600 hover:bg-red-50"
                          disabled={submitting}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Close
                        </Button>
                      )}
                      {statusToString(poll.status) === 'Closed' && (
                        <p className="text-xs text-gray-500 italic">Poll is permanently closed</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Fund Management (only for creators with withdrawable funds) */}
                {isCreator(poll) &&
                 (statusToString(poll.status) === 'Closed' || statusToString(poll.status) === 'Claims Ended') &&
                 poll.fundingInfo && poll.fundingInfo.length > 0 && poll.fundingInfo[0] &&
                 withdrawableAmount > 0n && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-2">Unused Funds Management</p>

                    {/* Withdrawable Balance */}
                    <div className="flex items-center justify-between mb-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Withdrawable:</span>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatFundAmount(withdrawableAmount, poll.fundingInfo[0].tokenDecimals)} {poll.fundingInfo[0].tokenSymbol}
                      </span>
                    </div>

                    {/* Pending Claims (if any) */}
                    {totalPendingClaims > 0n && (
                      <div className="flex items-center justify-between mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                        <span className="text-sm text-gray-700 dark:text-gray-300">In Escrow (Pending Claims):</span>
                        <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                          {formatFundAmount(totalPendingClaims, poll.fundingInfo[0].tokenDecimals)} {poll.fundingInfo[0].tokenSymbol}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWithdrawFunds(poll.id)}
                        className="text-xs flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        disabled={submitting}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Withdraw Funds
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDonateFunds(poll.id)}
                        className="text-xs flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                        disabled={submitting}
                      >
                        <Heart className="w-3 h-3 mr-1" />
                        Donate to Treasury
                      </Button>
                    </div>

                    {totalPendingClaims > 0n && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Pending claims remain in escrow for voters to claim
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/polls/edit?id=${poll.id}`)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/results?pollId=${poll.id}`)}
                  >
                    <Vote className="w-4 h-4 mr-1" />
                    Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredPolls.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Vote className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No polls found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first poll.'}
          </p>
          <Button onClick={() => router.push('/polls/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Poll
          </Button>
        </div>
      )}

      {/* Withdraw Funds Confirmation Dialog */}
      <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Unused Funds</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw the unused funds to your account? Any pending claims will remain in escrow for voters to claim.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeWithdraw} className="bg-green-600 hover:bg-green-700">
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Donate Funds Confirmation Dialog */}
      <AlertDialog open={donateDialogOpen} onOpenChange={setDonateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Donate Unused Funds to Treasury</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to donate the unused funds to the treasury? Any pending claims will remain in escrow for voters. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDonate} className="bg-purple-600 hover:bg-purple-700">
              Donate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
