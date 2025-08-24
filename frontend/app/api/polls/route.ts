import { NextRequest, NextResponse } from 'next/server'
import { createBackend } from '@/lib/icp'

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
    
    let polls = []
    
    if (projectId) {
      // Get polls for a specific project
      const pollSummaries = await backend.list_polls_by_project(
        BigInt(projectId), 
        BigInt(offset), 
        BigInt(limit)
      )
      
      // Get full details for each poll
      for (const summary of pollSummaries) {
        try {
          const fullPoll = await backend.get_poll(summary.id)
          if (fullPoll && fullPoll.length > 0) {
            const poll = fullPoll[0]
            // Transform status from Motoko variant to string
            let statusString = 'draft'
            if (typeof poll.status === 'object' && poll.status !== null) {
              if ('active' in poll.status) statusString = 'active'
              else if ('completed' in poll.status) statusString = 'completed'
              else if ('paused' in poll.status) statusString = 'paused'
              else if ('archived' in poll.status) statusString = 'archived'
            } else if (typeof poll.status === 'string') {
              statusString = poll.status
            }

            polls.push({
              id: Number(poll.id),
              title: poll.title,
              description: poll.description,
              status: statusString,
              projectId: Number(poll.scopeId),
              createdBy: typeof poll.createdBy === 'string' 
                ? poll.createdBy 
                : poll.createdBy?.toString() || 'Unknown',
              createdAt: nsToIso(poll.createdAt),
              closesAt: nsToIso(poll.closesAt),
              totalVotes: Number(poll.totalVotes),
              options: poll.options?.length || 0,
              rewardFund: Number(poll.rewardFund)
            })
          }
        } catch (err) {
          console.error('Error fetching poll details:', err)
        }
      }
    } else {
      // Get all polls across all projects
      // First get all projects, then get polls for each
      const projects = await backend.list_projects(0n, 200n)
      
      for (const project of projects) {
        try {
          const pollSummaries = await backend.list_polls_by_project(
            project.id, 
            BigInt(offset), 
            BigInt(limit)
          )
          
          for (const summary of pollSummaries) {
            try {
              const fullPoll = await backend.get_poll(summary.id)
              if (fullPoll && fullPoll.length > 0) {
                const poll = fullPoll[0]
                
                // Transform status from Motoko variant to string
                let statusString = 'draft'
                if (typeof poll.status === 'object' && poll.status !== null) {
                  if ('active' in poll.status) statusString = 'active'
                  else if ('completed' in poll.status) statusString = 'completed'
                  else if ('paused' in poll.status) statusString = 'paused'
                  else if ('archived' in poll.status) statusString = 'archived'
                } else if (typeof poll.status === 'string') {
                  statusString = poll.status
                }

                polls.push({
                  id: Number(poll.id),
                  title: poll.title,
                  description: poll.description,
                  status: statusString,
                  projectId: Number(poll.scopeId),
                  createdBy: typeof poll.createdBy === 'string' 
                    ? poll.createdBy 
                    : poll.createdBy?.toString() || 'Unknown',
                  createdAt: nsToIso(poll.createdAt),
                  closesAt: nsToIso(poll.closesAt),
                  totalVotes: Number(poll.totalVotes),
                  options: poll.options?.length || 0,
                  rewardFund: Number(poll.rewardFund)
                })
              }
            } catch (err) {
              console.error('Error fetching poll details:', err)
            }
          }
        } catch (err) {
          console.error('Error fetching polls for project:', err)
        }
      }
    }
    
    return NextResponse.json(polls)
    
  } catch (error) {
    console.error('Error in /api/polls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch polls' }, 
      { status: 500 }
    )
  }
}