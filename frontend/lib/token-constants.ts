/**
 * PULSE Token Constants and Utilities
 *
 * PULSE uses 8 decimals, meaning:
 * - 1 PULSE (displayed) = 100,000,000 e8s (smallest units)
 * - Transfer fee = 10,000 e8s = 0.0001 PULSE (displayed)
 * - Max supply = 1 billion PULSE = 100,000,000,000,000,000 e8s
 */

// Token decimals - PULSE uses 8 decimal places
export const PULSE_DECIMALS = 8;

// Maximum supply: 1 billion PULSE tokens
// This is enforced at the smart contract level
export const PULSE_MAX_SUPPLY = 1_000_000_000n; // 1 billion PULSE

// Maximum supply in smallest units (e8s)
// 1 billion PULSE * 10^8 = 100,000,000,000,000,000 e8s
export const PULSE_MAX_SUPPLY_E8S = 100_000_000_000_000_000n;

// Transfer fee in smallest units (e8s)
// 10,000 e8s = 0.0001 PULSE (displayed to users)
export const PULSE_TRANSFER_FEE = 10_000n;

// Transfer fee as displayed value
export const PULSE_TRANSFER_FEE_DISPLAY = 0.0001;

/**
 * Format PULSE tokens from smallest units (e8s) to display format
 *
 * @param amount - Amount in smallest units (e8s)
 * @param decimals - Number of decimal places (default: 8)
 * @returns Formatted string for display
 *
 * @example
 * formatPULSE(100_000_000n) // Returns "1.0" (1.0 PULSE displayed)
 * formatPULSE(500_000_000n) // Returns "5.0" (5.0 PULSE displayed)
 * formatPULSE(10_000n) // Returns "0.0001" (the transfer fee)
 */
export function formatPULSE(amount: bigint, decimals: number = PULSE_DECIMALS): string {
  const divisor = BigInt(10 ** decimals);
  const quotient = amount / divisor;
  const remainder = amount % divisor;

  if (remainder === 0n) {
    return quotient.toString();
  }

  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmedRemainder = remainderStr.replace(/0+$/, '');

  return trimmedRemainder ? `${quotient}.${trimmedRemainder}` : quotient.toString();
}

/**
 * Parse PULSE tokens from display format to smallest units (e8s)
 *
 * @param amount - Amount as string in display format
 * @param decimals - Number of decimal places (default: 8)
 * @returns Amount in smallest units (e8s)
 *
 * @example
 * parsePULSE("1.0") // Returns 100_000_000n (1.0 PULSE = 100 million e8s)
 * parsePULSE("5.5") // Returns 550_000_000n (5.5 PULSE = 550 million e8s)
 * parsePULSE("0.0001") // Returns 10_000n (the transfer fee)
 */
export function parsePULSE(amount: string, decimals: number = PULSE_DECIMALS): bigint {
  const [whole, fraction = '0'] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFraction);
}

/**
 * Calculate the percentage of max supply that has been minted
 *
 * @param currentSupply - Current total supply in e8s
 * @returns Percentage as a number (0-100)
 *
 * @example
 * calculateMintedPercentage(50_000_000_000_000_000n) // Returns 50.0 (50% minted)
 */
export function calculateMintedPercentage(currentSupply: bigint): number {
  return Number((currentSupply * 10000n) / PULSE_MAX_SUPPLY_E8S) / 100;
}

/**
 * Calculate remaining tokens that can be minted
 *
 * @param currentSupply - Current total supply in e8s
 * @returns Remaining supply in e8s
 */
export function calculateRemainingSupply(currentSupply: bigint): bigint {
  return PULSE_MAX_SUPPLY_E8S - currentSupply;
}

/**
 * Format large numbers with locale separators for better readability
 *
 * @param value - Number or bigint to format
 * @param decimals - Number of decimal places to show
 * @returns Formatted string with thousands separators
 *
 * @example
 * formatLargeNumber(1000000000) // Returns "1,000,000,000"
 * formatLargeNumber(1500.50, 2) // Returns "1,500.50"
 */
export function formatLargeNumber(value: number | bigint, decimals: number = 0): string {
  const numValue = typeof value === 'bigint' ? Number(value) : value;
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Check if an amount would exceed the max supply cap
 *
 * @param currentSupply - Current total supply in e8s
 * @param additionalAmount - Amount to be minted in e8s
 * @returns True if the mint would exceed max supply
 */
export function wouldExceedMaxSupply(currentSupply: bigint, additionalAmount: bigint): boolean {
  return currentSupply + additionalAmount > PULSE_MAX_SUPPLY_E8S;
}
