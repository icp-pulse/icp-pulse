import { createBackend } from '@/lib/icp'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

async function listProjects() {
  'use server'
  const canisterId = process.env.CANISTER_ID_POLLS_SURVEYS_BACKEND || process.env.POLLS_SURVEYS_BACKEND_CANISTER_ID || process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID || ''
  const host = process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943'
  const backend = await createBackend({ canisterId, host })
  const res = await backend.list_projects(0n, 20n)
  return res
}

export default async function ProjectsPage() {
  const projects = await listProjects()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button asChild>
          <a href="/projects/new">New Project</a>
        </Button>
      </div>
      
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No projects yet. Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id.toString()}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription>{project.slug}</CardDescription>
                  </div>
                  <span className="text-xs rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 px-2 py-0.5">
                    {project.status}
                  </span>
                </div>
              </CardHeader>
              <CardFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="flex-1"
                >
                  <a href={`/projects/${project.slug}/surveys/new`}>Create Survey</a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="flex-1"
                >
                  <a href={`/projects/${project.slug}/polls/new`}>Create Poll</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
