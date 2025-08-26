"use client"

import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LoginButton } from '@/components/LoginButton'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const isLandingPage = pathname === '/'

  if (isLandingPage) {
    return (
      <div>
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <a href="/" className="font-semibold text-lg" suppressHydrationWarning>ICP Pulse</a>
              <div className="flex items-center gap-2">
                <a href="/admin" className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
                  Admin
                </a>
                <LoginButton />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    )
  }

  return (
    <div className="mx-auto px-4 py-4">
      <header className="flex items-center justify-between py-2 gap-3">
        <a href="/" className="font-semibold">ICP Pulse</a>
        <div className="flex items-center gap-2">
          <a href="/admin" className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
            Admin
          </a>
          <LoginButton />
          <ThemeToggle />
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}