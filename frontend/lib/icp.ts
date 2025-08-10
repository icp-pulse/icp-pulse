import { Actor, HttpAgent, type Identity } from '@dfinity/agent'
import { idlFactory as backendIDL } from './polls_surveys_backend.idl'

export type CanisterConfig = { canisterId: string; host?: string }

const rootKeyReady: Record<string, Promise<void>> = {}

async function ensureRootKey(agent: HttpAgent, host?: string) {
  const isLocal = !!host && (host.includes('127.0.0.1') || host.includes('localhost'))
  if (!isLocal) return
  if (!rootKeyReady[host!]) {
    rootKeyReady[host!] = agent.fetchRootKey()
  }
  await rootKeyReady[host!]
}

export async function createBackend({ canisterId, host }: CanisterConfig) {
  // Disable certificate verification in local dev to avoid trust errors when server-rendering
  const agent = new HttpAgent({ host, verifyQuerySignatures: host?.includes('127.0.0.1') || host?.includes('localhost') ? false : true }) as HttpAgent
  await ensureRootKey(agent, host)
  return Actor.createActor(backendIDL, { agent, canisterId }) as unknown as import('./types').BackendService
}

export async function createBackendWithIdentity({ canisterId, host, identity }: CanisterConfig & { identity: Identity }) {
  const agent = new HttpAgent({ host, identity, verifyQuerySignatures: host?.includes('127.0.0.1') || host?.includes('localhost') ? false : true }) as HttpAgent
  await ensureRootKey(agent, host)
  return Actor.createActor(backendIDL, { agent, canisterId }) as unknown as import('./types').BackendService
}
