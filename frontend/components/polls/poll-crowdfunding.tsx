'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Users, Coins, Target } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import type { Principal } from '@dfinity/principal'

interface PollCrowdfundingProps {
  pollId: bigint
  fundingInfo: {
    tokenSymbol: string
    tokenDecimals: number
    totalFund: bigint
    rewardPerResponse: bigint
    maxResponses: [] | [bigint]
    currentResponses: bigint
    remainingFund: bigint
    fundingType: { SelfFunded: null } | { Crowdfunded: null } | { TreasuryFunded: null }
    contributors: Array<[Principal, bigint]>
    tokenCanister: [] | [string]
  }
  onContribute?: () => void
}

export function PollCrowdfunding({ pollId, fundingInfo, onContribute }: PollCrowdfundingProps) {
  const [amount, setAmount] = useState('')
  const [isContributing, setIsContributing] = useState(false)
  const { identity, isAuthenticated } = useIcpAuth()

  // Check if poll is crowdfunded
  const isCrowdfunded = 'Crowdfunded' in fundingInfo.fundingType

  if (!isCrowdfunded) {
    return null // Don't show for self-funded polls
  }

  const tokenSymbol = fundingInfo.tokenSymbol
  const tokenDecimals = fundingInfo.tokenDecimals
  const totalFundDisplay = Number(fundingInfo.totalFund) / Math.pow(10, tokenDecimals)
  const rewardPerVote = Number(fundingInfo.rewardPerResponse) / Math.pow(10, tokenDecimals)
  const contributorCount = fundingInfo.contributors.length
  const maxResponses = fundingInfo.maxResponses.length > 0 ? fundingInfo.maxResponses[0] : null
  const fundingProgress = maxResponses && Number(maxResponses) > 0
    ? (Number(fundingInfo.currentResponses) / Number(maxResponses)) * 100
    : 0

  const handleContribute = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Not authenticated",
        description: "Please login to contribute to this poll.",
        variant: "destructive",
      })
      return
    }

    const contributionAmount = parseFloat(amount)
    if (isNaN(contributionAmount) || contributionAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid contribution amount.",
        variant: "destructive",
      })
      return
    }

    setIsContributing(true)

    try {
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      // Convert to smallest unit (e8s for most tokens)
      const amountE8s = BigInt(Math.floor(contributionAmount * Math.pow(10, tokenDecimals)))

      // Add buffer for fees - need to be strictly greater than amount + fee
      // Standard ICRC fee is 10000, so we add 20001 to be safe (> amount + 10000)
      const feeBuffer = 20001n
      const approvalAmount = amountE8s + feeBuffer

      // First, approve the backend canister to spend tokens
      // Get token canister ID
      const tokenCanisterId = fundingInfo.tokenCanister[0]
      if (!tokenCanisterId) {
        throw new Error('Token canister not configured')
      }

      console.log('Token canister ID from fundingInfo:', tokenCanisterId)
      console.log('Backend canister ID:', canisterId)
      console.log('Poll ID:', pollId.toString())
      console.log('Full funding info:', fundingInfo)

      // Check if using Plug wallet
      const isPlugWallet = typeof window !== 'undefined' && window.ic?.plug
      const { Principal } = await import('@dfinity/principal')

      if (isPlugWallet && window.ic?.plug) {
        // Use Plug wallet for approval
        console.log('Using Plug wallet for approval...')

        // Request connection to token canister if not already connected
        const whitelist = [tokenCanisterId, canisterId]
        const connected = await (window.ic.plug as any).requestConnect({ whitelist })

        if (!connected) {
          throw new Error('Failed to connect to Plug wallet')
        }

        // Create actor through Plug for the token canister
        const { idlFactory: tokenIdl } = await import('@/../../src/declarations/tokenmania')
        const tokenActor = await window.ic.plug.createActor({
          canisterId: tokenCanisterId,
          interfaceFactory: tokenIdl,
        })

        // Approve using Plug actor
        console.log('Requesting approval via Plug...', {
          spender: canisterId,
          amount: amountE8s.toString(),
          approvalAmount: approvalAmount.toString()
        })

        const approveResult = await tokenActor.icrc2_approve({
          from_subaccount: [],
          spender: {
            owner: Principal.fromText(canisterId),
            subaccount: [],
          },
          amount: approvalAmount,
          expected_allowance: [],
          expires_at: [],
          fee: [],
          memo: [],
          created_at_time: [],
        })

        console.log('Plug approve result:', approveResult)

        if ('Err' in approveResult || approveResult.Err !== undefined) {
          throw new Error(`Failed to approve token transfer: ${JSON.stringify(approveResult.Err || approveResult)}`)
        }
      } else {
        // Use identity-based approval for Internet Identity
        const { Actor, HttpAgent } = await import('@dfinity/agent')
        const { idlFactory: tokenIdl } = await import('@/../../src/declarations/tokenmania')

        const agent = new HttpAgent({
          host,
          identity: identity!
        })

        if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
          await agent.fetchRootKey()
        }

        const tokenActor = Actor.createActor(tokenIdl, {
          agent,
          canisterId: tokenCanisterId,
        })

        console.log('Approving token transfer...', {
          spender: canisterId,
          amount: amountE8s.toString(),
          approvalAmount: approvalAmount.toString()
        })

        const approveResult = await (tokenActor as any).icrc2_approve({
          from_subaccount: [],
          spender: {
            owner: Principal.fromText(canisterId),
            subaccount: [],
          },
          amount: approvalAmount,
          expected_allowance: [],
          expires_at: [],
          fee: [],
          memo: [],
          created_at_time: [],
        })

        console.log('Approve result:', approveResult)

        if ('Err' in approveResult || approveResult.Err !== undefined) {
          throw new Error(`Failed to approve token transfer: ${JSON.stringify(approveResult.Err || approveResult)}`)
        }
      }

      // Wait for the approval to be processed on the ledger
      console.log('Waiting for approval to be processed...')
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Now call fund_poll on backend
      console.log('Calling fund_poll with pollId:', pollId.toString(), 'amount:', amountE8s.toString())

      // Retry logic for fund_poll
      let result: any = null
      let retries = 3
      while (retries > 0) {
        try {
          result = await backend.fund_poll(pollId, amountE8s)
          console.log('fund_poll result:', result)
          break
        } catch (err) {
          console.log('fund_poll attempt failed, retries left:', retries - 1, 'error:', err)
          retries--
          if (retries === 0) throw err
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      if (!result) {
        throw new Error('Failed to get response from backend')
      }

      if ('ok' in result) {
        toast({
          title: "Contribution successful!",
          description: result.ok,
        })
        setAmount('')
        if (onContribute) {
          onContribute()
        }
      } else {
        toast({
          title: "Contribution failed",
          description: result.err,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error contributing to poll:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to contribute to poll",
        variant: "destructive",
      })
    } finally {
      setIsContributing(false)
    }
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
        <CardTitle className="text-lg flex items-center gap-2">
          <Coins className="h-5 w-5 text-blue-600" />
          Crowdfunded Poll
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Funding Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {totalFundDisplay.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Total Fund ({tokenSymbol})
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {rewardPerVote.toFixed(6)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Per Vote ({tokenSymbol})
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {contributorCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <Users className="h-3 w-3 inline mr-1" />
              Contributors
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Funding Progress</span>
            <span className="font-medium">
              {fundingInfo.currentResponses.toString()} / {maxResponses ? maxResponses.toString() : 'Unlimited'} votes funded
            </span>
          </div>
          <Progress value={fundingProgress} className="h-2" />
          <div className="text-xs text-gray-500 text-right">
            {maxResponses ? `${fundingProgress.toFixed(1)}% funded` : 'Budget-based'}
          </div>
        </div>

        {/* Contribution Form */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-medium text-sm">Contribute to this poll</h4>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder={`Amount in ${tokenSymbol}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isContributing}
              className="flex-1"
            />
            <Button
              onClick={handleContribute}
              disabled={isContributing || !amount}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isContributing ? 'Contributing...' : 'Contribute'}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Your contribution will increase the reward pool for voters
          </p>
        </div>

        {/* Contributors List (if any) */}
        {contributorCount > 0 && (
          <div className="pt-4 border-t">
            <h4 className="font-medium text-sm mb-3">Recent Contributors</h4>
            <div className="space-y-2">
              {fundingInfo.contributors.slice(-5).reverse().map(([principal, amount], idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                    {principal.toString().slice(0, 8)}...{principal.toString().slice(-6)}
                  </span>
                  <Badge variant="outline" className="font-mono">
                    {(Number(amount) / Math.pow(10, tokenDecimals)).toFixed(2)} {tokenSymbol}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
