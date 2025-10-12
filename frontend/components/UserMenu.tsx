"use client"

import { useIcpAuth } from '@/components/IcpAuthProvider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, Settings, Shield, LogOut, Copy, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

function truncatePrincipal(p: string) {
  return p.slice(0, 6) + '…' + p.slice(-4)
}

export function UserMenu() {
  const { isAuthenticated, principalText, logout } = useIcpAuth()
  const router = useRouter()

  if (!isAuthenticated) {
    return null
  }

  const copyPrincipal = () => {
    if (principalText) {
      navigator.clipboard.writeText(principalText)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-semibold">
              {principalText ? principalText.slice(0, 2).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:block">
            {principalText ? truncatePrincipal(principalText) : 'User'}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">My Account</span>
            <span className="text-xs font-mono text-muted-foreground">
              {principalText ? truncatePrincipal(principalText) : ''}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/wallet')} className="cursor-pointer">
          <User className="h-4 w-4 mr-2" />
          Profile & Wallet
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/token-stats')} className="cursor-pointer">
          <TrendingUp className="h-4 w-4 mr-2" />
          Token Stats
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer">
          <Shield className="h-4 w-4 mr-2" />
          Admin Panel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyPrincipal} className="cursor-pointer">
          <Copy className="h-4 w-4 mr-2" />
          Copy Principal
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 dark:text-red-400">
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
