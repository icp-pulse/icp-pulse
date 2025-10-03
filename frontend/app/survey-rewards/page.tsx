"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { ArrowLeft, Gift, Coins, Users } from 'lucide-react'

export const dynamicParams = true

interface Survey {
  id: bigint
  title: string
  description: string
  submissionsCount: bigint
  fundingInfo: [] | [{
    totalFund: bigint
    rewardPerResponse: bigint
    maxResponses: bigint
    currentResponses: bigint
    remainingFund: bigint
    tokenSymbol: string
    tokenDecimals: number
  }]
}

function SurveyRewardsContent() {
  const { identity, isAuthenticated } = useIcpAuth()
  const searchParams = useSearchParams()
  const surveyId = searchParams.get('surveyId')

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Funding form state
  const [totalFund, setTotalFund] = useState<string>('')
  const [rewardPerResponse, setRewardPerResponse] = useState<number>(0)

  useEffect(() => {
    async function fetchSurvey() {
      if (!identity || !surveyId) {
        setLoading(false)
        return
      }

      try {
        const { createBackendWithIdentity } = await import('@/lib/icp')
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const backend = await createBackendWithIdentity({ canisterId, host, identity })

        const surveyResult = await backend.get_survey(BigInt(surveyId))
        if (surveyResult.length > 0 && surveyResult[0]) {
          const s = surveyResult[0]
          setSurvey(s)

          // Set initial values if already funded
          if (s.fundingInfo.length > 0 && s.fundingInfo[0]) {
            const funding = s.fundingInfo[0]
            const decimals = funding.tokenDecimals || 8
            const totalInTokens = Number(funding.totalFund) / Math.pow(10, decimals)
            const rewardInTokens = Number(funding.rewardPerResponse) / Math.pow(10, decimals)

            setTotalFund(totalInTokens.toString())
            setRewardPerResponse(rewardInTokens)
          }
        }
      } catch (err) {
        console.error('Error fetching survey:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch survey')
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [identity, surveyId])

  const formatTokenAmount = (amount: bigint, decimals: number = 8): string => {
    const divisor = BigInt(Math.pow(10, decimals))
    const quotient = amount / divisor
    const remainder = amount % divisor

    if (remainder === 0n) {
      return quotient.toString()
    }

    const remainderStr = remainder.toString().padStart(decimals, '0')
    const trimmedRemainder = remainderStr.replace(/0+$/, '')

    return trimmedRemainder ? `${quotient}.${trimmedRemainder}` : quotient.toString()
  }

  const calculateMaxResponses = (): number => {
    if (!totalFund || rewardPerResponse <= 0) return 0
    return Math.floor(parseFloat(totalFund) / rewardPerResponse)
  }

  const handleSaveFunding = async () => {
    if (!identity || !surveyId || !survey) return

    if (!totalFund || parseFloat(totalFund) <= 0) {
      setError('Please enter a valid total fund amount')
      return
    }

    if (rewardPerResponse <= 0) {
      setError('Please set a reward per response greater than 0')
      return
    }

    if (rewardPerResponse > parseFloat(totalFund)) {
      setError('Reward per response cannot exceed total fund')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      // Convert to smallest unit (e8s for ICP)
      const decimals = survey.fundingInfo.length > 0 && survey.fundingInfo[0] ? survey.fundingInfo[0].tokenDecimals : 8
      const totalFundE8s = BigInt(Math.floor(parseFloat(totalFund) * Math.pow(10, decimals)))
      const rewardPerResponseE8s = BigInt(Math.floor(rewardPerResponse * Math.pow(10, decimals)))

      // Call backend to update funding
      const result = await backend.update_survey_funding(
        BigInt(surveyId),
        totalFundE8s,
        rewardPerResponseE8s
      )

      if (result) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)

        // Refresh survey data
        const surveyResult = await backend.get_survey(BigInt(surveyId))
        if (surveyResult.length > 0 && surveyResult[0]) {
          setSurvey(surveyResult[0])
        }
      } else {
        setError('Failed to update funding')
      }
    } catch (err) {
      console.error('Error updating funding:', err)
      setError(err instanceof Error ? err.message : 'Failed to update funding')
    } finally {
      setSaving(false)
    }
  }

  if (!surveyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Survey Rewards</h1>
          <p className="text-muted-foreground">No survey ID provided.</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground">Please connect your wallet to manage survey rewards.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading survey...</p>
        </div>
      </div>
    )
  }

  if (error && !survey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-600 mb-6">{error}</p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const fundingInfo = survey?.fundingInfo.length! > 0 ? survey?.fundingInfo[0] : null
  const tokenSymbol = fundingInfo?.tokenSymbol || 'ICP'
  const decimals = fundingInfo?.tokenDecimals || 8
  const maxResponses = calculateMaxResponses()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Surveys
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Survey Rewards Management</h1>
        <p className="text-gray-600">{survey?.title}</p>
      </div>

      {/* Current Funding Status */}
      {fundingInfo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Current Funding Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Fund</p>
                <p className="text-lg font-bold">{formatTokenAmount(fundingInfo.totalFund, decimals)} {tokenSymbol}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Per Response</p>
                <p className="text-lg font-bold">{formatTokenAmount(fundingInfo.rewardPerResponse, decimals)} {tokenSymbol}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Responses Funded</p>
                <p className="text-lg font-bold">{fundingInfo.currentResponses} / {fundingInfo.maxResponses}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Remaining</p>
                <p className="text-lg font-bold">{formatTokenAmount(fundingInfo.remainingFund, decimals)} {tokenSymbol}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funding Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            {fundingInfo ? 'Update Funding' : 'Add Funding'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total Fund Input */}
          <div className="space-y-2">
            <Label htmlFor="totalFund">Total Fund ({tokenSymbol})</Label>
            <Input
              id="totalFund"
              type="number"
              step="0.01"
              min="0"
              value={totalFund}
              onChange={(e) => setTotalFund(e.target.value)}
              placeholder={`Enter total ${tokenSymbol} to allocate`}
            />
            <p className="text-xs text-gray-500">
              Total amount of {tokenSymbol} to fund this survey
            </p>
          </div>

          {/* Reward Per Response Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Reward Per Response ({tokenSymbol})</Label>
              <span className="text-lg font-bold">{rewardPerResponse.toFixed(4)} {tokenSymbol}</span>
            </div>
            <Slider
              value={[rewardPerResponse]}
              onValueChange={(value) => setRewardPerResponse(value[0])}
              max={parseFloat(totalFund) || 100}
              min={0}
              step={0.0001}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Adjust the slider to set reward amount per survey response
            </p>
          </div>

          {/* Calculated Info */}
          {totalFund && rewardPerResponse > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="font-medium">Funding Summary</p>
              </div>
              <div className="text-sm space-y-1">
                <p>• Maximum responses that can be funded: <strong>{maxResponses}</strong></p>
                <p>• Each respondent will receive: <strong>{rewardPerResponse.toFixed(4)} {tokenSymbol}</strong></p>
                <p>• Total allocation: <strong>{parseFloat(totalFund).toFixed(4)} {tokenSymbol}</strong></p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">Funding updated successfully!</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSaveFunding}
              disabled={saving || !totalFund || rewardPerResponse <= 0}
              className="flex-1"
            >
              {saving ? 'Saving...' : fundingInfo ? 'Update Funding' : 'Add Funding'}
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SurveyRewardsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <SurveyRewardsContent />
    </Suspense>
  )
}
