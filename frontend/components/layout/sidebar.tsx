import { Folder, ClipboardList, BarChart3, Download, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@lib/utils";
import { useIcpAuth } from '@/components/IcpAuthProvider';

interface SidebarProps {
  activeTab: "projects" | "surveys" | "polls";
  onTabChange: (tab: "projects" | "surveys" | "polls") => void;
  isCollapsed: boolean;
}

export default function Sidebar({ activeTab, onTabChange, isCollapsed }: SidebarProps) {
  const { identity } = useIcpAuth();

  // Fetch data from ICP backend
  const { data: projects = [] } = useQuery<any[]>({ 
    queryKey: ["projects", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!identity) return []
      
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })
      
      return await backend.list_projects(0n, 100n)
    },
    staleTime: 30000, // Cache for 30 seconds
    enabled: !!identity,
  });
  
  const { data: surveys = [] } = useQuery<any[]>({ 
    queryKey: ["surveys", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!identity) return []
      
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })
      
      // Get all projects first
      const projects = await backend.list_projects(0n, 100n)
      
      // Then get surveys for each project
      const allSurveys: any[] = []
      for (const project of projects) {
        try {
          const projectSurveys = await backend.list_surveys_by_project(project.id, 0n, 100n)
          allSurveys.push(...projectSurveys)
        } catch (err) {
          console.warn(`Failed to fetch surveys for project ${project.id}:`, err)
        }
      }
      
      return allSurveys
    },
    staleTime: 30000,
    enabled: !!identity,
  });
  
  const { data: polls = [] } = useQuery<any[]>({ 
    queryKey: ["polls", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!identity) return []
      
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })
      
      // Get all projects first
      const projects = await backend.list_projects(0n, 100n)
      
      // Then get polls for each project
      const allPolls: any[] = []
      for (const project of projects) {
        try {
          const projectPolls = await backend.list_polls_by_project(project.id, 0n, 100n)
          allPolls.push(...projectPolls)
        } catch (err) {
          console.warn(`Failed to fetch polls for project ${project.id}:`, err)
        }
      }
      
      return allPolls
    },
    staleTime: 30000,
    enabled: !!identity,
  });

  const navItems = [
    { id: "projects" as const, icon: Folder, label: "Projects", count: projects.length },
    { id: "surveys" as const, icon: ClipboardList, label: "Surveys", count: surveys.length },
    { id: "polls" as const, icon: BarChart3, label: "Polls", count: polls.length },
  ];

  return (
    <aside className={cn(
      "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 shadow-sm border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 z-40",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map(({ id, icon: Icon, label, count }) => (
            <li key={id}>
              <button
                onClick={() => onTabChange(id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === id
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title={isCollapsed ? label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="mr-3 ml-3">{label}</span>
                    <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                      activeTab === id
                        ? "bg-primary-100 dark:bg-primary-800/30 text-primary-600 dark:text-primary-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}>
                      {count}
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>

        {!isCollapsed && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <ul className="space-y-2">
              <li>
                <button className="w-full flex items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Download className="w-4 h-4 mr-3" />
                  Export Data
                </button>
              </li>
              <li>
                <button className="w-full flex items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Settings className="w-4 h-4 mr-3" />
                  Settings
                </button>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}
