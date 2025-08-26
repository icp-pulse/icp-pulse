"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Clock, Users, Coins, CheckCircle, AlertCircle } from 'lucide-react'
import { useIcpAuth } from '@/components/IcpAuthProvider'

interface Question {
  id: bigint
  qType: { single: null } | { multi: null } | { likert: null } | { short: null } | { long: null } | { number: null } | { rating: null }
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
  closesAt: bigint
  status: { active: null } | { closed: null }
  allowAnonymous: boolean
  questions: Question[]
  submissionsCount: bigint
  fundingInfo?: {
    totalFund: bigint
    rewardPerResponse: bigint
    maxResponses: bigint
    currentResponses: bigint
    remainingFund: bigint
  } | null
}

function getQuestionType(qType: any): string {
  if (qType.single !== undefined) return 'single'
  if (qType.multi !== undefined) return 'multi'
  if (qType.likert !== undefined) return 'likert'
  if (qType.short !== undefined) return 'short'
  if (qType.long !== undefined) return 'long'
  if (qType.number !== undefined) return 'number'
  if (qType.rating !== undefined) return 'rating'
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

function SurveyResponseContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const surveyId = searchParams.get('id')
  const { identity } = useIcpAuth()

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [answers, setAnswers] = useState<Record<string, any>>({})

  useEffect(() => {
    async function fetchSurvey() {
      if (!identity || !surveyId) return

      try {
        const { createBackendWithIdentity } = await import('@/lib/icp')
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const backend = await createBackendWithIdentity({ canisterId, host, identity })

        const surveyResult = await backend.get_survey(BigInt(surveyId))
        if (surveyResult && surveyResult.length > 0) {
          const surveyData = surveyResult[0]
          if (surveyData) {
            setSurvey({
              id: surveyData.id,
              title: surveyData.title,
              description: surveyData.description,
              closesAt: surveyData.closesAt,
              status: surveyData.status,
              allowAnonymous: surveyData.allowAnonymous,
              questions: surveyData.questions,
              submissionsCount: surveyData.submissionsCount,
              fundingInfo: surveyData.fundingInfo && surveyData.fundingInfo.length > 0 ? surveyData.fundingInfo[0] : null
            })
          } else {
            setError('Survey not found')
          }
        } else {
          setError('Survey not found')
        }
      } catch (err) {
        console.error('Error fetching survey:', err)
        setError('Failed to load survey')
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [identity, surveyId])

  const handleAnswerChange = (questionId: bigint, value: any, type: string) => {
    const key = questionId.toString()
    setAnswers(prev => ({
      ...prev,
      [key]: { value, type, questionId }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!survey || !identity || !surveyId) return

    setSubmitting(true)
    setError(null)

    try {
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      // Validate required questions
      for (const question of survey.questions) {
        if (question.required) {
          const answer = answers[question.id.toString()]
          if (!answer || (answer.value === '' || answer.value === undefined || answer.value === null)) {
            throw new Error(`Please answer the required question: "${question.text}"`)
          }
        }
      }

      // Convert answers to backend format (using Candid optional format)
      const formAnswers = Object.values(answers).map((answer: any) => {
        const { questionId, value, type } = answer
        
        const formAnswer: any = { 
          questionId,
          nat: [],
          nats: [],
          text: []
        }
        
        switch (type) {
          case 'single':
          case 'rating':
          case 'likert':
          case 'number':
            if (typeof value === 'number') {
              formAnswer.nat = [BigInt(value)]
            } else if (typeof value === 'string' && !isNaN(Number(value))) {
              formAnswer.nat = [BigInt(Number(value))]
            }
            break
          case 'multi':
            if (Array.isArray(value) && value.length > 0) {
              formAnswer.nats = [value.map((v: number) => BigInt(v))]
            }
            break
          case 'short':
          case 'long':
            const textValue = value?.toString()?.trim()
            if (textValue) {
              formAnswer.text = [textValue]
            }
            break
        }
        
        return formAnswer
      })

      console.log('Submitting answers:', formAnswers)
      
      const result = await backend.submit_survey(BigInt(surveyId), formAnswers)
      
      if (result) {
        setSuccess(true)
        // Auto redirect after 3 seconds
        setTimeout(() => {
          router.push('/surveys')
        }, 3000)
      } else {
        throw new Error('Failed to submit survey response')
      }
    } catch (err: any) {
      console.error('Error submitting survey:', err)
      setError(err.message || 'Failed to submit survey response')
    } finally {
      setSubmitting(false)
    }
  }

  const isExpired = (closesAt: bigint) => {
    return Number(closesAt) / 1_000_000 < Date.now()
  }

  const canSubmit = () => {
    if (!survey) return false
    const status = getStatusText(survey)
    return status === 'Active'
  }
  
  const statusToString = (status: any): string => {
    if (!status) return 'unknown'
    if (status.active !== undefined) return 'active'
    if (status.closed !== undefined) return 'closed'
    if (typeof status === 'string') return status
    return 'unknown'
  }
  
  const getStatusText = (survey: Survey) => {
    const status = statusToString(survey.status)
    if (status === 'closed') return 'Closed'
    if (isExpired(survey.closesAt)) return 'Expired'
    return 'Active'
  }

  if (!surveyId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Survey ID Missing</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">No survey ID provided in the URL.</p>
            <Button onClick={() => router.push('/surveys')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Surveys
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="animate-pulse space-y-4 max-w-2xl w-full">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Survey Not Available</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={() => router.push('/surveys')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Surveys
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Response Submitted!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Thank you for your response. 
              {survey?.fundingInfo && ` You've earned ${formatReward(survey.fundingInfo)} for participating!`}
            </p>
            <p className="text-sm text-gray-500 mb-4">Redirecting to surveys page...</p>
            <Button onClick={() => router.push('/surveys')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Surveys
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!survey) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/surveys')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Surveys
          </Button>
          
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{survey.title}</CardTitle>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{survey.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4 mr-1" />
                      {survey.submissionsCount.toString()} responses
                    </div>
                    
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4 mr-1" />
                      Closes {formatTimestamp(survey.closesAt)}
                    </div>
                    
                    {survey.fundingInfo && (
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Coins className="w-4 h-4 mr-1" />
                        Reward: {formatReward(survey.fundingInfo)}
                      </div>
                    )}
                  </div>
                </div>
                
                <Badge className={canSubmit() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {canSubmit() ? 'Active' : 'Closed'}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Survey Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {survey.questions.map((question, index) => {
              const questionType = getQuestionType(question.qType)
              const questionKey = question.id.toString()
              
              return (
                <Card key={question.id.toString()}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-start gap-2">
                      <span className="text-sm bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 min-w-fit">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        {question.text}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                    </CardTitle>
                    {question.helpText.length > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 ml-12">
                        {question.helpText[0]}
                      </p>
                    )}
                  </CardHeader>
                  
                  <CardContent className="ml-12">
                    {questionType === 'single' && question.choices.length > 0 && (
                      <RadioGroup
                        onValueChange={(value) => handleAnswerChange(question.id, parseInt(value), 'single')}
                        disabled={!canSubmit()}
                      >
                        {question.choices[0]?.map((choice, choiceIndex) => (
                          <div key={choiceIndex} className="flex items-center space-x-2">
                            <RadioGroupItem value={choiceIndex.toString()} id={`${questionKey}-${choiceIndex}`} />
                            <Label htmlFor={`${questionKey}-${choiceIndex}`}>{choice}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    
                    {questionType === 'multi' && question.choices.length > 0 && (
                      <div className="space-y-2">
                        {question.choices[0]?.map((choice, choiceIndex) => (
                          <div key={choiceIndex} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`${questionKey}-${choiceIndex}`}
                              disabled={!canSubmit()}
                              onCheckedChange={(checked) => {
                                const currentAnswers = answers[questionKey]?.value || []
                                let newAnswers
                                if (checked) {
                                  newAnswers = [...currentAnswers, choiceIndex]
                                } else {
                                  newAnswers = currentAnswers.filter((i: number) => i !== choiceIndex)
                                }
                                handleAnswerChange(question.id, newAnswers, 'multi')
                              }}
                            />
                            <Label htmlFor={`${questionKey}-${choiceIndex}`}>{choice}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {(questionType === 'likert' || questionType === 'rating') && (
                      <div>
                        <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                          <span>{question.min.length > 0 ? Number(question.min[0]) : 1}</span>
                          <span>{question.max.length > 0 ? Number(question.max[0]) : 5}</span>
                        </div>
                        <RadioGroup
                          onValueChange={(value) => handleAnswerChange(question.id, parseInt(value), questionType)}
                          disabled={!canSubmit()}
                          className="flex gap-4"
                        >
                          {Array.from({ length: Number(question.max.length > 0 ? question.max[0] : 5n) - Number(question.min.length > 0 ? question.min[0] : 1n) + 1 }, (_, i) => {
                            const value = Number(question.min.length > 0 ? question.min[0] : 1n) + i
                            return (
                              <div key={value} className="flex flex-col items-center">
                                <RadioGroupItem value={value.toString()} id={`${questionKey}-${value}`} />
                                <Label htmlFor={`${questionKey}-${value}`} className="text-xs mt-1">{value}</Label>
                              </div>
                            )
                          })}
                        </RadioGroup>
                      </div>
                    )}
                    
                    {questionType === 'short' && (
                      <Input
                        placeholder="Enter your answer..."
                        onChange={(e) => handleAnswerChange(question.id, e.target.value, 'short')}
                        disabled={!canSubmit()}
                      />
                    )}
                    
                    {questionType === 'long' && (
                      <Textarea
                        placeholder="Enter your detailed answer..."
                        rows={4}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value, 'long')}
                        disabled={!canSubmit()}
                      />
                    )}
                    
                    {questionType === 'number' && (
                      <Input
                        type="number"
                        placeholder="Enter a number..."
                        min={question.min.length > 0 ? Number(question.min[0]) : undefined}
                        max={question.max.length > 0 ? Number(question.max[0]) : undefined}
                        onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value), 'number')}
                        disabled={!canSubmit()}
                      />
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {error && (
            <Card className="mt-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-center text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/surveys')}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!canSubmit() || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Response'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SurveyResponsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="animate-pulse space-y-4 max-w-2xl w-full">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <SurveyResponseContent />
    </Suspense>
  )
}