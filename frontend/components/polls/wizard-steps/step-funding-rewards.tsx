'use client'

import { useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Coins, Wallet, Users as UsersIcon, Building2, AlertCircle, Info, TrendingUp, DollarSign } from 'lucide-react'
import { UseFormRegister, FieldErrors } from 'react-hook-form'
import type { PollFormValues, RewardDistributionType, FundingSource } from '../poll-form-types'

interface StepFundingRewardsProps {
  register: UseFormRegister<PollFormValues>
  errors: FieldErrors<PollFormValues>
  setValue: (name: any, value: any) => void
  watch: (name: any) => any
  supportedTokens?: any[]
  tokensLoading?: boolean
}

export function StepFundingRewards({
  register,
  errors,
  setValue,
  watch,
  supportedTokens = [],
  tokensLoading = false
}: StepFundingRewardsProps) {
  const fundingEnabled = watch('fundingEnabled')
  const fundingSource = watch('fundingSource') as FundingSource
  const selectedToken = watch('selectedToken')
  const totalFundAmount = watch('totalFundAmount') || 0
  const rewardPerVote = watch('rewardPerVote') || 0
  const rewardDistributionType = watch('rewardDistributionType') as RewardDistributionType
  const maxResponses = watch('maxResponses') || 0

  // Get token info
  const getSelectedTokenInfo = () => {
    if (selectedToken === 'ICP') return { symbol: 'ICP', decimals: 8 }
    if (selectedToken === process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID) {
      return { symbol: 'PULSE', decimals: 8 }
    }
    const tokenData = supportedTokens.find(([principal]) => principal === selectedToken)
    if (tokenData) {
      return { symbol: tokenData[1], decimals: tokenData[2] }
    }
    return { symbol: 'Tokens', decimals: 8 }
  }

  const tokenInfo = getSelectedTokenInfo()

  // Ensure PULSE is set as default when funding is enabled
  useEffect(() => {
    if (fundingEnabled && !selectedToken) {
      const pulseCanisterId = process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID || 'PULSE'
      setValue('selectedToken', pulseCanisterId)
    }
  }, [fundingEnabled, selectedToken, setValue])

  // Calculate rewards based on distribution type
  // Note: Platform fee (10%) is deducted for self-funded and crowdfunded polls
  const calculateRewards = () => {
    // Calculate net fund after platform fee (90% of total for self-funded/crowdfunded)
    const netFund = (fundingSource === 'self-funded' || fundingSource === 'crowdfunded')
      ? totalFundAmount * 0.9
      : totalFundAmount // Treasury-funded doesn't have platform fee

    if (rewardDistributionType === 'equal-split' && maxResponses > 0) {
      const calculatedRewardPerVote = netFund / maxResponses
      return {
        rewardPerVote: calculatedRewardPerVote,
        maxVotes: maxResponses,
        totalFund: totalFundAmount,
        netFund
      }
    } else if (rewardDistributionType === 'fixed' && rewardPerVote > 0) {
      const calculatedMaxVotes = Math.floor(netFund / rewardPerVote)
      return {
        rewardPerVote,
        maxVotes: calculatedMaxVotes,
        totalFund: totalFundAmount,
        netFund
      }
    }
    return { rewardPerVote: 0, maxVotes: 0, totalFund: totalFundAmount, netFund }
  }

  const rewards = calculateRewards()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Coins className="h-6 w-6 text-blue-600" />
          Funding & Rewards
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Incentivize participation by offering token rewards to voters.
        </p>
      </div>

      {/* Enable Funding Toggle */}
      <div className="flex items-start justify-between space-x-4 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
        <div className="flex-1 space-y-1">
          <Label htmlFor="fundingEnabled" className="text-lg font-medium cursor-pointer">
            Enable Token Rewards
          </Label>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Offer rewards to incentivize voters and increase participation
          </p>
        </div>
        <Switch
          id="fundingEnabled"
          checked={fundingEnabled}
          onCheckedChange={(checked) => setValue('fundingEnabled', checked)}
          className="mt-1"
        />
      </div>

      {/* Funding Configuration (shown when enabled) */}
      {fundingEnabled && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Funding Source Selection */}
          <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-5 w-5 text-green-600" />
              <h3 className="text-base font-medium">Funding Source</h3>
            </div>
            <RadioGroup
              value={fundingSource}
              onValueChange={(value: FundingSource) => setValue('fundingSource', value)}
              className="space-y-3"
            >
              {/* Self-Funded */}
              <div className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer">
                <RadioGroupItem value="self-funded" id="self-funded" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="self-funded" className="font-medium cursor-pointer flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-600" />
                    Self-Funded
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    You provide the entire reward pool upfront. Requires token approval.
                  </p>
                </div>
              </div>

              {/* Crowdfunded */}
              <div className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 transition-colors cursor-pointer">
                <RadioGroupItem value="crowdfunded" id="crowdfunded" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="crowdfunded" className="font-medium cursor-pointer flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-purple-600" />
                    Crowdfunded
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Community members can contribute to the reward pool. Great for collaborative polls.
                  </p>
                </div>
              </div>

              {/* Treasury-Funded */}
              <div className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-amber-400 dark:hover:border-amber-500 transition-colors cursor-pointer">
                <RadioGroupItem value="treasury-funded" id="treasury-funded" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="treasury-funded" className="font-medium cursor-pointer flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-600" />
                    Treasury-Funded
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Funded from the project treasury. Requires governance approval.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Token Selection */}
          <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <Label htmlFor="selectedToken" className="text-base font-medium flex items-center gap-2">
              <Coins className="h-5 w-5 text-orange-600" />
              Reward Token
            </Label>
            <Select
              onValueChange={(value) => setValue('selectedToken', value)}
              value={selectedToken}
              defaultValue={process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID || 'PULSE'}
            >
              <SelectTrigger id="selectedToken">
                <SelectValue placeholder="PULSE (Default)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID || 'PULSE'}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">PULSE</span>
                    <span className="text-sm text-gray-500">True Pulse Token</span>
                  </div>
                </SelectItem>
                {!tokensLoading && supportedTokens.map(([principal, symbol, _decimals]) => {
                  if (principal === process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID) return null
                  return (
                    <SelectItem key={principal} value={principal}>
                      <span className="font-medium">{symbol}</span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {tokensLoading && (
              <p className="text-sm text-gray-500">Loading supported tokens...</p>
            )}
          </div>

          {/* Reward Distribution Type */}
          <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-medium">Reward Distribution</h3>
            </div>
            <RadioGroup
              value={rewardDistributionType}
              onValueChange={(value: RewardDistributionType) => {
                setValue('rewardDistributionType', value)
                // Auto-calculate based on type using net fund (after platform fee)
                if (value === 'equal-split' && maxResponses > 0 && totalFundAmount > 0) {
                  const netFund = (fundingSource === 'self-funded' || fundingSource === 'crowdfunded')
                    ? totalFundAmount * 0.9
                    : totalFundAmount
                  setValue('rewardPerVote', netFund / maxResponses)
                }
              }}
              className="space-y-3"
            >
              {/* Fixed Reward */}
              <div className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer">
                <RadioGroupItem value="fixed" id="fixed" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="fixed" className="font-medium cursor-pointer flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    Fixed Reward Per Vote
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Each voter receives a fixed amount. Total votes = Fund ÷ Reward amount
                  </p>
                </div>
              </div>

              {/* Equal Split */}
              <div className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer">
                <RadioGroupItem value="equal-split" id="equal-split" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="equal-split" className="font-medium cursor-pointer flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-green-600" />
                    Equal Split Among Respondents
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Total fund split equally among target respondents. Reward = Fund ÷ Target
                  </p>
                  {rewardDistributionType === 'equal-split' && !maxResponses && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Please set a target number of respondents in Step 3
                    </p>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Funding Amounts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Fund */}
            <div className="space-y-2">
              <Label htmlFor="totalFundAmount" className="text-base font-medium">
                Total Fund Amount ({tokenInfo.symbol})
              </Label>
              <Input
                id="totalFundAmount"
                type="number"
                step="0.01"
                min="0"
                {...register('totalFundAmount', {
                  valueAsNumber: true,
                  onChange: (e) => {
                    const value = parseFloat(e.target.value) || 0
                    if (rewardDistributionType === 'equal-split' && maxResponses > 0) {
                      // Calculate reward per vote using net fund (after platform fee)
                      const netFund = (fundingSource === 'self-funded' || fundingSource === 'crowdfunded')
                        ? value * 0.9
                        : value
                      setValue('rewardPerVote', netFund / maxResponses)
                    }
                  }
                })}
                placeholder="10.00"
              />
              {errors.totalFundAmount && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.totalFundAmount.message}
                </div>
              )}
              <p className="text-sm text-gray-500">
                {fundingSource === 'self-funded'
                  ? 'Amount you will fund upfront'
                  : fundingSource === 'crowdfunded'
                  ? 'Initial amount (others can contribute)'
                  : 'Amount to request from treasury'}
              </p>
            </div>

            {/* Reward Per Vote */}
            <div className="space-y-2">
              <Label htmlFor="rewardPerVote" className="text-base font-medium">
                Reward Per Vote ({tokenInfo.symbol})
              </Label>
              <Input
                id="rewardPerVote"
                type="number"
                step="0.000001"
                min="0"
                {...register('rewardPerVote', { valueAsNumber: true })}
                placeholder="0.25"
                disabled={rewardDistributionType === 'equal-split'}
              />
              {errors.rewardPerVote && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.rewardPerVote.message}
                </div>
              )}
              <p className="text-sm text-gray-500">
                {rewardDistributionType === 'equal-split'
                  ? 'Auto-calculated from total fund'
                  : 'Fixed amount per voter'}
              </p>
            </div>
          </div>

          {/* Funding Summary */}
          {totalFundAmount > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Funding Summary
              </h4>
              <div className="space-y-2 text-sm">
                {/* Platform Fee Breakdown - Only for self-funded and crowdfunded */}
                {(fundingSource === 'self-funded' || fundingSource === 'crowdfunded') && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300">Total Amount:</span>
                      <span className="font-mono font-semibold text-blue-900 dark:text-blue-100">
                        {totalFundAmount.toFixed(2)} {tokenInfo.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Platform Fee (10%):
                      </span>
                      <span className="font-mono text-amber-600 dark:text-amber-400">
                        -{(totalFundAmount * 0.1).toFixed(2)} {tokenInfo.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-blue-200 dark:border-blue-700">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Net Reward Fund:</span>
                      <span className="font-mono font-semibold text-green-700 dark:text-green-300">
                        {(totalFundAmount * 0.9).toFixed(2)} {tokenInfo.symbol}
                      </span>
                    </div>
                  </>
                )}

                {/* Treasury-funded shows full amount (no platform fee) */}
                {fundingSource === 'treasury-funded' && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">Reward Fund:</span>
                    <span className="font-mono font-semibold text-blue-900 dark:text-blue-100">
                      {totalFundAmount.toFixed(2)} {tokenInfo.symbol}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-700">
                  <span className="text-gray-700 dark:text-gray-300">Reward per Vote:</span>
                  <span className="font-mono font-semibold text-green-700 dark:text-green-300">
                    {rewards.rewardPerVote.toFixed(6)} {tokenInfo.symbol}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Max Funded Votes:</span>
                  <span className="font-mono font-semibold text-purple-700 dark:text-purple-300">
                    {rewards.maxVotes} votes
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-blue-200 dark:border-blue-700">
                  <span className="text-gray-600 dark:text-gray-400">Smallest unit:</span>
                  <span className="font-mono text-gray-600 dark:text-gray-400">
                    {Math.floor(totalFundAmount * 100_000_000).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Platform Fee Info Box */}
              {(fundingSource === 'self-funded' || fundingSource === 'crowdfunded') && (
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                  <div className="flex gap-2 text-xs text-blue-700 dark:text-blue-300">
                    <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <p>
                      A 10% platform fee is deducted from your funding to support True Pulse development and operations.
                      The remaining 90% goes directly to voter rewards.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  How rewards work
                </h4>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1 list-disc list-inside">
                  <li>Voters receive {tokenInfo.symbol} rewards directly to their wallets</li>
                  <li>Rewards are distributed automatically upon voting</li>
                  {fundingSource === 'self-funded' && <li>You must approve token transfer before poll creation</li>}
                  {fundingSource === 'crowdfunded' && <li>Others can contribute to increase the reward pool</li>}
                  {fundingSource === 'treasury-funded' && <li>Requires governance approval from the treasury</li>}
                  <li>Once the fund is depleted, voting continues without rewards</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Funding Info */}
      {!fundingEnabled && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <Coins className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
            No Rewards
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This poll will not offer token rewards. Enable rewards above to incentivize participation.
          </p>
        </div>
      )}
    </div>
  )
}
