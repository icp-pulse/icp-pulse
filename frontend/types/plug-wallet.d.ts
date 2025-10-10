// Plug wallet type definitions
declare global {
  interface Window {
    ic?: {
      plug?: {
        isConnected: () => Promise<boolean>
        createAgent: (args?: { whitelist?: string[], host?: string }) => Promise<boolean>
        requestConnect: (args?: { whitelist?: string[], host?: string }) => Promise<boolean>
        createActor: (args: { canisterId: string, interfaceFactory: any }) => Promise<any>
        requestBalance?: () => Promise<any[]>
        disconnect: () => Promise<boolean>
        agent?: any
        principalId?: string
      }
    }
  }
}

export {}
