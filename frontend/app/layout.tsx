import './globals.css'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { IcpAuthProvider } from '@/components/IcpAuthProvider'
import { Providers } from '@/components/Providers'
import { ConditionalLayout } from '@/components/layout/conditional-layout'
import { AIChatbox } from '@/components/ai-chatbox'

export const metadata: Metadata = {
  title: 'ICP Pulse',
  description: 'Context-aware polls & surveys on ICP',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 dark:bg-[#0b0b0d] dark:text-gray-100">
        <ThemeProvider attribute="class" enableSystem defaultTheme="system">
          <Providers>
            <IcpAuthProvider>
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
              <AIChatbox />
            </IcpAuthProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}

// ThemeToggle moved to a Client Component
