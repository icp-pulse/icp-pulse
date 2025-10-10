// Admin configuration
// Add admin principals here or via environment variable

export const ADMIN_PRINCIPALS: string[] = [
  // Add your admin principal IDs here
  // Example: '2vxsx-fae-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-q',

  // You can also add from environment variable
  ...(process.env.NEXT_PUBLIC_ADMIN_PRINCIPALS?.split(',').map(p => p.trim()) || [])
]

// Check if a principal is an admin
export function isAdmin(principal: string | null | undefined): boolean {
  if (!principal) return false
  return ADMIN_PRINCIPALS.includes(principal)
}

// Get admin principals count (for debugging)
export function getAdminCount(): number {
  return ADMIN_PRINCIPALS.length
}
