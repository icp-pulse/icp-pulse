import { useQuery } from '@tanstack/react-query'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { createBackendWithIdentity } from './icp'
import type { SupportedToken, TokenInfo } from './types'

// Hook to fetch supported tokens
export function useSupportedTokens() {
  const { identity, isAuthenticated } = useIcpAuth()

  return useQuery({
    queryKey: ['supported-tokens'],
    queryFn: async (): Promise<SupportedToken[]> => {
      const backend = await createBackendWithIdentity(identity)
      return backend.get_supported_tokens()
    },
    enabled: isAuthenticated && !!identity,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

// Hook to validate a custom token
export function useValidateToken(canister: string) {
  const { identity, isAuthenticated } = useIcpAuth()

  return useQuery({
    queryKey: ['validate-token', canister],
    queryFn: async (): Promise<TokenInfo | null> => {
      if (!canister) return null

      const backend = await createBackendWithIdentity(identity)
      const result = await backend.validate_custom_token(canister)

      return result.length > 0 ? result[0] : null
    },
    enabled: isAuthenticated && !!identity && !!canister && canister.length > 20, // Rough check for valid principal
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

// Format token amount with proper decimals
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals)
  const quotient = amount / divisor
  const remainder = amount % divisor

  if (remainder === 0n) {
    return quotient.toString()
  }

  // Convert remainder to decimal string with proper padding
  const remainderStr = remainder.toString().padStart(decimals, '0')
  const trimmedRemainder = remainderStr.replace(/0+$/, '')

  return trimmedRemainder ? `${quotient}.${trimmedRemainder}` : quotient.toString()
}

// Parse token amount from user input
export function parseTokenAmount(amount: string, decimals: number): bigint {
  if (!amount) return 0n

  const [whole, decimal = ''] = amount.split('.')
  const wholePart = BigInt(whole || '0')

  // Pad or truncate decimal part to match token decimals
  const decimalPart = decimal.padEnd(decimals, '0').slice(0, decimals)
  const decimalValue = BigInt(decimalPart || '0')

  return wholePart * BigInt(10 ** decimals) + decimalValue
}

// Well-known token display names and info
export const KNOWN_TOKEN_INFO: Record<string, { name: string; description: string }> = {
  'PULSE': {
    name: 'ICP Pulse Token',
    description: 'Custom token for polls and surveys rewards'
  },
  'ckBTC': {
    name: 'Chain-key Bitcoin',
    description: 'Bitcoin on the Internet Computer'
  },
  'ckETH': {
    name: 'Chain-key Ethereum',
    description: 'Ethereum on the Internet Computer'
  },
  'ckUSDC': {
    name: 'Chain-key USDC',
    description: 'USDC on the Internet Computer'
  },
  'CHAT': {
    name: 'OpenChat Token',
    description: 'OpenChat platform token'
  },
  'SNS1': {
    name: 'SNS-1 Token',
    description: 'Service Nervous System token'
  },
}