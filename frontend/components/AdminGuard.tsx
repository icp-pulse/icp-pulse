"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIcpAuth } from './IcpAuthProvider'
import { isAdmin } from '@/lib/admin-config'

interface AdminGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { isAuthenticated, principalText } = useIcpAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      // Not authenticated, redirect to home
      router.push('/')
      return
    }

    // Check if user is admin
    if (!isAdmin(principalText)) {
      // Not an admin, show unauthorized
      setIsAuthorized(false)
      setIsChecking(false)
      return
    }

    // User is admin
    setIsAuthorized(true)
    setIsChecking(false)
  }, [isAuthenticated, principalText, router])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Unauthorized Access</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this admin area. Please contact an administrator if you believe this is an error.
          </p>
          {principalText && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Your Principal:</p>
              <p className="font-mono text-sm text-gray-700 break-all">{principalText}</p>
            </div>
          )}
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Hook to check if current user is admin
export function useIsAdmin(): boolean {
  const { principalText } = useIcpAuth()
  return isAdmin(principalText)
}
