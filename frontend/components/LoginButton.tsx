"use client"

import { useIcpAuth } from '@/components/IcpAuthProvider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Wallet, ChevronDown } from 'lucide-react'

export function LoginButton() {
  const { isAuthenticated, login } = useIcpAuth()

  if (isAuthenticated) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Connect Wallet
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => login('ii')} className="cursor-pointer">
          <div className="flex flex-col gap-1 py-1">
            <span className="font-medium">Internet Identity</span>
            <span className="text-xs text-muted-foreground">Official ICP auth</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => login('nfid')} className="cursor-pointer">
          <div className="flex flex-col gap-1 py-1">
            <span className="font-medium">NFID</span>
            <span className="text-xs text-muted-foreground">Email & social login</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => login('plug')} className="cursor-pointer">
          <div className="flex flex-col gap-1 py-1">
            <span className="font-medium">Plug Wallet</span>
            <span className="text-xs text-muted-foreground">Browser extension</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
