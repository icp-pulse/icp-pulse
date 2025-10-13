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

interface PollBreadcrumbProps {
  pollTitle?: string
  pollId?: string
  currentPage: 'details' | 'results'
}

export function PollBreadcrumb({ pollTitle, pollId, currentPage }: PollBreadcrumbProps) {
  const truncateTitle = (title: string, maxLength: number = 30) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin?tab=polls" className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span>Admin</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin?tab=polls">Polls</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pollTitle && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-muted-foreground">
                {truncateTitle(pollTitle)}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbPage className="font-medium">
            {currentPage === 'details' ? 'Details' : 'Results'}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
