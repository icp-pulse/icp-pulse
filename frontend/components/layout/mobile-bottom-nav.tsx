"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, BarChart3, Plus, Trophy, MessageCircle } from 'lucide-react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import './mobile-bottom-nav.css'

interface MobileBottomNavProps {
  onChatboxToggle?: () => void
}

export function MobileBottomNav({ onChatboxToggle }: MobileBottomNavProps) {
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
      href: '/polls/new',
      isCenter: true,
    },
    {
      id: 'quests',
      label: 'Quests',
      icon: <Trophy size={22} />,
      href: '/quests',
    },
    {
      id: 'chatbox',
      label: 'AI Chat',
      icon: <MessageCircle size={22} />,
      isButton: true,
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
          const isActive = item.href && (pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href)))

          // Render button for chatbox trigger
          if (item.isButton) {
            return (
              <button
                key={item.id}
                onClick={onChatboxToggle}
                className={`nav-item ${item.isCenter ? 'center-item' : ''}`}
                data-page={item.id}
              >
                <div className="nav-icon">
                  {item.icon}
                </div>
                <span className="nav-label">{item.label}</span>
              </button>
            )
          }

          // Render link for navigation items
          return (
            <Link
              key={item.id}
              href={item.href!}
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
