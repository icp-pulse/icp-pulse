import clsx from 'clsx'

export function ScopeBadge({ scopeType, name }: { scopeType: 'project' | 'product'; name: string }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs', scopeType === 'project' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200')}>
      <span className={clsx('w-1.5 h-1.5 rounded-full mr-1', scopeType === 'project' ? 'bg-blue-500' : 'bg-purple-500')} />
      {name}
    </span>
  )
}
