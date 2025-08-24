import { NextRequest, NextResponse } from 'next/server'
import { createBackend } from '@/lib/icp'
import type { Project } from '@/lib/schema'

function nsToIso(ns: bigint | number): string {
  const n = typeof ns === 'number' ? BigInt(ns) : ns
  const ms = Number(n / 1_000_000n)
  return new Date(ms).toISOString()
}

async function getBackend() {
  const canisterId = process.env.CANISTER_ID_POLLS_SURVEYS_BACKEND || process.env.POLLS_SURVEYS_BACKEND_CANISTER_ID || process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID || ''
  const host = process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943'
  return createBackend({ canisterId, host })
}

export async function GET(_req: NextRequest) {
  try {
    const backend = await getBackend()
    const summaries = await backend.list_projects(0n, 200n)
    const projects: Project[] = []
    for (const s of summaries) {
      const full = await backend.get_project(s.id)
      if (full.length) {
        const p = full[0]
        projects.push({
          id: String(p.id),
          name: p.name,
          description: p.description,
          status: (p.status as any) as Project['status'],
          owner: p.createdBy,
          createdAt: nsToIso(p.createdAt),
        })
      } else {
        projects.push({
          id: String(s.id),
          name: s.name,
          description: '',
          status: (s.status as any) as Project['status'],
          owner: 'unknown',
          createdAt: undefined,
        })
      }
    }
    return NextResponse.json(projects)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { name?: string; description?: string }
    const name = body.name ?? 'Untitled Project'
    const description = body.description ?? ''
    const backend = await getBackend()
    const id = await backend.create_project(name, description)
    // fetch back
    const full = await backend.get_project(id)
    const created: Project = full.length ? {
      id: String(full[0].id),
      name: full[0].name,
      description: full[0].description,
      status: (full[0].status as any) as Project['status'],
      owner: full[0].createdBy,
      createdAt: nsToIso(full[0].createdAt),
    } : {
      id: String(id), name, description, status: 'active', owner: 'unknown', createdAt: new Date().toISOString()
    }
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
