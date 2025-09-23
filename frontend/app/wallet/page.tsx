"use client"

import { useIcpAuth } from '@/components/IcpAuthProvider'
import { WalletBalance } from '@/components/WalletBalance'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Copy, ExternalLink, AlertCircle } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import Link from 'next/link'
import { useEffect } from 'react'

export default function WalletPage() {
  const { identity, isAuthenticated, principalText } = useIcpAuth()

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
              <Button asChild className="w-full">
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
                  <p className="text-sm text-muted-foreground">Poll: "What features should we prioritize?"</p>
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
                  <p className="text-sm text-muted-foreground">Voted on "Community governance model"</p>
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