"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import { TopHeader } from '@/components/layout/top-header'
import Header from '@/components/layout/header'
import ProjectAdmin from '@/components/admin/project-admin'
import SurveyAdmin from '@/components/admin/survey-admin'
import PollAdmin from '@/components/admin/poll-admin'

export type TabType = "projects" | "surveys" | "polls";

const tabConfigs: Record<TabType, { title: string; description: string }> = {
  projects: { title: 'Project Management', description: 'Manage and organize your projects' },
  surveys: { title: 'Survey Management', description: 'Create and manage survey forms' },
  polls: { title: 'Poll Management', description: 'Create polls and view results' },
}

function AdminDashboardContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>('projects')

  // Set initial tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType
    if (tabParam && ['projects', 'surveys', 'polls'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const current = tabConfigs[activeTab]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopHeader
        isSidebarCollapsed={isSidebarCollapsed}
        onSidebarToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isCollapsed={isSidebarCollapsed} />
        <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          <Header title={current.title} description={current.description} activeTab={activeTab} />
          <div className="flex-1 overflow-auto px-6 py-4">
            {activeTab === 'projects' && (
              <ProjectAdmin />
            )}
            {activeTab === 'surveys' && (
              <SurveyAdmin />
            )}
            {activeTab === 'polls' && (
              <PollAdmin />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboardContent />
    </Suspense>
  )
}
