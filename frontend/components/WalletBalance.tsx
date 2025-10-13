"use client"

import { useEffect, useState, useCallback } from 'react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { createBackendWithIdentity } from '@/lib/icp'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, RefreshCw, Eye, EyeOff, TrendingUp, Coins, AlertCircle } from 'lucide-react'
import { analytics } from '@/lib/analytics'

interface TokenBalance {
  symbol: string
  balance: bigint
  decimals: number
  canisterId?: string
  usdValue?: number
}

interface WalletBalanceProps {
  compact?: boolean
  showRefresh?: boolean
}

export function WalletBalance({ compact = false, showRefresh = true }: WalletBalanceProps) {
  const { identity, isAuthenticated, principalText } = useIcpAuth()
  const [balances, setBalances] = useState<TokenBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [showBalances, setShowBalances] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [pulseUsdValue, setPulseUsdValue] = useState<number>(0.12) // Default fallback, will be updated from swap canister

  const formatTokenAmount = (amount: bigint, decimals: number): string => {
    const divisor = BigInt(10 ** decimals)
    const quotient = amount / divisor
    const remainder = amount % divisor

    if (remainder === 0n) {
      return quotient.toString()
    }

    const remainderStr = remainder.toString().padStart(decimals, '0')
    const trimmedRemainder = remainderStr.replace(/0+$/, '')

    return trimmedRemainder ? `${quotient}.${trimmedRemainder}` : quotient.toString()
  }

  const fetchBalances = useCallback(async (isRetry: boolean = false) => {
    if (!isAuthenticated || !principalText) return

    // Check if using Plug wallet
    const isPlugWallet = !identity && typeof window !== 'undefined' && window.ic?.plug?.isConnected

    try {
      setLoading(true)
      setError(null)

      if (!isRetry) {
        setRetryCount(0)
      }

      // Track balance check
      analytics.track('page_viewed', {
        path: '/wallet-balance',
        page_title: 'Wallet Balance Check'
      })

      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const tokenBalances: TokenBalance[] = []

      // Fetch PULSE exchange rate from swap canister to calculate USD value
      try {
        const { createActor: createSwapActor } = await import('../../src/declarations/swap')
        const { HttpAgent } = await import('@dfinity/agent')

        const swapAgent = HttpAgent.createSync({ host })
        if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
          await swapAgent.fetchRootKey()
        }

        const swapActor = createSwapActor(process.env.NEXT_PUBLIC_SWAP_CANISTER_ID!, { agent: swapAgent })

        // Get how much ckUSDC you receive for 1 PULSE (100_000_000 e8s)
        const onePulse = 100_000_000n
        const ckUSDCAmount = await swapActor.calculateCkUSDCAmount(onePulse)

        // Convert ckUSDC e6s to dollars (ckUSDC has 6 decimals)
        const usdValue = Number(ckUSDCAmount) / 1_000_000
        setPulseUsdValue(usdValue)
      } catch (error) {
        console.warn('Failed to fetch PULSE exchange rate, using fallback value:', error)
        // Keep the default fallback value of 0.12
      }

      // Get user principal based on auth method
      let userPrincipal: any
      if (isPlugWallet && window.ic?.plug) {
        const { Principal } = await import('@dfinity/principal')
        userPrincipal = Principal.fromText((window.ic.plug as any).principalId)
      } else if (identity) {
        userPrincipal = identity.getPrincipal()
      } else {
        return // Can't proceed without principal
      }

      // Get PULSE token balance using the tokenmania canister
      try {
        const pulseCanisterId = process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID
        if (pulseCanisterId) {
          // Import the tokenmania actor types and factory
          const { createActor } = await import('../../src/declarations/tokenmania')

          let pulseActor: any

          // Use Plug agent if connected via Plug
          if (isPlugWallet && window.ic?.plug) {
            await (window.ic.plug as any).createAgent({
              whitelist: [pulseCanisterId],
              host
            })
            if (window.ic.plug.createActor) {
              pulseActor = await window.ic.plug.createActor({
                canisterId: pulseCanisterId,
                interfaceFactory: (await import('../../src/declarations/tokenmania')).idlFactory
              })
            } else {
              // Fallback if createActor not available
              const { Actor } = await import('@dfinity/agent')
              pulseActor = Actor.createActor(
                (await import('../../src/declarations/tokenmania')).idlFactory,
                { agent: (window.ic.plug as any).agent, canisterId: pulseCanisterId }
              )
            }
          } else if (identity) {
            // Use regular agent for II/NFID
            const { HttpAgent } = await import('@dfinity/agent')
            const agent = HttpAgent.createSync({ host })

            if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
              await agent.fetchRootKey()
            }

            agent.replaceIdentity(identity)
            pulseActor = createActor(pulseCanisterId, { agent })
          } else {
            throw new Error('No valid authentication method')
          }

          // Use the tokenmania interface to get PULSE balance
          const balance = await pulseActor.icrc1_balance_of({
            owner: userPrincipal,
            subaccount: []
          })

          // PULSE uses 8 decimals: 100_000_000 e8s (smallest units) = 1.0 PULSE (displayed)
          const decimals = await pulseActor.icrc1_decimals()

          tokenBalances.push({
            symbol: 'PULSE',
            balance, // Balance in e8s (smallest units), e.g., 100_000_000n = 1.0 PULSE
            decimals, // 8 decimals for PULSE
            canisterId: pulseCanisterId,
            usdValue: getTokenUSDValue('PULSE')
          })
        }
      } catch (error) {
        console.warn('Failed to fetch PULSE balance:', error)
        // Add zero PULSE balance as fallback
        tokenBalances.push({
          symbol: 'PULSE',
          balance: 0n,
          decimals: 8,
          canisterId: process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID || '',
          usdValue: getTokenUSDValue('PULSE')
        })
      }

      // Get supported tokens from backend for other tokens
      try {
        // Skip if no identity available (Plug wallet doesn't provide Identity object)
        if (!identity) {
          throw new Error('No identity available')
        }

        const backendCanisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const backend = await createBackendWithIdentity({ canisterId: backendCanisterId, host, identity })
        const supportedTokens = await backend.get_supported_tokens()

        // Add other supported tokens (as placeholders for now)
        for (const [canisterPrincipal, symbol, decimals] of supportedTokens) {
          if (symbol !== 'PULSE') { // Skip PULSE since we already fetched it
            tokenBalances.push({
              symbol,
              balance: 0n, // Placeholder - would need individual ICRC-1 calls
              decimals,
              canisterId: canisterPrincipal.toString(),
              usdValue: getTokenUSDValue(symbol)
            })
          }
        }
      } catch (error) {
        console.warn('Failed to get supported tokens:', error)
      }

      // Add ICRC-1 compatible tokens (excluding ICP which uses legacy ledger)
      const icrc1Tokens = [
        { symbol: 'ckBTC', decimals: 8, canisterId: 'mxzaz-hqaaa-aaaar-qaada-cai' },
        { symbol: 'ckETH', decimals: 18, canisterId: 'ss2fx-dyaaa-aaaar-qacoq-cai' },
        { symbol: 'ckUSDC', decimals: 6, canisterId: 'xevnm-gaaaa-aaaar-qafnq-cai' }
      ]

      // Fetch ICRC-1 token balances
      for (const token of icrc1Tokens) {
        if (!tokenBalances.some(t => t.symbol === token.symbol)) {
          let balance = 0n

          try {
            let icrc1Actor: any

            if (isPlugWallet && window.ic?.plug) {
              // Use Plug wallet - create actor for the token
              try {
                await (window.ic.plug as any).createAgent({
                  whitelist: [token.canisterId],
                  host
                })

                if (window.ic.plug.createActor) {
                  icrc1Actor = await window.ic.plug.createActor({
                    canisterId: token.canisterId,
                    interfaceFactory: ({ IDL }: any) => IDL.Service({
                      icrc1_balance_of: IDL.Func([
                        IDL.Record({
                          owner: IDL.Principal,
                          subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
                        })
                      ], [IDL.Nat], ['query'])
                    })
                  })

                  balance = await icrc1Actor.icrc1_balance_of({
                    owner: userPrincipal,
                    subaccount: []
                  })
                } else {
                  // Fallback to regular Actor if createActor is not available
                  const { Actor } = await import('@dfinity/agent')
                  icrc1Actor = Actor.createActor(
                    ({ IDL }: any) => IDL.Service({
                      icrc1_balance_of: IDL.Func([
                        IDL.Record({
                          owner: IDL.Principal,
                          subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
                        })
                      ], [IDL.Nat], ['query'])
                    }),
                    { agent: (window.ic.plug as any).agent, canisterId: token.canisterId }
                  )

                  balance = await icrc1Actor.icrc1_balance_of({
                    owner: userPrincipal,
                    subaccount: []
                  })
                }
              } catch (plugError) {
                console.warn(`Failed to fetch ${token.symbol} balance with Plug:`, plugError)
              }
            } else if (identity) {
              // Use regular agent for II/NFID
              const { Actor, HttpAgent } = await import('@dfinity/agent')

              const agent = HttpAgent.createSync({ host })
              if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
                await agent.fetchRootKey()
              }
              agent.replaceIdentity(identity)

              // Create a generic ICRC-1 actor interface
              icrc1Actor = Actor.createActor(
                ({ IDL }) => IDL.Service({
                  icrc1_balance_of: IDL.Func([
                    IDL.Record({
                      owner: IDL.Principal,
                      subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
                    })
                  ], [IDL.Nat], ['query'])
                }),
                { agent, canisterId: token.canisterId }
              ) as { icrc1_balance_of: (args: { owner: any; subaccount: any[] }) => Promise<bigint> }

              balance = await icrc1Actor.icrc1_balance_of({
                owner: userPrincipal,
                subaccount: []
              })
            }
          } catch (error) {
            console.warn(`Failed to fetch ${token.symbol} balance:`, error)
          }

          tokenBalances.push({
            symbol: token.symbol,
            balance,
            decimals: token.decimals,
            canisterId: token.canisterId,
            usdValue: getTokenUSDValue(token.symbol)
          })
        }
      }

      // Add ICP with 0 balance (legacy ledger requires additional setup)
      if (!tokenBalances.some(t => t.symbol === 'ICP')) {
        tokenBalances.push({
          symbol: 'ICP',
          balance: 0n, // TODO: Implement ICP ledger balance fetching
          decimals: 8,
          canisterId: 'rrkah-fqaaa-aaaaa-aaaaq-cai',
          usdValue: getTokenUSDValue('ICP')
        })
      }

      // Sort tokens: PULSE first, then ICP, then others alphabetically
      tokenBalances.sort((a, b) => {
        if (a.symbol === 'PULSE') return -1
        if (b.symbol === 'PULSE') return 1
        if (a.symbol === 'ICP') return -1
        if (b.symbol === 'ICP') return 1
        return a.symbol.localeCompare(b.symbol)
      })

      setBalances(tokenBalances)
      setLastRefresh(new Date())

    } catch (error) {
      console.error('Failed to fetch wallet balances:', error)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to load wallet balances: ${errorMessage}`)

      analytics.track('error_occurred', {
        error_type: 'wallet_balance_fetch_failed',
        error_message: errorMessage,
        component: 'WalletBalance',
        action: 'fetch_balances'
      })

      // Add fallback data on error to ensure UI doesn't break
      if (balances.length === 0) {
        const fallbackTokens = [
          { symbol: 'PULSE', balance: 0n, decimals: 8, canisterId: process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID || '', usdValue: getTokenUSDValue('PULSE') },
          { symbol: 'ICP', balance: 0n, decimals: 8, canisterId: 'rrkah-fqaaa-aaaaa-aaaaq-cai', usdValue: getTokenUSDValue('ICP') },
          { symbol: 'ckBTC', balance: 0n, decimals: 8, canisterId: 'mxzaz-hqaaa-aaaar-qaada-cai', usdValue: getTokenUSDValue('ckBTC') },
          { symbol: 'ckETH', balance: 0n, decimals: 18, canisterId: 'ss2fx-dyaaa-aaaar-qacoq-cai', usdValue: getTokenUSDValue('ckETH') },
          { symbol: 'ckUSDC', balance: 0n, decimals: 6, canisterId: 'xevnm-gaaaa-aaaar-qafnq-cai', usdValue: getTokenUSDValue('ckUSDC') }
        ]
        setBalances(fallbackTokens)
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, identity, principalText, balances.length])

  const retryFetch = async () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1)
      await fetchBalances(true)
    }
  }

  const getTokenUSDValue = (symbol: string): number | undefined => {
    // For PULSE, use the dynamic exchange rate from swap canister
    if (symbol === 'PULSE') {
      return pulseUsdValue
    }

    // Static USD values for other tokens (fallback values)
    const usdValues: Record<string, number> = {
      'ICP': 8.50,
      'ckBTC': 65000,
      'ckETH': 2500,
      'ckUSDC': 1.00,
      'CHAT': 0.05,
      'SNS1': 0.25
    }
    return usdValues[symbol]
  }

  useEffect(() => {
    if (isAuthenticated && principalText) {
      fetchBalances()
    }
  }, [isAuthenticated, principalText, fetchBalances])

  const calculateTotalUSD = () => {
    return balances.reduce((total, token) => {
      if (token.usdValue) {
        const amount = Number(formatTokenAmount(token.balance, token.decimals))
        return total + (amount * token.usdValue)
      }
      return total
    }, 0)
  }

  if (!isAuthenticated) {
    return null
  }

  if (compact) {
    const totalUSD = calculateTotalUSD()
    return (
      <Card className="w-full">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Wallet</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {showBalances ? `$${totalUSD.toFixed(2)}` : '••••••'}
              </p>
              <p className="text-xs text-muted-foreground">{balances.length} tokens</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-500" />
            Wallet Balance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
              className="h-8 w-8 p-0"
            >
              {showBalances ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            {showRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchBalances(false)}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
        {lastRefresh && (
          <p className="text-xs text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
              {retryCount < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryFetch}
                  className="h-8"
                >
                  Retry ({3 - retryCount} left)
                </Button>
              )}
            </div>
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : balances.length > 0 ? (
          <div className="space-y-4">
            {/* Total Portfolio Value */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                  <p className="text-2xl font-bold">
                    {showBalances ? `$${calculateTotalUSD().toFixed(2)}` : '••••••••'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </div>

            {/* Token List */}
            <div className="space-y-3">
              {balances.map((token) => (
                <div key={token.symbol} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {token.symbol.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{token.symbol}</p>
                      {token.canisterId && typeof token.canisterId === 'string' && (
                        <p className="text-xs text-muted-foreground">
                          {token.canisterId.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {showBalances
                        ? `${formatTokenAmount(token.balance, token.decimals)} ${token.symbol}`
                        : '••••••'
                      }
                    </p>
                    {token.usdValue && showBalances && (
                      <p className="text-sm text-muted-foreground">
                        ${(Number(formatTokenAmount(token.balance, token.decimals)) * token.usdValue).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Wallet Info */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Wallet Address:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {principalText?.slice(0, 8)}...{principalText?.slice(-8)}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Coins className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tokens found</h3>
            <p className="text-muted-foreground text-sm">
              Your wallet appears to be empty or tokens are still loading.
            </p>
            <Button
              onClick={() => fetchBalances(false)}
              disabled={loading}
              className="mt-4"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}