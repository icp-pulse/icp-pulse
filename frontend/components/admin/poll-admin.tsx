"use client"

import { useState } from 'react'
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Vote, Users, TrendingUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Mock data - replace with actual data fetching
const mockPolls = [
  {
    id: '1',
    title: 'Preferred Meeting Time for Team Standup',
    description: 'Help us decide the best time for daily team meetings that works for everyone',
    status: 'active',
    project: 'Team Operations',
    owner: 'Alex Thompson',
    createdAt: '2024-01-22',
    expiresAt: '2024-02-22',
    options: 4,
    votes: 28,
    participants: 24,
    type: 'single-choice'
  },
  {
    id: '2',
    title: 'Company Logo Design Vote',
    description: 'Choose your favorite logo design from our final three options for the rebrand',
    status: 'active',
    project: 'Marketing Campaign',
    owner: 'Lisa Park',
    createdAt: '2024-01-20',
    expiresAt: '2024-01-30',
    options: 3,
    votes: 145,
    participants: 89,
    type: 'single-choice'
  },
  {
    id: '3',
    title: 'Office Lunch Options',
    description: 'Vote for your preferred catering options for our monthly office lunch',
    status: 'draft',
    project: 'Office Management',
    owner: 'David Kim',
    createdAt: '2024-01-19',
    expiresAt: '2024-02-19',
    options: 5,
    votes: 0,
    participants: 0,
    type: 'multiple-choice'
  },
  {
    id: '4',
    title: 'Project Priority Ranking',
    description: 'Rank upcoming projects by priority to help with resource allocation',
    status: 'completed',
    project: 'Product Planning',
    owner: 'Rachel Green',
    createdAt: '2024-01-05',
    expiresAt: '2024-01-15',
    options: 6,
    votes: 67,
    participants: 34,
    type: 'ranking'
  },
  {
    id: '5',
    title: 'Work From Home Policy',
    description: 'Share your thoughts on the proposed work from home policy changes',
    status: 'expired',
    project: 'HR Initiative',
    owner: 'Tom Wilson',
    createdAt: '2024-01-01',
    expiresAt: '2024-01-20',
    options: 4,
    votes: 92,
    participants: 78,
    type: 'single-choice'
  }
]

export default function PollAdmin() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [polls] = useState(mockPolls)

  const filteredPolls = polls.filter(poll => {
    const matchesSearch = poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         poll.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         poll.project.toLowerCase().includes(searchQuery.toLowerCase())
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
        <Button>
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
                  {polls.reduce((sum, p) => sum + p.votes, 0)}
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
                  {Math.round(polls.reduce((sum, p) => sum + (p.votes > 0 ? (p.participants / p.votes) * 100 : 0), 0) / polls.length)}%
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

      {/* Polls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPolls.map((poll) => {
          const daysLeft = getDaysLeft(poll.expiresAt)
          const participationRate = getParticipationRate(poll.votes, poll.participants)
          
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
                  <Badge className={`w-fit text-xs ${getTypeColor(poll.type)}`}>
                    {poll.type.replace('-', ' ')}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {poll.project}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Poll Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{poll.options}</p>
                    <p className="text-xs text-gray-500">Options</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{poll.votes}</p>
                    <p className="text-xs text-gray-500">Votes</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{poll.participants}</p>
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
                {poll.votes > 0 && (
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
                    <span className="font-medium">{poll.owner}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Created</span>
                    <span className="font-medium">{new Date(poll.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Expires</span>
                    <span className="font-medium">{new Date(poll.expiresAt).toLocaleDateString()}</span>
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

      {/* Empty State */}
      {filteredPolls.length === 0 && (
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
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Poll
          </Button>
        </div>
      )}
    </div>
  )
}