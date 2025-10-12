"use client"

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Coins, TrendingUp, Lock, RefreshCw, AlertCircle, Info } from 'lucide-react'
import {
  PULSE_MAX_SUPPLY,
  PULSE_MAX_SUPPLY_E8S,
  PULSE_DECIMALS,
  PULSE_TRANSFER_FEE_DISPLAY,
  formatPULSE,
  formatLargeNumber
} from '@/lib/token-constants'

interface TokenStatsProps {
  canisterId?: string
}

export function TokenStatsDashboard({ canisterId }: TokenStatsProps) {
  const [totalSupply, setTotalSupply] = useState<bigint | null>(null)
  const [maxSupply, setMaxSupply] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenName, setTokenName] = useState<string>('PULSE')
  const [tokenSymbol, setTokenSymbol] = useState<string>('PULSE')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchTokenStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const tokenCanisterId = canisterId || process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID
      if (!tokenCanisterId) {
        throw new Error('Token canister ID not configured')
      }

      // Import the createActor utility
      const { createActor } = await import('@/lib/icp')

      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local'
        ? 'http://127.0.0.1:4943'
        : 'https://ic0.app'

      // Create actor with IDL that includes icrc1_max_supply
      const tokenActor = await createActor({
        canisterId: tokenCanisterId,
        host,
        idlFactory: ({ IDL }) => {
          return IDL.Service({
            'icrc1_total_supply': IDL.Func([], [IDL.Nat], ['query']),
            'icrc1_name': IDL.Func([], [IDL.Text], ['query']),
            'icrc1_symbol': IDL.Func([], [IDL.Text], ['query']),
            'icrc1_max_supply': IDL.Func([], [IDL.Nat], ['query']),
          });
        }
      })

      // Fetch token stats including max supply from backend
      const [supply, name, symbol, maxSup] = await Promise.all([
        tokenActor.icrc1_total_supply(),
        tokenActor.icrc1_name(),
        tokenActor.icrc1_symbol(),
        tokenActor.icrc1_max_supply()
      ])

      setTotalSupply(supply)
      setMaxSupply(maxSup)
      setTokenName(name)
      setTokenSymbol(symbol)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Error fetching token stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load token stats')
    } finally {
      setLoading(false)
    }
  }, [canisterId])

  useEffect(() => {
    fetchTokenStats()
  }, [fetchTokenStats])

  // Use backend max supply if available, otherwise fallback to constant
  const effectiveMaxSupply = maxSupply || PULSE_MAX_SUPPLY_E8S
  const effectiveMaxSupplyDisplay = maxSupply ? Number(formatPULSE(maxSupply)) : Number(PULSE_MAX_SUPPLY)

  const mintedPercentage = totalSupply && maxSupply
    ? Number((totalSupply * 10000n) / maxSupply) / 100
    : 0
  const remainingSupply = totalSupply && maxSupply ? maxSupply - totalSupply : effectiveMaxSupply
  const totalSupplyFormatted = totalSupply ? Number(formatPULSE(totalSupply)) : 0
  const remainingFormatted = Number(formatPULSE(remainingSupply))

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
            <AlertCircle className="h-6 w-6" />
            <div>
              <p className="font-medium">Failed to load token stats</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <Button onClick={fetchTokenStats} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Coins className="h-8 w-8 text-purple-500" />
            {tokenSymbol} Token Statistics
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time supply and minting information for {tokenName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={fetchTokenStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {lastRefresh && (
            <p className="text-xs text-muted-foreground">
              Updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Supply Overview Card */}
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-2xl">Total Supply Overview</CardTitle>
          <CardDescription>
            Current minted supply out of maximum cap of {formatLargeNumber(effectiveMaxSupplyDisplay)} tokens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Minted: {formatLargeNumber(totalSupplyFormatted, 4)} {tokenSymbol}</span>
              <span>{mintedPercentage.toFixed(4)}%</span>
            </div>
            <Progress value={mintedPercentage} className="h-4" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 {tokenSymbol}</span>
              <span>{formatLargeNumber(effectiveMaxSupplyDisplay)} {tokenSymbol} (Max)</span>
            </div>
          </div>

          {/* Large Numbers Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 mb-2">
                <TrendingUp className="h-5 w-5" />
                <p className="text-sm font-medium">Minted Supply</p>
              </div>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {formatLargeNumber(totalSupplyFormatted, 2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{tokenSymbol} tokens in circulation</p>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <Lock className="h-5 w-5" />
                <p className="text-sm font-medium">Remaining Supply</p>
              </div>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                {formatLargeNumber(remainingFormatted, 2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{tokenSymbol} tokens available to mint</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Maximum Supply Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-500" />
              Maximum Supply
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatLargeNumber(effectiveMaxSupplyDisplay)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tokenSymbol} tokens (fixed cap)
            </p>
            <Badge variant="outline" className="mt-3 bg-blue-50 dark:bg-blue-900/20">
              Enforced by smart contract
            </Badge>
          </CardContent>
        </Card>

        {/* Decimals Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-amber-500" />
              Token Decimals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{PULSE_DECIMALS}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Decimal places for precision
            </p>
            <p className="text-xs text-muted-foreground mt-3 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
              1 {tokenSymbol} = 100,000,000 e8s
            </p>
          </CardContent>
        </Card>

        {/* Transfer Fee Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5 text-green-500" />
              Transfer Fee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{PULSE_TRANSFER_FEE_DISPLAY}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tokenSymbol} per transfer
            </p>
            <p className="text-xs text-muted-foreground mt-3 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
              10,000 e8s
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Supply Cap Information */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Info className="h-5 w-5" />
            About the Maximum Supply Cap
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-blue-900 dark:text-blue-100">
          <p>
            <strong>Fixed Supply:</strong> {tokenName} has a maximum supply of{' '}
            <strong>{formatLargeNumber(effectiveMaxSupplyDisplay)} tokens</strong>, permanently enforced
            at the smart contract level.
          </p>
          <p>
            <strong>No Inflation:</strong> Once the maximum supply is reached, no additional tokens can
            ever be minted. This creates scarcity and protects token holders from dilution.
          </p>
          <p>
            <strong>Transparency:</strong> All minting activity is recorded on-chain and publicly
            verifiable on the Internet Computer blockchain.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
