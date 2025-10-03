"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Users, Calendar, CheckCircle } from 'lucide-react'

interface Answer {
  questionId: bigint
  value: { nat?: bigint; nats?: bigint[]; text?: string }
}

interface Submission {
  id: bigint
  surveyId: bigint
  respondent: [] | [any]
  submittedAt: bigint
  answers: Answer[]
}

interface Question {
  id: bigint
  qType: any
  text: string
  required: boolean
  choices: [] | [string[]]
  min: [] | [bigint]
  max: [] | [bigint]
  helpText: [] | [string]
}

interface Survey {
  id: bigint
  title: string
  description: string
  questions: Question[]
  submissionsCount: bigint
  status: any
  createdAt: bigint
}

function SurveyResultsContent() {
  const { identity, isAuthenticated } = useIcpAuth()
  const searchParams = useSearchParams()
  const surveyId = searchParams.get('surveyId')

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSurveyResults() {
      if (!identity || !surveyId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { createBackendWithIdentity } = await import('@/lib/icp')
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const backend = await createBackendWithIdentity({ canisterId, host, identity })

        // Fetch survey details
        const surveyResult = await backend.get_survey(BigInt(surveyId))
        if (surveyResult.length > 0 && surveyResult[0]) {
          setSurvey(surveyResult[0])
        }

        // Fetch submissions
        const submissionsResult = await backend.get_survey_submissions(BigInt(surveyId))
        setSubmissions(submissionsResult)

      } catch (err) {
        console.error('Error fetching survey results:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch survey results')
      } finally {
        setLoading(false)
      }
    }

    fetchSurveyResults()
  }, [identity, surveyId])

  const getQuestionType = (qType: any): string => {
    if ('single' in qType) return 'Single Choice'
    if ('multi' in qType) return 'Multiple Choice'
    if ('likert' in qType) return 'Likert Scale'
    if ('short' in qType) return 'Short Text'
    if ('long' in qType) return 'Long Text'
    if ('number' in qType) return 'Number'
    if ('rating' in qType) return 'Rating'
    return 'Unknown'
  }

  const formatAnswerValue = (question: Question, value: any): string => {
    if (value.nat !== undefined) {
      const choices = question.choices.length > 0 ? question.choices[0] : []
      if (choices && choices.length > 0 && Number(value.nat) < choices.length) {
        return choices[Number(value.nat)]
      }
      return value.nat.toString()
    }
    if (value.nats !== undefined) {
      const choices = question.choices.length > 0 ? question.choices[0] : []
      return value.nats.map((n: bigint) => {
        const idx = Number(n)
        return choices && choices.length > 0 && idx < choices.length ? choices[idx] : n.toString()
      }).join(', ')
    }
    if (value.text !== undefined) {
      return value.text
    }
    return 'N/A'
  }

  const downloadCSV = async () => {
    if (!identity || !surveyId) return

    try {
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      const csvBlob = await backend.export_survey_csv(BigInt(surveyId))
      const blob = new Blob([csvBlob], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `survey-${surveyId}-results.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading CSV:', err)
    }
  }

  if (!surveyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Survey Results</h1>
          <p className="text-muted-foreground">No survey ID provided. Please select a survey to view results.</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground">Please connect your wallet to view survey results.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading survey results...</p>
        </div>
      </div>
    )
  }

  if (error || !survey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-600 mb-6">{error || 'Survey not found'}</p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Surveys
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{survey.title}</h1>
            <p className="text-gray-600 mb-4">{survey.description}</p>
          </div>
          <Button onClick={downloadCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Responses</p>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Questions</p>
                  <p className="text-2xl font-bold">{survey.questions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className="mt-1" variant={'active' in survey.status ? 'default' : 'secondary'}>
                    {'active' in survey.status ? 'Active' : 'Closed'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submissions */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Responses ({submissions.length})</h2>

        {submissions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
              <p className="text-gray-500">Responses will appear here once users submit the survey.</p>
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Response #{idx + 1}</CardTitle>
                  <div className="text-sm text-gray-500">
                    {new Date(Number(submission.submittedAt) / 1000000).toLocaleString()}
                  </div>
                </div>
                {submission.respondent.length > 0 && (
                  <p className="text-xs text-gray-500 font-mono">
                    {submission.respondent[0].toString()}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submission.answers.map((answer, ansIdx) => {
                    const question = survey.questions.find(q => q.id === answer.questionId)
                    if (!question) return null

                    return (
                      <div key={ansIdx} className="border-l-2 border-blue-500 pl-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-gray-900">{question.text}</p>
                          <Badge variant="outline" className="text-xs">
                            {getQuestionType(question.qType)}
                          </Badge>
                        </div>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded">
                          {formatAnswerValue(question, answer.value)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default function SurveyResultsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading survey results...</p>
        </div>
      </div>
    }>
      <SurveyResultsContent />
    </Suspense>
  )
}
