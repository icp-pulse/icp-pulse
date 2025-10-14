'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Users, CheckCircle2 } from 'lucide-react'
import { canSelectPolls } from '@/lib/premium'

interface Poll {
  id: string
  title: string
  description: string
  options: {
    text: string
    votes: bigint
  }[]
  totalVotes: bigint
  createdAt: bigint
  closesAt: bigint
  status: { active: null } | { paused: null } | { claimsOpen: null } | { claimsEnded: null } | { closed: null }
}

interface PollSelectorProps {
  polls: Poll[]
  selectedPollIds: string[]
  onSelectionChange: (pollIds: string[]) => void
  userPrincipal?: string
  loading?: boolean
}

export function PollSelector({
  polls,
  selectedPollIds,
  onSelectionChange,
  userPrincipal,
  loading = false
}: PollSelectorProps) {
  const [limitWarning, setLimitWarning] = useState<string | null>(null)

  const handleTogglePoll = (pollId: string) => {
    const isSelected = selectedPollIds.includes(pollId)

    if (isSelected) {
      // Deselect
      onSelectionChange(selectedPollIds.filter(id => id !== pollId))
      setLimitWarning(null)
    } else {
      // Try to select
      const newSelection = [...selectedPollIds, pollId]
      const canSelect = canSelectPolls(userPrincipal, newSelection.length)

      if (canSelect.allowed) {
        onSelectionChange(newSelection)
        setLimitWarning(null)
      } else {
        setLimitWarning(canSelect.reason || 'Cannot select more polls')
      }
    }
  }

  const handleSelectAll = () => {
    if (selectedPollIds.length === polls.length) {
      // Deselect all
      onSelectionChange([])
      setLimitWarning(null)
    } else {
      // Select all (up to limit)
      const canSelect = canSelectPolls(userPrincipal, polls.length)

      if (canSelect.allowed) {
        onSelectionChange(polls.map(p => p.id))
        setLimitWarning(null)
      } else if (canSelect.max) {
        // Select up to max
        onSelectionChange(polls.slice(0, canSelect.max).map(p => p.id))
        setLimitWarning(`Selected maximum of ${canSelect.max} polls. ${canSelect.reason}`)
      }
    }
  }

  const formatTimeAgo = (timestamp: bigint) => {
    const now = Date.now()
    const createdAt = Number(timestamp) / 1_000_000 // Convert nanoseconds to milliseconds
    const diffMs = now - createdAt
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  const getStatusBadge = (status: Poll['status']) => {
    if ('active' in status) {
      return <Badge variant="default" className="bg-green-500">Active</Badge>
    }
    if ('closed' in status) {
      return <Badge variant="secondary">Closed</Badge>
    }
    return <Badge variant="outline">Paused</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Polls to Analyze</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (polls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Polls to Analyze</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No polls found for this project.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Create some polls first to analyze their results.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Select Polls to Analyze</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {selectedPollIds.length} of {polls.length} selected
            </span>
            <Checkbox
              checked={selectedPollIds.length === polls.length}
              onCheckedChange={handleSelectAll}
            />
            <label className="text-sm font-medium cursor-pointer" onClick={handleSelectAll}>
              Select All
            </label>
          </div>
        </div>
        {limitWarning && (
          <div className="mt-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
            {limitWarning}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {polls.map((poll) => {
              const isSelected = selectedPollIds.includes(poll.id)
              const totalVotes = Number(poll.totalVotes)

              return (
                <div
                  key={poll.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleTogglePoll(poll.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleTogglePoll(poll.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {poll.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                            {poll.description}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{totalVotes} votes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatTimeAgo(poll.createdAt)}</span>
                        </div>
                        {getStatusBadge(poll.status)}
                      </div>

                      {/* Show top option */}
                      {poll.options.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Top option:</span>{' '}
                          {poll.options.reduce((prev, current) =>
                            Number(current.votes) > Number(prev.votes) ? current : prev
                          ).text}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
