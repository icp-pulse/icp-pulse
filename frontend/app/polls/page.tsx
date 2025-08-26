'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter } from 'next/navigation'
import { Clock, Users, Vote, CheckCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

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
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [votingPoll, setVotingPoll] = useState<bigint | null>(null)
  const { identity } = useIcpAuth()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [identity]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    if (!identity) return
    
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
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load polls')
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Polls</h1>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!identity) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Polls</h1>
          <p className="text-gray-600 dark:text-gray-400">Please login to view and vote on polls.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Polls</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Vote on active polls and see results
          </p>
        </div>
        <Button onClick={() => router.push('/polls/new')}>
          Create Poll
        </Button>
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

      {/* Polls List */}
      {polls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Vote className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Polls Available</h3>
            <p className="text-gray-500 text-center mb-4">
              There are no active polls at the moment. Check back later or create your own poll.
            </p>
            <Button onClick={() => router.push('/polls/new')}>
              Create First Poll
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {polls.map((poll) => {
            const project = getProject(poll.scopeId)
            const userVoted = hasUserVoted(poll)
            const isActive = 'active' in poll.status
            const timeLeft = formatTimeLeft(poll.closesAt)
            const isVoting = votingPoll === poll.id

            return (
              <Card key={poll.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{poll.title}</CardTitle>
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {isActive ? 'Active' : 'Closed'}
                        </Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {poll.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {Number(poll.totalVotes)} votes
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {timeLeft}
                        </div>
                        {project && (
                          <Badge variant="outline">
                            {project.name}
                          </Badge>
                        )}
                        {userVoted && (
                          <Badge variant="secondary">
                            You voted
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {poll.options.map((option, index) => {
                      const percentage = getVotePercentage(option.votes, poll.totalVotes)
                      
                      return (
                        <div key={option.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {isActive && !userVoted ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isVoting}
                                      className="min-w-fit"
                                    >
                                      {isVoting ? 'Voting...' : 'Vote'}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirm Your Vote</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to vote for &quot;{option.text}&quot;? 
                                        {poll.fundingInfo && poll.fundingInfo.length > 0 && (
                                          <span className="block mt-2 text-blue-600 font-medium">
                                            🎁 You&apos;ll receive {(Number(poll.fundingInfo[0]?.rewardPerResponse) / 100_000_000).toFixed(8)} ICP as a reward!
                                          </span>
                                        )}
                                        <span className="block mt-2 text-sm text-gray-600">
                                          You can only vote once on this poll.
                                        </span>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleVote(poll.id, option.id)}
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        Confirm Vote
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : (
                                <div className="w-16" />
                              )}
                              <span className="text-sm font-medium">{option.text}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500">
                                {Number(option.votes)} votes
                              </span>
                              <span className="text-sm font-medium min-w-[3rem] text-right">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                          {(userVoted || !isActive) && (
                            <Progress value={percentage} className="h-2" />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Funding Info */}
                  {poll.fundingInfo && poll.fundingInfo.length > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">
                        🎁 Rewards Available
                      </h4>
                      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <div className="flex justify-between">
                          <span>Reward per vote:</span>
                          <span className="font-mono">
                            {(Number(poll.fundingInfo[0]?.rewardPerResponse) / 100_000_000).toFixed(8)} ICP
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Remaining rewards:</span>
                          <span className="font-mono">
                            {Number(poll.fundingInfo[0]?.maxResponses) - Number(poll.fundingInfo[0]?.currentResponses)} of {Number(poll.fundingInfo[0]?.maxResponses)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
