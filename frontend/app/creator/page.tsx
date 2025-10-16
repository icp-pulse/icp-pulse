"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import { TopHeader } from '@/components/layout/top-header'
import CreatorPollList from '@/components/creator/creator-poll-list'
import CreatorProjectList from '@/components/creator/creator-project-list'
import CreatorSurveyList from '@/components/creator/creator-survey-list'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter } from 'next/navigation'
import { LoginButton } from '@/components/LoginButton'

export type TabType = "projects" | "surveys" | "polls" | "airdrops" | "quests" | "holders";

function CreatorDashboardContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>('polls')
  const { isAuthenticated } = useIcpAuth()
  const router = useRouter()

  // Set initial tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType
    if (tabParam && ['projects', 'surveys', 'polls'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 shadow-lg rounded-lg p-8 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Creator Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please connect your wallet to access your creator dashboard and manage your polls, surveys, and projects.
          </p>
          <LoginButton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopHeader
        isSidebarCollapsed={isSidebarCollapsed}
        onSidebarToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex pt-16">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isCollapsed={isSidebarCollapsed} mode="creator" />
        <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          <div className="flex-1 overflow-auto px-6 py-4">
            {/* Header Banner */}
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white">
              <h1 className="text-2xl font-bold mb-2">Creator Dashboard</h1>
              <p className="text-blue-100">
                Manage your polls, surveys, and projects all in one place
              </p>
            </div>

            {activeTab === 'projects' && (
              <CreatorProjectList />
            )}
            {activeTab === 'surveys' && (
              <CreatorSurveyList />
            )}
            {activeTab === 'polls' && (
              <CreatorPollList />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function CreatorDashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreatorDashboardContent />
    </Suspense>
  )
}
