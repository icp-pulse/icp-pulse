import { NextRequest, NextResponse } from 'next/server'
import { createBackend } from '@/lib/icp'

export const runtime = 'nodejs'

function nsToIso(ns: bigint | number): string {
  const n = typeof ns === 'number' ? BigInt(ns) : ns
  const ms = Number(n / 1_000_000n)
  return new Date(ms).toISOString()
}

async function getBackend() {
  const canisterId = process.env.CANISTER_ID_POLLS_SURVEYS_BACKEND || 
                    process.env.POLLS_SURVEYS_BACKEND_CANISTER_ID || 
                    process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID || ''
  const host = process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943'
  return createBackend({ canisterId, host })
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    
    const backend = await getBackend()
    
    let surveys = []
    
    if (projectId) {
      // Get surveys for a specific project
      const surveySummaries = await backend.list_surveys_by_project(
        BigInt(projectId), 
        BigInt(offset), 
        BigInt(limit)
      )
      
      // Get full details for each survey
      for (const summary of surveySummaries) {
        try {
          const fullSurvey = await backend.get_survey(summary.id)
          if (fullSurvey && fullSurvey.length > 0) {
            const survey = fullSurvey[0]
            if (!survey) continue
            surveys.push({
              id: Number(survey.id),
              title: survey.title,
              description: survey.description,
              status: survey.status,
              projectId: Number(survey.scopeId),
              createdBy: typeof survey.createdBy === 'string' 
                ? survey.createdBy 
                : (survey.createdBy as any)?.toString() || 'Unknown',
              createdAt: nsToIso(survey.createdAt),
              closesAt: nsToIso(survey.closesAt),
              submissionsCount: Number(survey.submissionsCount),
              questions: survey.questions?.length || 0,
              allowAnonymous: survey.allowAnonymous
            })
          }
        } catch (err) {
          console.error('Error fetching survey details:', err)
        }
      }
    } else {
      // Get all surveys across all projects
      // First get all projects, then get surveys for each
      const projects = await backend.list_projects(0n, 200n)
      
      for (const project of projects) {
        try {
          const surveySummaries = await backend.list_surveys_by_project(
            project.id, 
            BigInt(offset), 
            BigInt(limit)
          )
          
          for (const summary of surveySummaries) {
            try {
              const fullSurvey = await backend.get_survey(summary.id)
              if (fullSurvey && fullSurvey.length > 0) {
                const survey = fullSurvey[0]
                if (!survey) continue
                surveys.push({
                  id: Number(survey.id),
                  title: survey.title,
                  description: survey.description,
                  status: survey.status,
                  projectId: Number(survey.scopeId),
                  createdBy: typeof survey.createdBy === 'string' 
                    ? survey.createdBy 
                    : (survey.createdBy as any)?.toString() || 'Unknown',
                  createdAt: nsToIso(survey.createdAt),
                  closesAt: nsToIso(survey.closesAt),
                  submissionsCount: Number(survey.submissionsCount),
                  questions: survey.questions?.length || 0,
                  allowAnonymous: survey.allowAnonymous
                })
              }
            } catch (err) {
              console.error('Error fetching survey details:', err)
            }
          }
        } catch (err) {
          console.error('Error fetching surveys for project:', err)
        }
      }
    }
    
    return NextResponse.json(surveys)
    
  } catch (error) {
    console.error('Error in /api/surveys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch surveys' }, 
      { status: 500 }
    )
  }
}