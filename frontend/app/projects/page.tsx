"use client"

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useIcpAuth } from '@/components/IcpAuthProvider'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { identity } = useIcpAuth()

  useEffect(() => {
    async function fetchProjects() {
      if (!identity) return
      
      try {
        const { createBackendWithIdentity } = await import('@/lib/icp')
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const backend = await createBackendWithIdentity({ canisterId, host, identity })
        
        const projectData = await backend.list_projects(0n, 20n)
        setProjects(projectData)
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProjects()
  }, [identity])

  if (loading) {
    return <div>Loading projects...</div>
  }
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
