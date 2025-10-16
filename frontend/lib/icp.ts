import { Actor, HttpAgent, type Identity } from '@dfinity/agent'
import { idlFactory as customIDL } from './polls_surveys_backend.idl'
import type { IDL } from '@dfinity/candid'

export type CanisterConfig = { canisterId: string; host?: string }
export type CanisterConfigWithIDL = CanisterConfig & { idlFactory: IDL.InterfaceFactory }

// Use custom IDL that includes analytics
export async function createBackend({ canisterId, host }: CanisterConfig) {
  const isLocal = !!host && (host.includes('127.0.0.1') || host.includes('localhost'))

  // Create agent with proper local development settings
  const agent = HttpAgent.createSync({
    host,
    // Note: verifyQuerySignatures is removed as it can cause issues with update calls
    // Update calls use ingress messages, not query signatures
    verifyQuerySignatures: !isLocal
  })

  // For local development, fetch the root key to avoid certificate issues
  if (isLocal) {
    try {
      await agent.fetchRootKey()
    } catch (error) {
      console.warn('Failed to fetch root key:', error)
    }
  }

  return Actor.createActor(customIDL as any, { agent, canisterId }) as any
}

export async function createBackendWithIdentity({ canisterId, host, identity }: CanisterConfig & { identity: Identity | null }) {
  // Handle Plug wallet - use window.ic.plug.createActor if identity is null
  if (!identity && typeof window !== 'undefined' && window.ic?.plug) {
    const plugConnected = await window.ic.plug.isConnected()
    if (plugConnected) {
      try {
        // Use Plug's createActor method which handles agent creation properly
        const actor = await window.ic.plug.createActor({
          canisterId,
          interfaceFactory: customIDL
        })
        return actor
      } catch (error) {
        console.error('Error creating actor with Plug:', error)
        throw new Error('Failed to create actor with Plug wallet')
      }
    }
  }

  if (!identity) {
    throw new Error('No identity provided and Plug wallet not connected')
  }

  const isLocal = !!host && (host.includes('127.0.0.1') || host.includes('localhost'))

  const agent = HttpAgent.createSync({
    host,
    identity,
    // Note: verifyQuerySignatures is removed as it can cause issues with update calls
    // Update calls use ingress messages, not query signatures
    verifyQuerySignatures: !isLocal
  })

  // For local development, fetch the root key to avoid certificate issues
  if (isLocal) {
    try {
      await agent.fetchRootKey()
    } catch (error) {
      console.warn('Failed to fetch root key:', error)
    }
  }

  return Actor.createActor(customIDL as any, { agent, canisterId }) as any
}

// Generic function to create an actor with custom IDL
export async function createActor({ canisterId, host, idlFactory }: CanisterConfigWithIDL) {
  const isLocal = !!host && (host.includes('127.0.0.1') || host.includes('localhost'))

  const agent = HttpAgent.createSync({
    host,
    // Note: verifyQuerySignatures is removed as it can cause issues with update calls
    // Update calls use ingress messages, not query signatures
    verifyQuerySignatures: !isLocal
  })

  if (isLocal) {
    try {
      await agent.fetchRootKey()
    } catch (error) {
      console.warn('Failed to fetch root key:', error)
    }
  }

  return Actor.createActor(idlFactory as any, { agent, canisterId }) as any
}
