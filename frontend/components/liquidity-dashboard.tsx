"use client"

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Droplets, TrendingUp, RefreshCw, AlertCircle, ArrowLeftRight, Copy, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from '@/hooks/use-toast'

interface LiquidityData {
  pulseBalance: bigint
  ckusdcBalance: bigint
  exchangeRate: bigint
  spread: bigint
}

interface SwapTransaction {
  timestamp: bigint
  user: any
  direction: { BuyPulse: null } | { SellPulse: null }
  inputAmount: bigint
  outputAmount: bigint
  exchangeRate: bigint
  spreadBps: bigint
}

export function LiquidityDashboard() {
  const [data, setData] = useState<LiquidityData | null>(null)
  const [transactions, setTransactions] = useState<SwapTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [copiedPrincipal, setCopiedPrincipal] = useState<string | null>(null)
  const [effectiveExchangeRate, setEffectiveExchangeRate] = useState<number | null>(null)

  const formatPULSE = (amount: bigint): string => {
    const divisor = 100_000_000n
    const tokens = amount / divisor
    const remainder = amount % divisor
    if (remainder === 0n) return tokens.toString()
    const decimal = remainder.toString().padStart(8, '0').replace(/0+$/, '')
    return `${tokens}.${decimal}`
  }

  const formatCkUSDC = (amount: bigint): string => {
    const divisor = 1_000_000n
    const tokens = amount / divisor
    const remainder = amount % divisor
    if (remainder === 0n) return tokens.toString()
    const decimal = remainder.toString().padStart(6, '0').replace(/0+$/, '')
    return `${tokens}.${decimal}`
  }

  const formatLargeNumber = (num: number, decimals: number = 2): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(num)
  }

  const formatTimestamp = (nanos: bigint): string => {
    try {
      // Convert nanoseconds to milliseconds
      const ms = Number(nanos / 1_000_000n)
      return formatDistanceToNow(new Date(ms), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedPrincipal(text)
    toast({
      title: "Copied to clipboard",
      description: "Principal ID copied successfully",
    })
    setTimeout(() => setCopiedPrincipal(null), 2000)
  }

  const fetchLiquidityData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const swapCanisterId = process.env.NEXT_PUBLIC_SWAP_CANISTER_ID
      if (!swapCanisterId) {
        throw new Error('Swap canister ID not configured')
      }

      const { createActor } = await import('@/lib/icp')
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local'
        ? 'http://127.0.0.1:4943'
        : 'https://ic0.app'

      const swapActor = await createActor({
        canisterId: swapCanisterId,
        host,
        idlFactory: ({ IDL }) => {
          const SwapDirection = IDL.Variant({
            'BuyPulse': IDL.Null,
            'SellPulse': IDL.Null,
          })
          const SwapTransaction = IDL.Record({
            'timestamp': IDL.Int,
            'user': IDL.Principal,
            'direction': SwapDirection,
            'inputAmount': IDL.Nat,
            'outputAmount': IDL.Nat,
            'exchangeRate': IDL.Nat,
            'spreadBps': IDL.Nat,
          })
          return IDL.Service({
            'getPulseBalance': IDL.Func([], [IDL.Nat], []),
            'getCkUSDCBalance': IDL.Func([], [IDL.Nat], []),
            'getExchangeRate': IDL.Func([], [IDL.Nat], ['query']),
            'getSpread': IDL.Func([], [IDL.Nat], ['query']),
            'getSwapHistory': IDL.Func([IDL.Nat], [IDL.Vec(SwapTransaction)], ['query']),
            'calculatePulseAmount': IDL.Func([IDL.Nat], [IDL.Nat], ['query']),
          })
        }
      })

      const [pulseBalance, ckusdcBalance, exchangeRate, spread, history, effectivePulseAmount] = await Promise.all([
        swapActor.getPulseBalance(),
        swapActor.getCkUSDCBalance(),
        swapActor.getExchangeRate(),
        swapActor.getSpread(),
        swapActor.getSwapHistory(50n),
        swapActor.calculatePulseAmount(1_000_000n) // Calculate effective rate for 1 ckUSDC
      ])

      setData({
        pulseBalance: pulseBalance as bigint,
        ckusdcBalance: ckusdcBalance as bigint,
        exchangeRate: exchangeRate as bigint,
        spread: spread as bigint
      })

      // Calculate effective exchange rate (with spread applied)
      const effectiveRate = Number(effectivePulseAmount) / 100_000_000 // Convert from e8s to PULSE
      setEffectiveExchangeRate(effectiveRate)

      setTransactions(history as SwapTransaction[])
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Error fetching liquidity data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load liquidity data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLiquidityData()
  }, [fetchLiquidityData])

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
              <p className="font-medium">Failed to load liquidity data</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <Button onClick={fetchLiquidityData} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const pulseAmount = Number(formatPULSE(data.pulseBalance))
  const ckusdcAmount = Number(formatCkUSDC(data.ckusdcBalance))
  const totalPoolValueUSD = pulseAmount * 0.00975 + ckusdcAmount * 1.0
  const spreadPercentage = Number(data.spread) / 100

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Droplets className="h-8 w-8 text-blue-500" />
            Liquidity Pool
          </h1>
          <p className="text-muted-foreground mt-1">
            PULSE/ckUSDC swap canister balances and recent transactions
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={fetchLiquidityData} variant="outline" size="sm">
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

      {/* Pool Overview Card */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-2xl">Liquidity Pool Overview</CardTitle>
          <CardDescription>
            Total value locked in the PULSE/ckUSDC swap pool
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 mb-2">
                <Droplets className="h-5 w-5" />
                <p className="text-sm font-medium">PULSE Balance</p>
              </div>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {formatLargeNumber(pulseAmount, 2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PULSE tokens</p>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <Droplets className="h-5 w-5" />
                <p className="text-sm font-medium">ckUSDC Balance</p>
              </div>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                ${formatLargeNumber(ckusdcAmount, 2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">ckUSDC tokens</p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-muted-foreground mb-1">Total Pool Value (USD)</p>
            <p className="text-2xl font-bold">${formatLargeNumber(totalPoolValueUSD, 2)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Pool Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-blue-500" />
              Exchange Rate
            </CardTitle>
            <CardDescription>
              Effective rate includes {spreadPercentage.toFixed(2)}% trading spread
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {effectiveExchangeRate ? formatLargeNumber(effectiveExchangeRate, 2) : '...'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PULSE per 1 ckUSDC
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              Spread
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{spreadPercentage.toFixed(2)}%</p>
            <p className="text-sm text-muted-foreground mt-1">
              Trading fee ({Number(data.spread)} basis points)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-500" />
              Total Swaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{transactions.length}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Recent transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recent Swap Transactions
          </CardTitle>
          <CardDescription>
            Last {transactions.length} swap transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No swap transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Input
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Output
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((tx, idx) => {
                    const isBuy = 'BuyPulse' in tx.direction
                    const userPrincipal = tx.user.toText()

                    return (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {formatTimestamp(tx.timestamp)}
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {userPrincipal.slice(0, 8)}...{userPrincipal.slice(-4)}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${isBuy
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800'
                          }`}>
                            {isBuy ? 'Buy PULSE' : 'Sell PULSE'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {isBuy
                            ? `${formatCkUSDC(tx.inputAmount)} ckUSDC`
                            : `${formatPULSE(tx.inputAmount)} PULSE`
                          }
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {isBuy
                            ? `${formatPULSE(tx.outputAmount)} PULSE`
                            : `${formatCkUSDC(tx.outputAmount)} ckUSDC`
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => copyToClipboard(userPrincipal)}
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            title="Copy principal"
                          >
                            {copiedPrincipal === userPrincipal ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
