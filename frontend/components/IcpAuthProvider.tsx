"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AuthClient } from '@dfinity/auth-client'
import type { Identity } from '@dfinity/agent'
import { analytics } from '@/lib/analytics'

// Plug wallet type definitions
declare global {
  interface Window {
    ic?: {
      plug?: {
        isConnected: () => Promise<boolean>
        createAgent: (args?: { whitelist?: string[], host?: string }) => Promise<boolean>
        requestConnect: (args?: { whitelist?: string[], host?: string }) => Promise<boolean>
        createActor?: (args: { canisterId: string, interfaceFactory: any }) => Promise<any>
        requestBalance?: () => Promise<any[]>
        disconnect: () => Promise<boolean>
        agent: any
        principalId: string
      }
    }
  }
}

export type IcpAuthContextValue = {
  isAuthenticated: boolean
  principalText: string | null
  identity: Identity | null
  authProvider: 'ii' | 'nfid' | 'plug' | null
  login: (provider?: 'ii' | 'nfid' | 'plug') => Promise<void>
  logout: () => Promise<void>
}

const IcpAuthContext = createContext<IcpAuthContextValue | undefined>(undefined)

export function IcpAuthProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<AuthClient | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [principalText, setPrincipalText] = useState<string | null>(null)
  const [authProvider, setAuthProvider] = useState<'ii' | 'nfid' | 'plug' | null>(null)

  useEffect(() => {
    AuthClient.create().then(async (c) => {
      setClient(c)

      // Check if user is already authenticated from previous session
      const isAuthenticated = await c.isAuthenticated()

      if (isAuthenticated) {
        const id = c.getIdentity()
        setIdentity(id)
        try {
          const p = id.getPrincipal()
          setPrincipalText(p.toText())
          setAuthProvider('ii') // Assume II/NFID for AuthClient sessions
        } catch {
          setPrincipalText(null)
        }
      }
    })

    // Check if Plug is already connected
    if (typeof window !== 'undefined' && window.ic?.plug) {
      window.ic.plug.isConnected().then((connected) => {
        if (connected && window.ic?.plug?.principalId) {
          setPrincipalText(window.ic.plug.principalId)
          setAuthProvider('plug')
          // Note: Plug doesn't provide Identity in the same way, so we keep identity null
        }
      }).catch(() => {
        // Plug not connected, ignore
      })
    }
  }, [])

  const login = useCallback(async (provider: 'ii' | 'nfid' | 'plug' = 'ii') => {
    // Handle Plug wallet separately
    if (provider === 'plug') {
      if (typeof window === 'undefined' || !window.ic?.plug) {
        alert('Plug wallet extension not detected. Please install Plug from https://plugwallet.ooo/')
        return
      }

      try {
        const whitelist = [
          process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID || '',
          process.env.NEXT_PUBLIC_SWAP_CANISTER_ID || '',
          process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID || '',
        ].filter(Boolean)

        const connected = await window.ic.plug.requestConnect({
          whitelist,
          host: process.env.NEXT_PUBLIC_DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4943',
        })

        if (connected && window.ic.plug.principalId) {
          setPrincipalText(window.ic.plug.principalId)
          setAuthProvider('plug')

          // Track login event
          analytics.identify(window.ic.plug.principalId)
          analytics.track('user_login', { method: 'internet_identity' })
        }
      } catch (error) {
        console.error('Plug connection error:', error)
        alert('Failed to connect to Plug wallet. Please try again.')
      }
      return
    }

    // Handle II and NFID
    if (!client) return
    const isLocal = process.env.NEXT_PUBLIC_DFX_NETWORK !== 'ic'

    let identityProvider: string
    let derivationOrigin: string | undefined

    if (provider === 'nfid') {
      identityProvider = isLocal
        ? `https://nfid.one/authenticate/?applicationName=ICP%20Pulse&applicationLogo=${encodeURIComponent('https://utkw6-eyaaa-aaaao-a4o7a-cai.icp0.io/logo.png')}#authorize`
        : `https://nfid.one/authenticate/?applicationName=ICP%20Pulse&applicationLogo=${encodeURIComponent('https://utkw6-eyaaa-aaaao-a4o7a-cai.icp0.io/logo.png')}#authorize`
      derivationOrigin = isLocal ? undefined : 'https://utkw6-eyaaa-aaaao-a4o7a-cai.icp0.io'
    } else {
      identityProvider = isLocal
        ? `http://localhost:4943?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai#authorize`
        : 'https://identity.ic0.app/#authorize'
    }

    await client.login({
      identityProvider,
      ...(derivationOrigin && { derivationOrigin }),
      maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
      onSuccess: async () => {
        const id = client.getIdentity()
        setIdentity(id)
        setAuthProvider(provider)
        try {
          const p = id.getPrincipal()
          const principalText = p.toText()
          setPrincipalText(principalText)

          // Track login event
          analytics.identify(principalText)
          analytics.track('user_login', { method: 'internet_identity' })
        } catch {
          setPrincipalText(null)
        }
      },
    })
  }, [client])

  const logout = useCallback(async () => {
    // Track logout event before clearing state
    analytics.track('user_logout', {})
    analytics.reset()

    // Handle Plug logout
    if (authProvider === 'plug' && typeof window !== 'undefined' && window.ic?.plug) {
      try {
        await window.ic.plug.disconnect()
      } catch (error) {
        console.error('Plug disconnect error:', error)
      }
    }

    // Handle II/NFID logout
    if (client) {
      await client.logout()
    }

    setIdentity(null)
    setPrincipalText(null)
    setAuthProvider(null)

    // Force clear all storage to remove corrupted auth
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }
  }, [client, authProvider])

  const value: IcpAuthContextValue = useMemo(() => ({
    isAuthenticated: !!(principalText && (identity || authProvider === 'plug')),
    principalText,
    identity,
    authProvider,
    login,
    logout,
  }), [identity, principalText, authProvider, login, logout])

  return (
    <IcpAuthContext.Provider value={value}>{children}</IcpAuthContext.Provider>
  )
}

export function useIcpAuth() {
  const ctx = useContext(IcpAuthContext)
  if (!ctx) throw new Error('useIcpAuth must be used within IcpAuthProvider')
  return ctx
}
