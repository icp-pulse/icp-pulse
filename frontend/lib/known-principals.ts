/**
 * Known Principal IDs and their human-readable labels
 *
 * This file maps Principal IDs to user-friendly labels for display in the UI.
 * Used primarily in token holder displays and analytics.
 */

export interface PrincipalInfo {
  label: string
  type: 'canister' | 'treasury' | 'team' | 'community' | 'exchange'
  description?: string
}

export const KNOWN_PRINCIPALS: Record<string, PrincipalInfo> = {
  // Minting Account & Treasury
  'amjys-ncnt7-asur4-tubzo-hg6f4-5x5vi-udwtl-myst6-bphlp-tnmpu-7qe': {
    label: 'PULSE Treasury & Minting Account',
    type: 'treasury',
    description: 'Token deployer account holding unminted reserves'
  },

  // IDO Platform
  'eay2e-iyaaa-aaaai-atlyq-cai': {
    label: 'IDO Platform',
    type: 'canister',
    description: 'Initial DEX Offering platform for token distribution'
  },

  // ICP Pulse Canisters (from canister_ids.json)
  '27ftn-piaaa-aaaao-a4p6a-cai': {
    label: 'Airdrop Canister',
    type: 'canister',
    description: 'Manages PULSE token airdrops and quest rewards'
  },
  'u2j5c-sqaaa-aaaao-a4o6q-cai': {
    label: 'Polls & Surveys Backend',
    type: 'canister',
    description: 'Handles polls, surveys, and voting logic'
  },
  'utkw6-eyaaa-aaaao-a4o7a-cai': {
    label: 'Frontend Canister',
    type: 'canister',
    description: 'Serves the ICP Pulse web application'
  },
  'zbuud-iyaaa-aaaao-a4pxa-cai': {
    label: 'Pulse Index',
    type: 'canister',
    description: 'Indexes and tracks PULSE token transactions'
  },
  '2ndeu-dyaaa-aaaao-a4p5a-cai': {
    label: 'PulseG Canister',
    type: 'canister',
    description: 'Governance token management'
  },
  '2kcca-oaaaa-aaaao-a4p5q-cai': {
    label: 'Staking Canister',
    type: 'canister',
    description: 'Manages PULSE token staking and rewards'
  },
  '3ana2-mqaaa-aaaao-a4p2q-cai': {
    label: 'Swap Canister',
    type: 'canister',
    description: 'Handles PULSE <> ckUSDC token swaps'
  },
  'zix77-6qaaa-aaaao-a4pwq-cai': {
    label: 'PULSE Token (Tokenmania)',
    type: 'canister',
    description: 'Main PULSE token ledger canister'
  },
}

/**
 * Get the human-readable label for a principal ID
 * @param principal - The principal ID to look up
 * @returns The label if found, null otherwise
 */
export function getPrincipalLabel(principal: string): string | null {
  return KNOWN_PRINCIPALS[principal]?.label || null
}

/**
 * Get the full info for a principal ID
 * @param principal - The principal ID to look up
 * @returns The full PrincipalInfo if found, null otherwise
 */
export function getPrincipalInfo(principal: string): PrincipalInfo | null {
  return KNOWN_PRINCIPALS[principal] || null
}

/**
 * Check if a principal is a known address
 * @param principal - The principal ID to check
 * @returns true if the principal is in the known list
 */
export function isKnownPrincipal(principal: string): boolean {
  return principal in KNOWN_PRINCIPALS
}

/**
 * Get badge color class based on principal type
 * @param type - The type of principal
 * @returns Tailwind CSS class string for badge styling
 */
export function getPrincipalBadgeColor(type: PrincipalInfo['type']): string {
  switch (type) {
    case 'canister':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    case 'treasury':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    case 'team':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    case 'community':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
    case 'exchange':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800'
  }
}
