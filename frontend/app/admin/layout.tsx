"use client"

import { AdminGuard } from '@/components/AdminGuard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Protect all admin routes with AdminGuard
  return (
    <AdminGuard>
      {children}
    </AdminGuard>
  )
}
