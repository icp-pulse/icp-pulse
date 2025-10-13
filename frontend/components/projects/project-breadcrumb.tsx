'use client'

import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Home } from 'lucide-react'

interface ProjectBreadcrumbProps {
  projectName?: string
  projectId?: string
  currentPage: 'edit' | 'view' | 'new'
}

export function ProjectBreadcrumb({ projectName, projectId, currentPage }: ProjectBreadcrumbProps) {
  const truncateName = (name: string, maxLength: number = 30) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + '...'
  }

  const getPageName = () => {
    switch (currentPage) {
      case 'edit':
        return 'Edit'
      case 'view':
        return 'Details'
      case 'new':
        return 'New Project'
      default:
        return ''
    }
  }

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin?tab=projects" className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span>Admin</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin?tab=projects">Projects</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {projectName && currentPage !== 'new' && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-muted-foreground">
                {truncateName(projectName)}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbPage className="font-medium">
            {getPageName()}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
