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

interface SurveyBreadcrumbProps {
  surveyTitle?: string
  surveyId?: string
  currentPage: 'results' | 'edit' | 'rewards'
}

export function SurveyBreadcrumb({ surveyTitle, surveyId, currentPage }: SurveyBreadcrumbProps) {
  const truncateTitle = (title: string, maxLength: number = 30) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

  const getPageName = () => {
    switch (currentPage) {
      case 'results':
        return 'Results'
      case 'edit':
        return 'Edit'
      case 'rewards':
        return 'Rewards'
      default:
        return ''
    }
  }

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin?tab=surveys" className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span>Admin</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin?tab=surveys">Surveys</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {surveyTitle && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-muted-foreground">
                {truncateTitle(surveyTitle)}
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
