"use client"

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Vote, Users, TrendingUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'


export default function PollAdmin() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [polls, setPolls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch polls from API endpoint
  useEffect(() => {
    async function fetchPolls() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/polls')
        if (!response.ok) {
          throw new Error(`Failed to fetch polls: ${response.status}`)
        }
        
        const apiPolls = await response.json()
        setPolls(apiPolls)
        
      } catch (err) {
        console.error('Error fetching polls:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch polls')
      } finally {
        setLoading(false)
      }
    }

    fetchPolls()
  }, [])

  const filteredPolls = polls.filter(poll => {
    const matchesSearch = (poll.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (poll.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (poll.project || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || poll.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'single-choice':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'multiple-choice':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'ranking':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getParticipationRate = (votes: number, participants: number) => {
    if (participants === 0) return 0
    return Math.round((participants / votes) * 100) || 0
  }

  const getDaysLeft = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Polls</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create and manage polls for quick decision making
          </p>
        </div>
        <Button onClick={() => window.location.href = '/polls/new'}>
          <Plus className="w-4 h-4 mr-2" />
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
                  {polls.filter(p => p.status === 'active').length}
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
                  {polls.reduce((sum, p) => sum + (p.totalVotes || 0), 0)}
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Participation</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {polls.length > 0 ? Math.round(polls.reduce((sum, p) => {
                    const votes = p.totalVotes || 0;
                    const participants = p.participants || 0;
                    return sum + (votes > 0 ? (participants / votes) * 100 : 0);
                  }, 0) / polls.length) : 0}%
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-orange-600" />
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
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading polls...</p>
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
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPolls.map((poll) => {
          const daysLeft = getDaysLeft(poll.closesAt || poll.expiresAt || new Date().toISOString())
          const participationRate = getParticipationRate(poll.totalVotes || 0, poll.participants || 0)
          
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
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`w-fit ${getStatusColor(poll.status)}`}>
                    {poll.status}
                  </Badge>
                  <Badge className={`w-fit text-xs ${getTypeColor(poll.type || 'single-choice')}`}>
                    {poll.type ? poll.type.replace('-', ' ') : 'single choice'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {poll.project || 'Unknown Project'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Poll Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{poll.options || 0}</p>
                    <p className="text-xs text-gray-500">Options</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{poll.totalVotes || 0}</p>
                    <p className="text-xs text-gray-500">Votes</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{poll.participants || 0}</p>
                    <p className="text-xs text-gray-500">Participants</p>
                  </div>
                </div>

                {/* Time Remaining */}
                {poll.status === 'active' && (
                  <div className="flex items-center justify-center space-x-2 py-2 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {daysLeft > 0 ? `${daysLeft} days left` : 
                       daysLeft === 0 ? 'Expires today' : 'Expired'}
                    </span>
                  </div>
                )}

                {/* Participation Progress */}
                {(poll.totalVotes || 0) > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Participation Rate</span>
                      <span className="font-medium text-gray-700">
                        {participationRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all bg-blue-500"
                        style={{ width: `${Math.min(participationRate, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Poll Info */}
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Owner</span>
                    <span className="font-medium">{poll.createdBy || poll.owner || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Created</span>
                    <span className="font-medium">{poll.createdAt ? new Date(poll.createdAt).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Expires</span>
                    <span className="font-medium">{(poll.closesAt || poll.expiresAt) ? new Date(poll.closesAt || poll.expiresAt).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Vote className="w-4 h-4 mr-1" />
                    Results
                  </Button>
                  <Button variant="outline" size="sm" className="px-3">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        </div>
      )}

      {/* Empty State */}
        <div className="text-center py-12">
          {!loading && !error && filteredPolls.length === 0 && (
          <>
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Vote className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No polls found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'Get started by creating your first poll.'}
            </p>
          </>
          )}
          <Button onClick={() => window.location.href = '/polls/new'}>
            <Plus className="w-4 h-4 mr-2" />
            Create Poll
          </Button>
        </div>
    </div>
  )
}