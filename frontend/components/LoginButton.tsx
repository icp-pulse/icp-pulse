"use client"

import { useIcpAuth } from '@/components/IcpAuthProvider'

function truncatePrincipal(p: string) {
  return p.slice(0, 5) + '…' + p.slice(-5)
}

export function LoginButton() {
  const { isAuthenticated, principalText, login, logout } = useIcpAuth()

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <button className="px-3 py-1 rounded border text-sm" onClick={() => login('ii')}>Log in</button>
        <button className="px-3 py-1 rounded border text-sm" onClick={() => login('nfid')}>NFID</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">{truncatePrincipal(principalText!)}</span>
      <button className="px-3 py-1 rounded border text-sm" onClick={() => logout()}>Log out</button>
    </div>
  )
}
