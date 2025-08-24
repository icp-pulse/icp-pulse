"use client"

import { useState } from 'react'
import Sidebar from '@/components/layout/sidebar'
import { TopHeader } from '@/components/layout/top-header'
import Header from '@/components/layout/header'
import ProjectAdmin from '@/components/admin/project-admin'
import SurveyBuilder from '@/components/surveys/survey-builder'
import SurveyList from '@/components/surveys/survey-list'
import PollCreator from '@/components/polls/poll-creator'
import PollList from '@/components/polls/poll-list'
import PollResults from '@/components/polls/poll-results'

export type TabType = "projects" | "surveys" | "polls";

const tabConfigs: Record<TabType, { title: string; description: string }> = {
  projects: { title: 'Project Management', description: 'Manage and organize your projects' },
  surveys: { title: 'Survey Management', description: 'Create and manage survey forms' },
  polls: { title: 'Poll Management', description: 'Create polls and view results' },
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('projects')
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SurveyBuilder />
                </div>
                <div>
                  <SurveyList />
                </div>
              </div>
            )}
            {activeTab === 'polls' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <PollCreator />
                  <PollList />
                </div>
                <div>
                  <PollResults />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
