"use client"

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, FileText, Users, BarChart3, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter } from 'next/navigation'

// Helper function to convert ICP Status variant to string
function statusToString(status: any): string {
  if (!status) return 'unknown'
  if (status.active !== undefined) return 'active'
  if (status.closed !== undefined) return 'closed'
  if (typeof status === 'string') return status
  return 'unknown'
}

export default function SurveyAdmin() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [surveys, setSurveys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)
  const [respondents, setRespondents] = useState<any[]>([])
  const [loadingRespondents, setLoadingRespondents] = useState(false)
  const { identity, isAuthenticated } = useIcpAuth()
  const router = useRouter()

  // Fetch surveys from ICP backend
  useEffect(() => {
    async function fetchSurveys() {
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
        
        // First get all projects
        const projects = await backend.list_projects(0n, 100n)
        
        // Then get surveys for each project
        const allSurveys: any[] = []
        for (const project of projects) {
          try {
            const projectSurveys = await backend.list_surveys_by_project(project.id, 0n, 100n)
            allSurveys.push(...projectSurveys)
          } catch (err) {
            console.warn(`Failed to fetch surveys for project ${project.id}:`, err)
          }
        }
        
        setSurveys(allSurveys)
        
      } catch (err) {
        console.error('Error fetching surveys:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch surveys')
      } finally {
        setLoading(false)
      }
    }

    fetchSurveys()
  }, [identity, isAuthenticated])

  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         survey.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (survey.project || '').toLowerCase().includes(searchQuery.toLowerCase())
    const surveyStatusString = statusToString(survey.status)
    const matchesStatus = statusFilter === 'all' || surveyStatusString === statusFilter
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
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'archived':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const fetchRespondents = async (surveyId: string) => {
    if (!isAuthenticated) return

    setLoadingRespondents(true)
    try {
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      const principals = await backend.get_survey_respondents(BigInt(surveyId))
      setRespondents(principals.map((p: any) => p.toString()))
    } catch (err) {
      console.error('Error fetching respondents:', err)
      setRespondents([])
    } finally {
      setLoadingRespondents(false)
    }
  }

  const handleViewParticipants = (surveyId: string) => {
    setSelectedSurveyId(surveyId)
    fetchRespondents(surveyId)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Surveys</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create and manage survey forms across projects
          </p>
        </div>
        <Button
          onClick={() => router.push('/surveys/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Survey
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Surveys</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{surveys.length}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
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
                  {surveys.filter(s => statusToString(s.status) === 'active').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Responses</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {surveys.reduce((sum, s) => sum + Number(s.responses || 0n), 0)}
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Completion</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {surveys.length > 0 ? Math.round(surveys.reduce((sum, s) => sum + Number(s.completionRate || 0), 0) / surveys.length) : 0}%
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-orange-600" />
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
            placeholder="Search surveys..."
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
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading surveys...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-red-600 rounded"></div>
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Surveys</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      )}

      {/* Surveys Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSurveys.map((survey) => (
          <Card key={survey.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-medium line-clamp-1">{survey.title}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {survey.description}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`w-fit ${getStatusColor(statusToString(survey.status))}`}>
                  {statusToString(survey.status)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {survey.project}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Survey Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{survey.questions}</p>
                  <p className="text-xs text-gray-500">Questions</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{Number(survey.responses || 0n)}</p>
                  <p className="text-xs text-gray-500">Responses</p>
                </div>
                <div>
                  <p className={`text-lg font-semibold ${getCompletionRateColor(Number(survey.completionRate || 0))}`}>
                    {Number(survey.completionRate || 0)}%
                  </p>
                  <p className="text-xs text-gray-500">Completion</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Completion Rate</span>
                  <span className={`font-medium ${getCompletionRateColor(Number(survey.completionRate || 0))}`}>
                    {Number(survey.completionRate || 0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      Number(survey.completionRate || 0) >= 80 ? 'bg-green-500' :
                      Number(survey.completionRate || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Number(survey.completionRate || 0)}%` }}
                  />
                </div>
              </div>

              {/* Survey Info */}
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Owner</span>
                  <span className="font-medium">{survey.owner}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Created</span>
                  <span className="font-medium">{new Date(survey.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => router.push(`/surveys/${survey.id}/edit`)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleViewParticipants(survey.id.toString())}>
                      <Users className="w-4 h-4 mr-1" />
                      Participants
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800">
                    <DialogHeader>
                      <DialogTitle>Survey Participants</DialogTitle>
                      <p className="text-sm text-gray-500">{survey.title}</p>
                    </DialogHeader>
                    <div className="space-y-4">
                      {loadingRespondents ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-sm text-gray-500">Loading participants...</p>
                        </div>
                      ) : respondents.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No participants yet</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between pb-2 border-b">
                            <p className="text-sm font-medium">Total Participants: {respondents.length}</p>
                          </div>
                          <div className="space-y-2">
                            {respondents.map((principal, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                                  </div>
                                  <code className="text-xs font-mono text-gray-700 truncate flex-1">{principal}</code>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(principal)}
                                  className="ml-2 flex-shrink-0"
                                >
                                  Copy
                                </Button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={() => router.push(`/survey-rewards?surveyId=${survey.id}`)}>
                  <Gift className="w-4 h-4 mr-1" />
                  Rewards
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push(`/survey-results?surveyId=${survey.id}`)}>
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Results
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredSurveys.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No surveys found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'Get started by creating your first survey.'}
          </p>
          <Button onClick={() => router.push('/surveys/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Survey
          </Button>
        </div>
      )}
    </div>
  )
}