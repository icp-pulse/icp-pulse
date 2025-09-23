"use client"

import { useIcpAuth } from '@/components/IcpAuthProvider'
import { WalletBalance } from '@/components/WalletBalance'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Copy, ExternalLink, AlertCircle, Send, QrCode } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function WalletPage() {
  const { identity, isAuthenticated, principalText } = useIcpAuth()
  const [transferAmount, setTransferAmount] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('ues2k-6iwxj-nbezb-owlhg-nsem4-abqjc-74ocv-lsxps-ytjv4-2tphv-yqe')
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferResult, setTransferResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      analytics.track('page_viewed', {
        path: '/wallet',
        page_title: 'Wallet Page'
      })
    }
  }, [isAuthenticated])

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

      // Convert amount to smallest unit (8 decimals)
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
              <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
                <DialogTrigger asChild>
                  <Button className="w-full">
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