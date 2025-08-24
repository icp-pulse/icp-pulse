"use client"

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return (
    <button className="p-2 rounded border border-gray-300 dark:border-gray-600 text-sm opacity-60" aria-label="Toggle theme">
      <SunIcon className="w-4 h-4" />
    </button>
  )

  const resolved = theme === 'system' ? systemTheme : theme

  return (
    <button
      className="p-2 rounded border border-gray-300 dark:border-gray-600"
      onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
      title={resolved === 'dark' ? 'Switch to light' : 'Switch to dark'}
    >
      {resolved === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
    </button>
  )
}

function SunIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/>
      <path d="M12 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 17a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1ZM4.222 4.222a1 1 0 0 1 1.414 0l.707.707a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 0 1 0-1.414ZM17.657 17.657a1 1 0 0 1 1.414 0l.707.707a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 0 1 0-1.414ZM2 12a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Zm17 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1ZM4.222 19.778a1 1 0 0 1 0-1.414l.707-.707a1 1 0 1 1 1.414 1.414l-.707.707a1 1 0 0 1-1.414 0ZM17.657 6.343a1 1 0 0 1 0-1.414l.707-.707a1 1 0 1 1 1.414 1.414l-.707.707a1 1 0 0 1-1.414 0Z"/>
    </svg>
  )
}

function MoonIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79Z"/>
    </svg>
  )
}
