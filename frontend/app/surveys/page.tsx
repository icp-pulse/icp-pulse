"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, Users, FileText, Search, Filter, ExternalLink, Coins } from 'lucide-react'
import Link from 'next/link'
import { useIcpAuth } from '@/components/IcpAuthProvider'

interface Survey {
  id: bigint
  scopeType: { project: null } | { product: null }
  scopeId: bigint
  title: string
  description: string
  createdBy: string
  createdAt: bigint
  closesAt: bigint
  status: { active: null } | { closed: null }
  rewardFund: bigint
  fundingInfo?: {
    totalFund: bigint
    rewardPerResponse: bigint
    maxResponses: bigint
    currentResponses: bigint
    remainingFund: bigint
  } | null
  allowAnonymous: boolean
  submissionsCount: bigint
}

interface Project {
  id: bigint
  name: string
  slug: string
  status: string
}

function statusToString(status: any): string {
  if (!status) return 'unknown'
  if (status.active !== undefined) return 'active'
  if (status.closed !== undefined) return 'closed'
  if (typeof status === 'string') return status
  return 'unknown'
}

function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

function formatReward(fundingInfo: any): string {
  if (!fundingInfo) return ''
  const rewardICP = Number(fundingInfo.rewardPerResponse) / 100_000_000
  return `${rewardICP.toFixed(3)} ICP`
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const { identity } = useIcpAuth()

  useEffect(() => {
    async function fetchData() {
      if (!identity) return

      try {
        const { createBackendWithIdentity } = await import('@/lib/icp')
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const backend = await createBackendWithIdentity({ canisterId, host, identity })

        // Fetch projects first
        const projectsData = await backend.list_projects(0n, 100n)
        const projectsList = projectsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          status: p.status
        }))
        setProjects(projectsList)

        // Fetch surveys from all projects
        const allSurveys: Survey[] = []
        for (const project of projectsList) {
          try {
            const projectSurveys = await backend.list_surveys_by_project(project.id, 0n, 50n)
            for (const surveySummary of projectSurveys) {
              const fullSurvey = await backend.get_survey(surveySummary.id)
              if (fullSurvey && fullSurvey.length > 0) {
                const survey = fullSurvey[0]
                if (survey) {
                  allSurveys.push({
                    id: survey.id,
                  scopeType: survey.scopeType,
                  scopeId: survey.scopeId,
                  title: survey.title,
                  description: survey.description,
                  createdBy: survey.createdBy.toString(),
                  createdAt: survey.createdAt,
                  closesAt: survey.closesAt,
                  status: survey.status,
                  rewardFund: survey.rewardFund,
                  fundingInfo: survey.fundingInfo && survey.fundingInfo.length > 0 ? survey.fundingInfo[0] : null,
                  allowAnonymous: survey.allowAnonymous,
                  submissionsCount: survey.submissionsCount
                  })
                }
              }
            }
          } catch (err) {
            console.error(`Error fetching surveys for project ${project.name}:`, err)
          }
        }
        
        setSurveys(allSurveys)
      } catch (err) {
        console.error('Error fetching surveys:', err)
        setError('Failed to load surveys')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [identity])

  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         survey.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || statusToString(survey.status) === statusFilter
    const matchesProject = projectFilter === 'all' || survey.scopeId.toString() === projectFilter
    
    return matchesSearch && matchesStatus && matchesProject
  })

  const getProject = (scopeId: bigint) => {
    return projects.find(p => p.id === scopeId)
  }

  const isExpired = (closesAt: bigint) => {
    return Number(closesAt) / 1_000_000 < Date.now()
  }

  const getStatusBadgeColor = (survey: Survey) => {
    const status = statusToString(survey.status)
    if (status === 'closed') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    if (isExpired(survey.closesAt)) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  }

  const getStatusText = (survey: Survey) => {
    const status = statusToString(survey.status)
    if (status === 'closed') return 'Closed'
    if (isExpired(survey.closesAt)) return 'Expired'
    return 'Active'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Unable to Load Surveys</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Available Surveys
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Participate in surveys and contribute your feedback. Earn ICP rewards for your responses!
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search surveys..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by project" />
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

        {/* Results count */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Found {filteredSurveys.length} survey{filteredSurveys.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Surveys Grid */}
        {filteredSurveys.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Surveys Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || statusFilter !== 'all' || projectFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'No surveys are available at the moment.'}
            </p>
            {(searchTerm || statusFilter !== 'all' || projectFilter !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setProjectFilter('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSurveys.map((survey) => {
              const project = getProject(survey.scopeId)
              const status = getStatusText(survey)
              const isActive = status === 'Active'
              
              return (
                <Card key={survey.id.toString()} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2 line-clamp-2">
                          {survey.title}
                        </CardTitle>
                        {project && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Project: {project.name}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusBadgeColor(survey)}>
                        {status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                      {survey.description}
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4 mr-2" />
                        {survey.submissionsCount.toString()} responses
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4 mr-2" />
                        Closes {formatTimestamp(survey.closesAt)}
                      </div>
                      
                      {survey.fundingInfo && (
                        <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                          <Coins className="w-4 h-4 mr-2" />
                          Reward: {formatReward(survey.fundingInfo)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Link href={`/survey-response?id=${survey.id}`} className="flex-1">
                        <Button 
                          className="w-full" 
                          disabled={!isActive}
                          variant={isActive ? "default" : "secondary"}
                        >
                          {isActive ? 'Take Survey' : 'View Survey'}
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}