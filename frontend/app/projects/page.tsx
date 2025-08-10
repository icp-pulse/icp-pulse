import { createBackend } from '@/lib/icp'

export const dynamic = 'force-dynamic'

async function listProjects() {
  'use server'
  const canisterId =
    process.env.POLLS_SURVEYS_BACKEND_CANISTER_ID ||
    process.env.CANISTER_ID_POLLS_SURVEYS_BACKEND ||
    ''
  const backend = createBackend({ canisterId, host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943' })
  const res = await backend.list_projects(0n, 20n)
  return res
}

export default async function ProjectsPage() {
  const projects = await listProjects()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {projects.map((p) => (
          <li key={p.id.toString()} className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{p.slug}</div>
              </div>
              <span className="text-xs rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 px-2 py-0.5">{p.status}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
