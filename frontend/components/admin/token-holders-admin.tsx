"use client"

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createActor } from '@/lib/icp'
import {
  Wallet,
  Users,
  TrendingUp,
  RefreshCw,
  Search,
  Copy,
  Download,
  CheckCircle,
  Loader2,
  ArrowUpDown
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface TokenHolder {
  principal: string
  balance: bigint
}

export default function TokenHoldersAdmin() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'balance' | 'principal'>('balance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [copiedPrincipal, setCopiedPrincipal] = useState<string | null>(null)

  // Fetch token holders
  const { data: holders, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['tokenHolders'],
    queryFn: async () => {
      const canisterId = process.env.NEXT_PUBLIC_TOKEN_CANISTER_ID || 'zix77-6qaaa-aaaao-a4pwq-cai'
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'

      // Create actor for tokenmania canister
      const backend = await createActor({
        canisterId,
        host,
        idlFactory: ({ IDL }) => {
          return IDL.Service({
            'get_all_holders': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat))], ['query']),
            'get_holder_count': IDL.Func([], [IDL.Nat], ['query']),
          });
        }
      })

      const result = await backend.get_all_holders() as [any, bigint][]
      return result.map(([principal, balance]) => ({
        principal: principal.toText(),
        balance: balance
      }))
    },
    staleTime: 30000,
    retry: 1,
  })

  // Fetch holder count
  const { data: holderCount } = useQuery({
    queryKey: ['holderCount'],
    queryFn: async () => {
      const canisterId = process.env.NEXT_PUBLIC_TOKEN_CANISTER_ID || 'zix77-6qaaa-aaaao-a4pwq-cai'
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'

      const backend = await createActor({
        canisterId,
        host,
        idlFactory: ({ IDL }) => {
          return IDL.Service({
            'get_holder_count': IDL.Func([], [IDL.Nat], ['query']),
          });
        }
      })

      return Number(await backend.get_holder_count())
    },
    staleTime: 30000,
  })

  const formatTokenAmount = (amount: bigint) => {
    const DECIMALS = 8
    const divisor = BigInt(10 ** DECIMALS)
    const tokens = amount / divisor
    const remainder = amount % divisor
    if (remainder === 0n) {
      return tokens.toString()
    }
    const decimal = remainder.toString().padStart(DECIMALS, '0').replace(/0+$/, '')
    return `${tokens}.${decimal}`
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

  const exportToCSV = () => {
    if (!holders) return

    const csv = [
      ['Principal', 'Balance (PULSE)', 'Balance (e8s)'],
      ...holders.map(h => [h.principal, formatTokenAmount(h.balance), h.balance.toString()])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pulse-token-holders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Export successful",
      description: "Token holders data exported to CSV",
    })
  }

  // Filter and sort holders
  const filteredAndSortedHolders = holders
    ? holders
        .filter(h =>
          h.principal.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
          if (sortBy === 'balance') {
            return sortOrder === 'desc'
              ? Number(b.balance - a.balance)
              : Number(a.balance - b.balance)
          } else {
            return sortOrder === 'desc'
              ? b.principal.localeCompare(a.principal)
              : a.principal.localeCompare(b.principal)
          }
        })
    : []

  const totalSupply = holders?.reduce((sum, h) => sum + h.balance, 0n) || 0n

  const toggleSort = (column: 'balance' | 'principal') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Wallet className="w-8 h-8 text-blue-600" />
              Token Holders
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View all PULSE token holders and their balances
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              disabled={!holders || holders.length === 0}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className="w-5 h-5 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Holders</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {holderCount !== undefined ? holderCount : '-'}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Supply</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatTokenAmount(totalSupply)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PULSE</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {holders && holders.length > 0 ? formatTokenAmount(totalSupply / BigInt(holders.length)) : '0'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PULSE</p>
            </div>
            <Wallet className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by principal ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Holders Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredAndSortedHolders && filteredAndSortedHolders.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => toggleSort('principal')}
                  >
                    <div className="flex items-center gap-2">
                      Principal ID
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => toggleSort('balance')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Balance (PULSE)
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    % of Supply
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedHolders.map((holder, index) => {
                  const percentage = totalSupply > 0n
                    ? (Number(holder.balance) / Number(totalSupply) * 100).toFixed(4)
                    : '0'

                  return (
                    <tr key={holder.principal} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {holder.principal}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatTokenAmount(holder.balance)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => copyToClipboard(holder.principal)}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          title="Copy principal"
                        >
                          {copiedPrincipal === holder.principal ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span className="text-xs">Copy</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {searchQuery ? 'No holders found' : 'No token holders yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {searchQuery ? 'Try adjusting your search query' : 'Token holders will appear here once tokens are distributed'}
          </p>
        </div>
      )}
    </div>
  )
}
