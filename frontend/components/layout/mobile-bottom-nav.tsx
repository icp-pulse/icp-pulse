"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, BarChart3, Plus, Trophy, Gift } from 'lucide-react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import './mobile-bottom-nav.css'

export function MobileBottomNav() {
  const pathname = usePathname()
  const { isAuthenticated } = useIcpAuth()

  const navigationItems = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home size={22} />,
      href: '/dashboard',
    },
    {
      id: 'polls',
      label: 'Polls',
      icon: <BarChart3 size={22} />,
      href: '/polls',
    },
    {
      id: 'create',
      label: 'Create',
      icon: <Plus size={26} />,
      href: '/polls',
      isCenter: true,
    },
    {
      id: 'quests',
      label: 'Quests',
      icon: <Trophy size={22} />,
      href: '/quests',
    },
    {
      id: 'rewards',
      label: 'Rewards',
      icon: <Gift size={22} />,
      href: '/rewards',
    },
  ]

  // Don't show nav if not authenticated or on certain pages
  const hiddenPages = ['/', '/login']
  if (hiddenPages.includes(pathname) || !isAuthenticated) {
    return null
  }

  return (
    <nav className="mobile-bottom-nav">
      <div className="nav-container">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''} ${item.isCenter ? 'center-item' : ''}`}
              data-page={item.id}
            >
              <div className="nav-icon">
                {item.icon}
              </div>
              <span className="nav-label">{item.label}</span>
              {isActive && !item.isCenter && (
                <div className="active-indicator"></div>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
