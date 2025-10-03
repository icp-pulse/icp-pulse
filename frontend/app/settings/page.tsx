"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Key, CheckCircle, XCircle } from 'lucide-react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import Sidebar from '@/components/layout/sidebar'
import { TopHeader } from '@/components/layout/top-header'
import Header from '@/components/layout/header'

function SettingsContent() {
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(true)
  const [hasKey, setHasKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { identity, isAuthenticated } = useIcpAuth()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'projects' | 'surveys' | 'polls'>('projects')

  useEffect(() => {
    checkApiKey()
  }, [identity])

  const checkApiKey = async () => {
    if (!identity) {
      setChecking(false)
      return
    }

    try {
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      const keyExists = await backend.has_openai_api_key()
      setHasKey(keyExists)
    } catch (err) {
      console.error('Error checking API key:', err)
    } finally {
      setChecking(false)
    }
  }

  const handleSave = async () => {
    if (!identity || !apiKey.trim()) {
      setError('Please enter a valid API key')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      const result = await backend.set_openai_api_key(apiKey)

      if (result) {
        setSuccess(true)
        setHasKey(true)
        setApiKey('')
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError('Failed to save API key')
      }
    } catch (err) {
      console.error('Error saving API key:', err)
      setError(err instanceof Error ? err.message : 'Failed to save API key')
    } finally {
      setSaving(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <TopHeader
          isSidebarCollapsed={isSidebarCollapsed}
          onSidebarToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <div className="flex">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isCollapsed={isSidebarCollapsed} />
          <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
            <div className="container mx-auto px-4 py-8">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
                <p className="text-muted-foreground">Please connect your wallet to access settings.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopHeader
        isSidebarCollapsed={isSidebarCollapsed}
        onSidebarToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isCollapsed={isSidebarCollapsed} />
        <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          <Header title="Settings" description="Configure application settings" activeTab={activeTab} />
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => window.history.back()}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-semibold">Settings</h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage your application configuration
                  </p>
                </div>
              </div>

              {/* OpenAI API Key Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    OpenAI API Key
                  </CardTitle>
                  <CardDescription>
                    Configure your OpenAI API key to enable AI-powered features like poll option generation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status Indicator */}
                  {checking ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Checking API key status...
                    </div>
                  ) : (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${hasKey ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'}`}>
                      {hasKey ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <span className="text-sm text-green-700 dark:text-green-300">API key is configured</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                          <span className="text-sm text-yellow-700 dark:text-yellow-300">No API key configured</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* API Key Input */}
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">OpenAI API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-proj-..."
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500">
                      Your API key is stored securely in the backend canister and never exposed to the frontend
                    </p>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">How to get an API key:</h4>
                    <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                      <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI API Keys</a></li>
                      <li>Sign in or create an account</li>
                      <li>Click "Create new secret key"</li>
                      <li>Copy the key and paste it above</li>
                    </ol>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Success Message */}
                  {success && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-600 dark:text-green-400">API key saved successfully!</p>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSave}
                      disabled={saving || !apiKey.trim()}
                      className="flex-1"
                    >
                      {saving ? 'Saving...' : hasKey ? 'Update API Key' : 'Save API Key'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Settings (Placeholder) */}
              <Card>
                <CardHeader>
                  <CardTitle>Other Settings</CardTitle>
                  <CardDescription>
                    Additional configuration options will be available here
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">More settings coming soon...</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
