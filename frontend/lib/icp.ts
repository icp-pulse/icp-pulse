import { Actor, HttpAgent, type Identity } from '@dfinity/agent'
import { idlFactory as backendIDL } from './polls_surveys_backend.idl'

export type CanisterConfig = { canisterId: string; host?: string }

export function createBackend({ canisterId, host }: CanisterConfig) {
  const agent = new HttpAgent({ host })
  if (host && host.includes('127.0.0.1')) {
    // Fire-and-forget is usually sufficient in dev; calls will await certificate under the hood
    void agent.fetchRootKey()
  }
  return Actor.createActor(backendIDL, { agent, canisterId }) as unknown as import('./types').BackendService
}

export function createBackendWithIdentity({ canisterId, host, identity }: CanisterConfig & { identity: Identity }) {
  const agent = new HttpAgent({ host, identity })
  if (host && host.includes('127.0.0.1')) {
    void agent.fetchRootKey()
  }
  return Actor.createActor(backendIDL, { agent, canisterId }) as unknown as import('./types').BackendService
}
