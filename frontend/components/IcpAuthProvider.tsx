"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AuthClient } from '@dfinity/auth-client'
import type { Identity } from '@dfinity/agent'

export type IcpAuthContextValue = {
  isAuthenticated: boolean
  principalText: string | null
  identity: Identity | null
  login: (provider?: 'ii' | 'nfid') => Promise<void>
  logout: () => Promise<void>
}

const IcpAuthContext = createContext<IcpAuthContextValue | undefined>(undefined)

export function IcpAuthProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<AuthClient | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [principalText, setPrincipalText] = useState<string | null>(null)

  useEffect(() => {
    AuthClient.create().then(async (c) => {
      setClient(c)
      const id = c.getIdentity()
      setIdentity(id)
      try {
        const p = id.getPrincipal()
        setPrincipalText(p.toText())
      } catch {
        setPrincipalText(null)
      }
    })
  }, [])

  const login = useCallback(async (provider: 'ii' | 'nfid' = 'ii') => {
    if (!client) return
    const isLocal = process.env.NEXT_PUBLIC_DFX_NETWORK !== 'ic'
    const identityProvider = provider === 'nfid'
      ? 'https://nfid.one/authenticate/?applicationName=ICP%20Polls%20%26%20Surveys#authorize'
      : 'https://identity.ic0.app/#authorize'

    await client.login({
      identityProvider,
      onSuccess: async () => {
        const id = client.getIdentity()
        setIdentity(id)
        try {
          const p = id.getPrincipal()
          setPrincipalText(p.toText())
        } catch {
          setPrincipalText(null)
        }
      },
    })
  }, [client])

  const logout = useCallback(async () => {
    if (!client) return
    await client.logout()
    setIdentity(null)
    setPrincipalText(null)
  }, [client])

  const value: IcpAuthContextValue = useMemo(() => ({
    isAuthenticated: !!identity && !!principalText,
    principalText,
    identity,
    login,
    logout,
  }), [identity, principalText, login, logout])

  return (
    <IcpAuthContext.Provider value={value}>{children}</IcpAuthContext.Provider>
  )
}

export function useIcpAuth() {
  const ctx = useContext(IcpAuthContext)
  if (!ctx) throw new Error('useIcpAuth must be used within IcpAuthProvider')
  return ctx
}
