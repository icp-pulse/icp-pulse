"use client"

import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginButton } from "@/components/LoginButton";
import { UserMenu } from "@/components/UserMenu";
import Link from "next/link";
import { useIcpAuth } from "@/components/IcpAuthProvider";

interface TopHeaderProps {
  isSidebarCollapsed: boolean;
  onSidebarToggle: () => void;
}

export function TopHeader({ isSidebarCollapsed, onSidebarToggle }: TopHeaderProps) {
  const { isAuthenticated } = useIcpAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="w-9 h-9"
          >
            {isSidebarCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>

          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">ICP</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">ICP Pulse</h1>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-3">
          <ThemeToggle />
          {!isAuthenticated ? <LoginButton /> : <UserMenu />}
        </div>
      </div>
    </header>
  );
}
