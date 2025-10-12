'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Clock, Users, Award, CheckCircle, Info, TrendingUp, Coins } from 'lucide-react'
import type { Poll } from '@/../../src/declarations/polls_surveys_backend/polls_surveys_backend.did'

interface EnhancedVotingInterfaceProps {
  poll: Poll
  onVote: (optionId: bigint) => Promise<void>
  isVoting: boolean
  hasVoted?: boolean
}

export function EnhancedVotingInterface({
  poll,
  onVote,
  isVoting,
  hasVoted = false
}: EnhancedVotingInterfaceProps) {
  const [selectedOption, setSelectedOption] = useState<bigint | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Set<bigint>>(new Set())

  const isActive = 'active' in poll.status
  const hasFunding = poll.fundingInfo && poll.fundingInfo.length > 0
  const fundingInfo = hasFunding ? poll.fundingInfo[0] : null
  const allowMultiple = false // This should come from poll configuration when implemented

  const formatTimeLeft = (closesAt: bigint) => {
    const now = BigInt(Date.now()) * 1_000_000n
    const timeLeft = Number(closesAt - now)

    if (timeLeft <= 0) return 'Ended'

    const days = Math.floor(timeLeft / (1_000_000 * 1000 * 60 * 60 * 24))
    const hours = Math.floor((timeLeft % (1_000_000 * 1000 * 60 * 60 * 24)) / (1_000_000 * 1000 * 60 * 60))

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`
    return 'Less than 1 hour left'
  }

  const handleVote = async () => {
    if (allowMultiple) {
      // Handle multiple selections (future feature)
      if (selectedOptions.size === 0) return
      // For now, just vote with the first selected option
      const firstOption = Array.from(selectedOptions)[0]
      await onVote(firstOption)
    } else {
      if (selectedOption === null) return
      await onVote(selectedOption)
    }
  }

  const toggleMultipleOption = (optionId: bigint) => {
    const newSelected = new Set(selectedOptions)
    if (newSelected.has(optionId)) {
      newSelected.delete(optionId)
    } else {
      newSelected.add(optionId)
    }
    setSelectedOptions(newSelected)
  }

  const getRewardInfo = () => {
    if (!fundingInfo) return null

    const tokenSymbol = fundingInfo.tokenSymbol
    const rewardPerVote = Number(fundingInfo.rewardPerResponse) / Math.pow(10, fundingInfo.tokenDecimals)
    const remainingFund = Number(fundingInfo.remainingFund) / Math.pow(10, fundingInfo.tokenDecimals)

    return { tokenSymbol, rewardPerVote, remainingFund }
  }

  const rewardInfo = getRewardInfo()

  if (hasVoted) {
    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Thank you for voting!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your vote has been recorded successfully.
            </p>
            {rewardInfo && rewardInfo.rewardPerVote > 0 && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  You&apos;ve earned {rewardInfo.rewardPerVote.toFixed(6)} {rewardInfo.tokenSymbol}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-2">{poll.title}</CardTitle>
            {poll.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {poll.description}
              </p>
            )}
          </div>
          <Badge variant={isActive ? "default" : "secondary"} className="ml-4">
            {isActive ? 'Active' : 'Closed'}
          </Badge>
        </div>

        {/* Poll Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-blue-600" />
            <div>
              <div className="font-medium">{Number(poll.totalVotes)}</div>
              <div className="text-gray-500 text-xs">Total Votes</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-purple-600" />
            <div>
              <div className="font-medium">{formatTimeLeft(poll.closesAt)}</div>
              <div className="text-gray-500 text-xs">Time Left</div>
            </div>
          </div>
          {rewardInfo && rewardInfo.rewardPerVote > 0 && (
            <div className="flex items-center gap-2 text-sm col-span-2 md:col-span-1">
              <Coins className="h-4 w-4 text-green-600" />
              <div>
                <div className="font-medium">{rewardInfo.rewardPerVote.toFixed(6)} {rewardInfo.tokenSymbol}</div>
                <div className="text-gray-500 text-xs">Reward per Vote</div>
              </div>
            </div>
          )}
        </div>

        {/* Reward Banner */}
        {rewardInfo && rewardInfo.rewardPerVote > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">
                  Earn Rewards for Voting!
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Vote now and receive <strong>{rewardInfo.rewardPerVote.toFixed(6)} {rewardInfo.tokenSymbol}</strong> directly to your wallet.
                  {rewardInfo.remainingFund > 0 && (
                    <span className="block mt-1 text-xs">
                      Remaining reward pool: {rewardInfo.remainingFund.toFixed(2)} {rewardInfo.tokenSymbol}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Choose your option{allowMultiple && 's'}
          </h3>
          {allowMultiple && (
            <Badge variant="outline" className="text-xs">
              Multiple selections allowed
            </Badge>
          )}
        </div>

        {/* Voting Options */}
        {allowMultiple ? (
          <div className="space-y-3">
            {poll.options.map((option) => (
              <div
                key={option.id}
                className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400 ${
                  selectedOptions.has(option.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => toggleMultipleOption(option.id)}
              >
                <Checkbox
                  id={`option-${option.id}`}
                  checked={selectedOptions.has(option.id)}
                  onCheckedChange={() => toggleMultipleOption(option.id)}
                />
                <Label
                  htmlFor={`option-${option.id}`}
                  className="flex-1 cursor-pointer text-base"
                >
                  {option.text}
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <RadioGroup
            value={selectedOption?.toString()}
            onValueChange={(value) => setSelectedOption(BigInt(value))}
            className="space-y-3"
          >
            {poll.options.map((option) => (
              <div
                key={option.id}
                className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400 ${
                  selectedOption === option.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => setSelectedOption(option.id)}
              >
                <RadioGroupItem value={option.id.toString()} id={`option-${option.id}`} />
                <Label
                  htmlFor={`option-${option.id}`}
                  className="flex-1 cursor-pointer text-base"
                >
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-4">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Your vote is recorded on the Internet Computer blockchain and cannot be changed after submission.
              {rewardInfo && rewardInfo.rewardPerVote > 0 && ' Rewards are distributed automatically.'}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-6">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          disabled={isVoting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleVote}
          disabled={
            isVoting ||
            !isActive ||
            (allowMultiple ? selectedOptions.size === 0 : selectedOption === null)
          }
          className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
        >
          {isVoting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Vote
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
