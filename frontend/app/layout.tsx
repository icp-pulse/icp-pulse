import './globals.css'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { ThemeToggle } from '@/components/ThemeToggle'
import { IcpAuthProvider } from '@/components/IcpAuthProvider'
import { LoginButton } from '@/components/LoginButton'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'ICP Polls & Surveys',
  description: 'Context-aware polls & surveys on ICP',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 dark:bg-[#0b0b0d] dark:text-gray-100">
        <ThemeProvider attribute="class" enableSystem defaultTheme="system">
          <Providers>
            <IcpAuthProvider>
              <div className="mx-auto px-4 py-4">
                <header className="flex items-center justify-between py-2 gap-3">
                  <a href="/" className="font-semibold">ICP Polls & Surveys</a>
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
            </IcpAuthProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}

// ThemeToggle moved to a Client Component
