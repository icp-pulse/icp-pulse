"use client"

import { useIcpAuth } from '@/components/IcpAuthProvider'
import { WalletBalance } from '@/components/WalletBalance'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Copy, ExternalLink, AlertCircle, Send, QrCode, ShoppingCart, BarChart, ArrowLeftRight } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function WalletPage() {
  const { identity, isAuthenticated, principalText } = useIcpAuth()
  const [transferAmount, setTransferAmount] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferResult, setTransferResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [buyAmount, setBuyAmount] = useState('')
  const [isBuying, setIsBuying] = useState(false)
  const [buyResult, setBuyResult] = useState<{ success: boolean; message: string } | null>(null)
  const [exchangeRate, setExchangeRate] = useState<bigint | null>(null)
  const [ckUSDCBalance, setCkUSDCBalance] = useState<bigint | null>(null)
  const [pulseBalance, setPulseBalance] = useState<bigint | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [swapDirection, setSwapDirection] = useState<'buy' | 'sell'>('buy') // 'buy' = ckUSDC -> PULSE, 'sell' = PULSE -> ckUSDC
  const [estimatedReceive, setEstimatedReceive] = useState<string | null>(null)
  const [calculatingEstimate, setCalculatingEstimate] = useState(false)
  const [effectiveRate, setEffectiveRate] = useState<string | null>(null)
  const [loadingRate, setLoadingRate] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      analytics.track('page_viewed', {
        path: '/wallet',
        page_title: 'Wallet Page'
      })
    }
  }, [isAuthenticated])

  useEffect(() => {
    const fetchSwapData = async () => {
      if (showBuyModal && principalText) {
        // Check if using Plug wallet
        const isPlugWallet = !identity && typeof window !== 'undefined' && window.ic?.plug

        try {
          setLoadingBalance(true)
          const { HttpAgent, Actor } = await import('@dfinity/agent')
          const { Principal } = await import('@dfinity/principal')
          const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'

          // Fetch exchange rate
          const { createActor: createSwapActor } = await import('../../../src/declarations/swap')
          const swapAgent = HttpAgent.createSync({ host })
          if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
            await swapAgent.fetchRootKey()
          }
          const swapActor = createSwapActor(process.env.NEXT_PUBLIC_SWAP_CANISTER_ID!, { agent: swapAgent })
          const rate = await swapActor.getExchangeRate()
          setExchangeRate(rate)

          // Fetch ckUSDC balance
          const ckUSDCCanisterId = 'xevnm-gaaaa-aaaar-qafnq-cai'
          let balance: bigint

          if (isPlugWallet && window.ic?.plug) {
            // Use Plug wallet
            try {
              // Ensure Plug agent is created with ckUSDC in whitelist
              await (window.ic.plug as any).createAgent({
                whitelist: [ckUSDCCanisterId],
                host
              })

              if (window.ic.plug.createActor) {
                const ckUSDCActor = await window.ic.plug.createActor({
                  canisterId: ckUSDCCanisterId,
                  interfaceFactory: ({ IDL }: any) => IDL.Service({
                    icrc1_balance_of: IDL.Func([
                      IDL.Record({
                        owner: IDL.Principal,
                        subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
                      })
                    ], [IDL.Nat], ['query'])
                  })
                })

                balance = await ckUSDCActor.icrc1_balance_of({
                  owner: Principal.fromText((window.ic.plug as any).principalId),
                  subaccount: []
                })
              } else {
                // Fallback to regular actor if Plug's createActor is not available
                const balanceAgent = HttpAgent.createSync({ host })
                if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
                  await balanceAgent.fetchRootKey()
                }

                const ckUSDCActor = Actor.createActor(
                  ({ IDL }: any) => IDL.Service({
                    icrc1_balance_of: IDL.Func([
                      IDL.Record({
                        owner: IDL.Principal,
                        subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
                      })
                    ], [IDL.Nat], ['query'])
                  }),
                  { agent: (window.ic.plug as any).agent, canisterId: ckUSDCCanisterId }
                ) as { icrc1_balance_of: (args: { owner: any; subaccount: any[] }) => Promise<bigint> }

                balance = await ckUSDCActor.icrc1_balance_of({
                  owner: Principal.fromText((window.ic.plug as any).principalId),
                  subaccount: []
                })
              }
            } catch (plugError) {
              console.error('[Buy PULSE] Plug balance fetch error:', plugError)
              balance = 0n
            }
          } else if (identity) {
            // Use regular agent for II/NFID
            const balanceAgent = HttpAgent.createSync({ host })
            if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
              await balanceAgent.fetchRootKey()
            }
            balanceAgent.replaceIdentity(identity)

            const ckUSDCActor = Actor.createActor(
              ({ IDL }: any) => IDL.Service({
                icrc1_balance_of: IDL.Func([
                  IDL.Record({
                    owner: IDL.Principal,
                    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
                  })
                ], [IDL.Nat], ['query'])
              }),
              { agent: balanceAgent, canisterId: ckUSDCCanisterId }
            ) as { icrc1_balance_of: (args: { owner: any; subaccount: any[] }) => Promise<bigint> }

            balance = await ckUSDCActor.icrc1_balance_of({
              owner: identity.getPrincipal(),
              subaccount: []
            })
          } else {
            balance = 0n
          }

          setCkUSDCBalance(balance)

          // Fetch PULSE balance
          const pulseCanisterId = process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID!
          let pulseBalanceResult: bigint

          if (isPlugWallet && window.ic?.plug) {
            try {
              await (window.ic.plug as any).createAgent({
                whitelist: [pulseCanisterId],
                host
              })

              if (window.ic.plug.createActor) {
                const pulseActor = await window.ic.plug.createActor({
                  canisterId: pulseCanisterId,
                  interfaceFactory: ({ IDL }: any) => IDL.Service({
                    icrc1_balance_of: IDL.Func([
                      IDL.Record({
                        owner: IDL.Principal,
                        subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
                      })
                    ], [IDL.Nat], ['query'])
                  })
                })

                pulseBalanceResult = await pulseActor.icrc1_balance_of({
                  owner: Principal.fromText((window.ic.plug as any).principalId),
                  subaccount: []
                })
              } else {
                const balanceAgent = HttpAgent.createSync({ host })
                if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
                  await balanceAgent.fetchRootKey()
                }

                const pulseActor = Actor.createActor(
                  ({ IDL }: any) => IDL.Service({
                    icrc1_balance_of: IDL.Func([
                      IDL.Record({
                        owner: IDL.Principal,
                        subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
                      })
                    ], [IDL.Nat], ['query'])
                  }),
                  { agent: (window.ic.plug as any).agent, canisterId: pulseCanisterId }
                ) as { icrc1_balance_of: (args: { owner: any; subaccount: any[] }) => Promise<bigint> }

                pulseBalanceResult = await pulseActor.icrc1_balance_of({
                  owner: Principal.fromText((window.ic.plug as any).principalId),
                  subaccount: []
                })
              }
            } catch (plugError) {
              console.error('[Swap Modal] Plug PULSE balance fetch error:', plugError)
              pulseBalanceResult = 0n
            }
          } else if (identity) {
            const balanceAgent = HttpAgent.createSync({ host })
            if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
              await balanceAgent.fetchRootKey()
            }
            balanceAgent.replaceIdentity(identity)

            const pulseActor = Actor.createActor(
              ({ IDL }: any) => IDL.Service({
                icrc1_balance_of: IDL.Func([
                  IDL.Record({
                    owner: IDL.Principal,
                    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
                  })
                ], [IDL.Nat], ['query'])
              }),
              { agent: balanceAgent, canisterId: pulseCanisterId }
            ) as { icrc1_balance_of: (args: { owner: any; subaccount: any[] }) => Promise<bigint> }

            pulseBalanceResult = await pulseActor.icrc1_balance_of({
              owner: identity.getPrincipal(),
              subaccount: []
            })
          } else {
            pulseBalanceResult = 0n
          }

          setPulseBalance(pulseBalanceResult)
        } catch (error) {
          console.error('Error fetching swap data:', error)
          setCkUSDCBalance(0n)
          setPulseBalance(0n)
        } finally {
          setLoadingBalance(false)
        }
      }
    }

    fetchSwapData()
  }, [showBuyModal, identity, principalText])

  // Calculate effective exchange rate with spread
  useEffect(() => {
    const calculateEffectiveRate = async () => {
      if (!showBuyModal) {
        setEffectiveRate(null)
        return
      }

      try {
        const { createActor: createSwapActor } = await import('../../../src/declarations/swap')
        const { HttpAgent } = await import('@dfinity/agent')

        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const swapAgent = HttpAgent.createSync({ host })

        if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
          await swapAgent.fetchRootKey()
        }

        const swapActor = createSwapActor(process.env.NEXT_PUBLIC_SWAP_CANISTER_ID!, { agent: swapAgent })

        const isBuyDirection = swapDirection === 'buy'

        if (isBuyDirection) {
          // For buy: calculate how much PULSE you get for 1 ckUSDC (1,000,000 e6s)
          const oneUSDC = 1_000_000n
          const pulseAmount = await swapActor.calculatePulseAmount(oneUSDC)
          const pulseValue = Number(pulseAmount) / 100_000_000
          setEffectiveRate(`1 ckUSDC = ${pulseValue.toLocaleString()} PULSE`)
        } else {
          // For sell: calculate how much ckUSDC you get for 1 PULSE (100,000,000 e8s)
          const onePulse = 100_000_000n
          const ckUSDCAmount = await swapActor.calculateCkUSDCAmount(onePulse)
          const ckUSDCValue = Number(ckUSDCAmount) / 1_000_000
          setEffectiveRate(`1 PULSE = ${ckUSDCValue.toFixed(6)} ckUSDC`)
        }
      } catch (error) {
        console.error('Error calculating effective rate:', error)
        setEffectiveRate(null)
      }
    }

    calculateEffectiveRate()
  }, [showBuyModal, swapDirection])

  // Calculate estimated receive amount with spread
  useEffect(() => {
    const calculateEstimate = async () => {
      if (!buyAmount || !showBuyModal) {
        setEstimatedReceive(null)
        return
      }

      try {
        setCalculatingEstimate(true)
        const { createActor: createSwapActor } = await import('../../../src/declarations/swap')
        const { HttpAgent } = await import('@dfinity/agent')

        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const swapAgent = HttpAgent.createSync({ host })

        if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
          await swapAgent.fetchRootKey()
        }

        const swapActor = createSwapActor(process.env.NEXT_PUBLIC_SWAP_CANISTER_ID!, { agent: swapAgent })

        const isBuyDirection = swapDirection === 'buy'
        const inputDecimals = isBuyDirection ? 6 : 8 // ckUSDC has 6, PULSE has 8
        const inputAmount = BigInt(Math.floor(parseFloat(buyAmount) * (10 ** inputDecimals)))

        // Call the appropriate calculation function
        const result = isBuyDirection
          ? await swapActor.calculatePulseAmount(inputAmount)
          : await swapActor.calculateCkUSDCAmount(inputAmount)

        // Format the result
        const outputDecimals = isBuyDirection ? 8 : 6 // PULSE has 8, ckUSDC has 6
        const outputAmount = Number(result) / (10 ** outputDecimals)
        const outputToken = isBuyDirection ? 'PULSE' : 'ckUSDC'

        setEstimatedReceive(`${outputAmount.toFixed(6)} ${outputToken}`)
      } catch (error) {
        console.error('Error calculating estimate:', error)
        setEstimatedReceive(null)
      } finally {
        setCalculatingEstimate(false)
      }
    }

    // Debounce the calculation
    const timeoutId = setTimeout(calculateEstimate, 300)
    return () => clearTimeout(timeoutId)
  }, [buyAmount, swapDirection, showBuyModal])

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

  const setMaxAmount = () => {
    if (swapDirection === 'buy' && ckUSDCBalance !== null) {
      // ckUSDC has 6 decimals and 10,000 e6s fee (0.01 ckUSDC)
      // We need to account for:
      // 1. Approval fee: 10,000 e6s (deducted from balance)
      // 2. Transfer_from fee: 10,000 e6s (included in approval amount, deducted from balance)
      // Total fees to reserve: 20,000 e6s (0.02 ckUSDC)
      const feeReserve = 20_000n

      if (ckUSDCBalance > feeReserve) {
        // Max swap amount is balance minus both fees
        const maxSwapAmount = ckUSDCBalance - feeReserve
        const maxAmount = formatTokenAmount(maxSwapAmount, 6)
        setBuyAmount(maxAmount)
      } else {
        setBuyAmount('0')
      }
    } else if (swapDirection === 'sell' && pulseBalance !== null) {
      // PULSE has 8 decimals and 10,000 e8s fee (0.0001 PULSE)
      // We need to account for:
      // 1. Approval fee: 10,000 e8s
      // 2. Transfer_from fee: 10,000 e8s
      // Total fees to reserve: 20,000 e8s (0.0002 PULSE)
      const feeReserve = 20_000n

      if (pulseBalance > feeReserve) {
        // Max swap amount is balance minus both fees
        const maxSwapAmount = pulseBalance - feeReserve
        const maxAmount = formatTokenAmount(maxSwapAmount, 8)
        setBuyAmount(maxAmount)
      } else {
        setBuyAmount('0')
      }
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    analytics.track('button_clicked', {
      button_name: 'copy_wallet_address',
      page: 'wallet'
    })
  }

  const copyReceiveAddress = () => {
    if (principalText) {
      navigator.clipboard.writeText(principalText)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)

      analytics.track('button_clicked', {
        button_name: 'copy_receive_address',
        page: 'wallet'
      })
    }
  }

  const buyPulse = async () => {
    if (!isAuthenticated || !principalText || !buyAmount) {
      setBuyResult({ success: false, message: 'Please enter an amount' })
      return
    }

    try {
      setIsBuying(true)
      setBuyResult(null)

      const { createActor: createSwapActor } = await import('../../../src/declarations/swap')
      const { HttpAgent } = await import('@dfinity/agent')
      const { Principal } = await import('@dfinity/principal')

      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'

      // Check if using Plug wallet
      const isPlugWallet = !identity && typeof window !== 'undefined' && window.ic?.plug

      // Determine which token we're working with based on swap direction
      const isBuyDirection = swapDirection === 'buy'
      const ckUSDCCanisterId = 'xevnm-gaaaa-aaaar-qafnq-cai'
      const pulseCanisterId = process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID!
      const swapCanisterId = process.env.NEXT_PUBLIC_SWAP_CANISTER_ID!

      const tokenCanisterId = isBuyDirection ? ckUSDCCanisterId : pulseCanisterId
      const tokenDecimals = isBuyDirection ? 6 : 8
      const tokenFee = 10_000n // Fee is 10,000 smallest units for both tokens

      let agent: any
      if (isPlugWallet && window.ic?.plug) {
        // Use Plug's agent
        await (window.ic.plug as any).createAgent({
          whitelist: [
            swapCanisterId,
            tokenCanisterId
          ],
          host
        })
        agent = (window.ic.plug as any).agent
      } else if (identity) {
        // Use II/NFID identity
        agent = HttpAgent.createSync({ host })
        if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
          await agent.fetchRootKey()
        }
        agent.replaceIdentity(identity)
      } else {
        throw new Error('No valid authentication method available')
      }

      // Convert input amount to smallest unit based on token decimals
      const tokenAmount = BigInt(Math.floor(parseFloat(buyAmount) * (10 ** tokenDecimals)))

      // Create the IDL interface for ICRC-2
      const tokenIdl = ({ IDL }: any) => {
        const Account = IDL.Record({
          owner: IDL.Principal,
          subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
        })
        const ApproveArgs = IDL.Record({
          fee: IDL.Opt(IDL.Nat),
          memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
          from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
          created_at_time: IDL.Opt(IDL.Nat64),
          amount: IDL.Nat,
          expected_allowance: IDL.Opt(IDL.Nat),
          expires_at: IDL.Opt(IDL.Nat64),
          spender: Account
        })
        const ApproveError = IDL.Variant({
          GenericError: IDL.Record({ message: IDL.Text, error_code: IDL.Nat }),
          TemporarilyUnavailable: IDL.Null,
          Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
          BadFee: IDL.Record({ expected_fee: IDL.Nat }),
          AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
          CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
          TooOld: IDL.Null,
          Expired: IDL.Record({ ledger_time: IDL.Nat64 }),
          InsufficientFunds: IDL.Record({ balance: IDL.Nat })
        })
        return IDL.Service({
          icrc2_approve: IDL.Func(
            [ApproveArgs],
            [IDL.Variant({ Ok: IDL.Nat, Err: ApproveError })],
            []
          )
        })
      }

      // Create token actor for approval
      let tokenActor: any
      if (isPlugWallet && window.ic?.plug?.createActor) {
        // Use Plug's createActor method
        tokenActor = await window.ic.plug.createActor({
          canisterId: tokenCanisterId,
          interfaceFactory: tokenIdl
        })
      } else {
        // Use standard Actor.createActor for II/NFID
        const { Actor } = await import('@dfinity/agent')
        tokenActor = Actor.createActor(tokenIdl, {
          agent,
          canisterId: tokenCanisterId
        })
      }

      // Step 1: Approve swap canister to spend tokens
      // Need to approve: swap amount + transfer_from fee
      const approvalAmount = tokenAmount + tokenFee

      const approveArgs = {
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        amount: approvalAmount,
        expected_allowance: [],
        expires_at: [],
        spender: {
          owner: Principal.fromText(swapCanisterId),
          subaccount: []
        }
      }

      const approveResult: any = await tokenActor.icrc2_approve(approveArgs)

      if ('Err' in approveResult || 'err' in approveResult) {
        const error = 'Err' in approveResult ? approveResult.Err : approveResult.err
        throw new Error(`Approval failed: ${JSON.stringify(error)}`)
      }

      // Step 2: Call swap canister to perform the swap
      let swapActor: any
      if (isPlugWallet && window.ic?.plug?.createActor) {
        // Use Plug's createActor for swap canister
        const swapIdl = await import('../../../src/declarations/swap/swap.did.js')
        swapActor = await window.ic.plug.createActor({
          canisterId: swapCanisterId,
          interfaceFactory: swapIdl.idlFactory
        })
      } else {
        // Use standard createActor for II/NFID
        swapActor = createSwapActor(swapCanisterId, { agent })
      }

      // Call the appropriate swap function based on direction
      const swapResult: any = isBuyDirection
        ? await swapActor.swapCkUSDCForPulse(tokenAmount)
        : await swapActor.swapPulseForCkUSDC(tokenAmount)

      // Check for error in result
      if ('err' in swapResult) {
        throw new Error(`Swap failed: ${JSON.stringify(swapResult.err)}`)
      }

      // Extract received amount from successful result
      const receivedAmount = swapResult.ok || 0n
      const receivedDecimals = isBuyDirection ? 8 : 6 // PULSE has 8, ckUSDC has 6
      const receivedValue = Number(receivedAmount) / (10 ** receivedDecimals)
      const receivedToken = isBuyDirection ? 'PULSE' : 'ckUSDC'

      setBuyResult({
        success: true,
        message: `Successfully swapped! Received ${receivedValue.toLocaleString()} ${receivedToken}`
      })

      // Refresh both balances
      setCkUSDCBalance(null)
      setPulseBalance(null)

      // Close dialog after successful swap
      setTimeout(() => {
        setShowBuyModal(false)
        setBuyAmount('')
        setBuyResult(null)
      }, 3000)

      analytics.track('button_clicked', {
        button_name: isBuyDirection ? 'buy_pulse' : 'sell_pulse',
        page: 'wallet'
      })

    } catch (error) {
      console.error('Swap error:', error)

      // Check if this is the IDL decoding error that happens even when swap succeeds
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('unexpected variant tag') || errorMessage.includes('IDL error')) {
        // The swap likely succeeded despite the error - show a different message
        setBuyResult({
          success: true,
          message: 'Swap submitted! Please refresh to see your updated balance.'
        })

        // Refresh balances
        setCkUSDCBalance(null)
        setPulseBalance(null)

        // Close dialog after 3 seconds
        setTimeout(() => {
          setShowBuyModal(false)
          setBuyAmount('')
          setBuyResult(null)
        }, 3000)
      } else {
        setBuyResult({
          success: false,
          message: `Swap failed: ${errorMessage}`
        })
      }
    } finally {
      setIsBuying(false)
    }
  }

  const transferPulse = async () => {
    if (!identity || !isAuthenticated || !transferAmount || !recipientAddress) {
      setTransferResult({ success: false, message: 'Please fill in all fields' })
      return
    }

    try {
      setIsTransferring(true)
      setTransferResult(null)

      // Import tokenmania canister
      const { createActor } = await import('../../../src/declarations/tokenmania')
      const { HttpAgent } = await import('@dfinity/agent')

      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const agent = HttpAgent.createSync({ host })

      if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
        await agent.fetchRootKey()
      }

      agent.replaceIdentity(identity)

      const tokenmaniaActor = createActor(process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID!, { agent })

      // Convert amount to smallest unit (8 decimals for PULSE)
      // Example: 1.5 PULSE = 150_000_000 e8s (smallest units)
      // Formula: display value * 100_000_000 = e8s value
      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(transferAmount) * 100_000_000))

      // Import Principal to convert string to Principal
      const { Principal } = await import('@dfinity/principal')

      // Perform transfer
      const result = await tokenmaniaActor.icrc1_transfer({
        to: {
          owner: Principal.fromText(recipientAddress),
          subaccount: []
        },
        amount: amountInSmallestUnit,
        fee: [],
        memo: [],
        created_at_time: [],
        from_subaccount: []
      })

      if ('Ok' in result) {
        setTransferResult({
          success: true,
          message: `Successfully transferred ${transferAmount} PULSE tokens! Transaction ID: ${result.Ok}`
        })
        setTransferAmount('')

        analytics.track('button_clicked', {
          button_name: 'transfer_pulse',
          page: 'wallet'
        })
      } else {
        setTransferResult({
          success: false,
          message: `Transfer failed: ${Object.keys(result.Err)[0]}`
        })
      }

    } catch (error) {
      console.error('Transfer error:', error)
      setTransferResult({
        success: false,
        message: `Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsTransferring(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please connect your wallet to view your balance.</p>
          <Button asChild>
            <Link href="/">Connect Wallet</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <Wallet className="h-8 w-8 text-purple-500" />
          My Wallet
        </h1>
        <p className="text-muted-foreground">
          Manage your tokens and view transaction history
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Wallet Balance - Takes 2 columns */}
        <div className="lg:col-span-2">
          <WalletBalance showRefresh={true} />
        </div>

        {/* Wallet Actions Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Swap Tokens
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                  <DialogHeader>
                    <DialogTitle>Swap Tokens</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Swap Direction Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1.5 rounded-md font-medium text-sm transition-colors ${
                            swapDirection === 'buy'
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}>
                            Buy PULSE
                          </div>
                          <Switch
                            checked={swapDirection === 'sell'}
                            onCheckedChange={(checked) => {
                              setSwapDirection(checked ? 'sell' : 'buy')
                              setBuyAmount('')
                              setBuyResult(null)
                              setEstimatedReceive(null)
                            }}
                          />
                          <div className={`px-3 py-1.5 rounded-md font-medium text-sm transition-colors ${
                            swapDirection === 'sell'
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}>
                            Sell PULSE
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Exchange Rate with Spread */}
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="text-sm text-purple-700 dark:text-purple-300">
                        <strong>Exchange Rate:</strong><br />
                        {effectiveRate || 'Loading...'}
                      </div>
                    </div>

                    {/* Balance Display */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            {swapDirection === 'buy' ? 'Your ckUSDC Balance:' : 'Your PULSE Balance:'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-700 dark:text-blue-300">
                            {loadingBalance ? 'Loading...' : (
                              swapDirection === 'buy'
                                ? (ckUSDCBalance !== null ? `${formatTokenAmount(ckUSDCBalance, 6)} ckUSDC` : '0 ckUSDC')
                                : (pulseBalance !== null ? `${formatTokenAmount(pulseBalance, 8)} PULSE` : '0 PULSE')
                            )}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={setMaxAmount}
                            disabled={loadingBalance || (swapDirection === 'buy' ? (ckUSDCBalance === null || ckUSDCBalance === 0n) : (pulseBalance === null || pulseBalance === 0n))}
                            className="h-6 px-2 text-xs"
                          >
                            Max
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                      <Label htmlFor="buyAmount">
                        {swapDirection === 'buy' ? 'ckUSDC Amount' : 'PULSE Amount'}
                      </Label>
                      <Input
                        id="buyAmount"
                        type="number"
                        placeholder={swapDirection === 'buy' ? 'Enter ckUSDC amount' : 'Enter PULSE amount'}
                        value={buyAmount}
                        onChange={(e) => setBuyAmount(e.target.value)}
                        step={swapDirection === 'buy' ? '0.000001' : '0.00000001'}
                        min="0"
                      />
                      {buyAmount && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {calculatingEstimate ? (
                            <>Calculating...</>
                          ) : estimatedReceive ? (
                            <>You will receive: ~{estimatedReceive}</>
                          ) : null}
                        </p>
                      )}
                    </div>

                    {/* Result Message */}
                    {buyResult && (
                      <div className={`p-3 rounded-lg text-sm ${
                        buyResult.success
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}>
                        {buyResult.message}
                      </div>
                    )}

                    {/* Instructions */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {swapDirection === 'buy' ? (
                          <>
                            <strong>How to buy PULSE:</strong><br />
                            1. Ensure you have ckUSDC in your wallet<br />
                            2. Enter the amount of ckUSDC you want to spend<br />
                            3. Click &quot;Execute Swap&quot; to confirm<br />
                            4. Tokens will be swapped instantly
                          </>
                        ) : (
                          <>
                            <strong>How to sell PULSE:</strong><br />
                            1. Ensure you have PULSE in your wallet<br />
                            2. Enter the amount of PULSE you want to sell<br />
                            3. Click &quot;Execute Swap&quot; to confirm<br />
                            4. You will receive ckUSDC instantly
                          </>
                        )}
                      </p>
                    </div>

                    {/* Swap Button */}
                    <Button
                      onClick={buyPulse}
                      disabled={isBuying || !buyAmount}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      {isBuying ? 'Processing...' : 'Execute Swap'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <ArrowDownLeft className="h-4 w-4 mr-2" />
                    Receive PULSE
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                  <DialogHeader>
                    <DialogTitle>Receive PULSE Tokens</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Share your wallet address to receive PULSE tokens
                      </p>

                      {/* QR Code placeholder */}
                      <div className="w-48 h-48 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <div className="text-center">
                          <QrCode className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <p className="text-xs text-gray-500">QR Code</p>
                          <p className="text-xs text-gray-400">{principalText?.slice(0, 8)}...</p>
                        </div>
                      </div>

                      {/* Address display */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Your Wallet Address</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            value={principalText || ''}
                            readOnly
                            className="text-center font-mono text-xs"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyReceiveAddress}
                            className="shrink-0"
                          >
                            {copySuccess ? (
                              <>
                                <AlertCircle className="h-4 w-4 mr-1 text-green-500" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>How to receive PULSE:</strong><br />
                          1. Share this address with the sender<br />
                          2. They can use any ICRC-1 compatible wallet<br />
                          3. Tokens will appear in your balance automatically
                        </p>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" asChild className="w-full">
                <Link href="/rewards">
                  <ArrowDownLeft className="h-4 w-4 mr-2" />
                  Claim Rewards
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link href="/polls">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Participate in Polls
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  View Dashboard
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link href="/token-stats">
                  <BarChart className="h-4 w-4 mr-2" />
                  Token Statistics
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Transfer PULSE Tokens */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transfer PULSE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount (PULSE)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  step="0.00000001"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input
                  id="recipient"
                  type="text"
                  placeholder="Principal ID"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              {transferResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  transferResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                  {transferResult.message}
                </div>
              )}

              <Button
                onClick={transferPulse}
                disabled={isTransferring || !transferAmount || !recipientAddress}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {isTransferring ? 'Transferring...' : 'Transfer PULSE'}
              </Button>
            </CardContent>
          </Card>

          {/* Wallet Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Wallet Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Principal ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono break-all">
                    {principalText}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(principalText!)}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Network</label>
                  <div className="mt-1">
                    <Badge variant={process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'secondary' : 'default'}>
                      {process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'Local' : 'Mainnet'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Auth Method</label>
                  <div className="mt-1">
                    <Badge variant="outline">Internet Identity</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* External Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Explore</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="ghost" asChild className="w-full justify-start">
                <a
                  href={`https://dashboard.internetcomputer.org/account/${principalText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on IC Dashboard
                </a>
              </Button>

              <Button variant="ghost" asChild className="w-full justify-start">
                <a
                  href="https://internetcomputer.org/ecosystem"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  ICP Ecosystem
                </a>
              </Button>

              <Button variant="ghost" asChild className="w-full justify-start">
                <a
                  href="https://identity.ic0.app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Internet Identity
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <ArrowDownLeft className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Reward Claimed</p>
                  <p className="text-sm text-muted-foreground">Poll: &quot;What features should we prioritize?&quot;</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-600">+5.0 PULSE</p>
                <p className="text-sm text-muted-foreground">2 hours ago</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Poll Vote</p>
                  <p className="text-sm text-muted-foreground">Voted on &quot;Community governance model&quot;</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-blue-600">Voted</p>
                <p className="text-sm text-muted-foreground">1 day ago</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <ArrowDownLeft className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Reward Earned</p>
                  <p className="text-sm text-muted-foreground">Survey completion bonus</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-orange-600">+10.0 PULSE</p>
                <p className="text-sm text-muted-foreground">3 days ago</p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                View Full History
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}