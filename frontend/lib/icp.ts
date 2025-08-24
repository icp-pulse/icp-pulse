import { Actor, HttpAgent, type Identity } from '@dfinity/agent'
import { idlFactory as backendIDL } from './polls_surveys_backend.idl'

export type CanisterConfig = { canisterId: string; host?: string }


export async function createBackend({ canisterId, host }: CanisterConfig) {
  const isLocal = !!host && (host.includes('127.0.0.1') || host.includes('localhost'))
  
  // Create agent with proper local development settings
  const agent = new HttpAgent({ 
    host, 
    verifyQuerySignatures: !isLocal
  }) as HttpAgent
  
  // For local development, fetch the root key to avoid certificate issues
  if (isLocal) {
    try {
      await agent.fetchRootKey()
    } catch (error) {
      console.warn('Failed to fetch root key:', error)
    }
  }
  
  return Actor.createActor(backendIDL, { agent, canisterId }) as unknown as import('./types').BackendService
}

export async function createBackendWithIdentity({ canisterId, host, identity }: CanisterConfig & { identity: Identity }) {
  const isLocal = !!host && (host.includes('127.0.0.1') || host.includes('localhost'))
  
  const agent = new HttpAgent({ 
    host, 
    identity, 
    verifyQuerySignatures: !isLocal 
  }) as HttpAgent
  
  // For local development, fetch the root key to avoid certificate issues
  if (isLocal) {
    try {
      await agent.fetchRootKey()
    } catch (error) {
      console.warn('Failed to fetch root key:', error)
    }
  }
  
  return Actor.createActor(backendIDL, { agent, canisterId }) as unknown as import('./types').BackendService
}
