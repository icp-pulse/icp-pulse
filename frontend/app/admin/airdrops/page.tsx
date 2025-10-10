"use client"

export default function AdminAirdropsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Airdrop Administration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage campaigns and allocations
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            🚧 Under Construction
          </h3>
          <p className="text-yellow-800 dark:text-yellow-300">
            The airdrop administration interface is currently being developed.
            Please refer to the documentation for CLI-based campaign management.
          </p>
          <div className="mt-4">
            <a
              href="/AUTO_ALLOCATION_GUIDE.md"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Auto-Allocation Guide →
            </a>
          </div>
        </div>

        {/* Placeholder sections */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Campaign Management
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Create and manage airdrop campaigns. Set total pool, duration, and allocation criteria.
            </p>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
              <code className="text-sm text-gray-700 dark:text-gray-300">
                dfx canister call airdrop create_campaign '(...)'
              </code>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Allocation Preview
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Preview user allocations before executing. See tier distribution and individual amounts.
            </p>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
              <code className="text-sm text-gray-700 dark:text-gray-300">
                dfx canister call airdrop get_user_activity '(...)'
              </code>
            </div>
          </div>
        </div>

        {/* Deployment Info */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-4">
            📝 Implementation Steps
          </h3>
          <ol className="space-y-2 text-blue-800 dark:text-blue-300">
            <li>1. Add your principal to admin list in <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">frontend/lib/admin-config.ts</code></li>
            <li>2. Create campaign using CLI or admin UI (coming soon)</li>
            <li>3. Use auto-allocation functions to distribute based on activity</li>
            <li>4. Preview allocations before execution</li>
            <li>5. Fund campaign with PULSE tokens</li>
            <li>6. Start campaign for user claims</li>
          </ol>
        </div>

        {/* Documentation Links */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <a
            href="/AUTO_ALLOCATION_GUIDE.md"
            className="block p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-600 transition-colors"
          >
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Auto-Allocation Guide
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Learn about activity-based distribution
            </p>
          </a>

          <a
            href="/FRONTEND_AIRDROP_GUIDE.md"
            className="block p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-600 transition-colors"
          >
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Frontend Integration
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              User-facing airdrop components
            </p>
          </a>

          <a
            href="/ADMIN_AIRDROP_INTERFACE.md"
            className="block p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-600 transition-colors"
          >
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Admin Interface Spec
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Complete admin UI specifications
            </p>
          </a>
        </div>
      </div>
    </div>
  )
}
