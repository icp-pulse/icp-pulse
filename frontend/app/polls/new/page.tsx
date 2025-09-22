"use client"

import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter } from 'next/navigation'
import { useSupportedTokens, useValidateToken, KNOWN_TOKEN_INFO } from '@/lib/tokens'

const optionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
})

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(2, 'Description must be at least 2 characters'),
  projectId: z.string().min(1, 'Please select a project'),
  expiresAt: z.string().min(1, 'Please set an expiry date').refine((dateStr) => {
    if (!dateStr) return false
    const selectedDate = new Date(dateStr)
    const now = new Date()
    return selectedDate > now
  }, 'Expiry date must be in the future'),
  allowAnonymous: z.boolean().default(false),
  allowMultiple: z.boolean().default(false),
  options: z.array(optionSchema).min(2, 'At least two options are required'),
  // Funding fields
  fundingEnabled: z.boolean().default(false),
  selectedToken: z.string().default('ICP'), // Either 'ICP' or a token principal
  customTokenCanister: z.string().optional(),
  totalFundAmount: z.number().min(0).optional(),
  rewardPerVote: z.number().min(0).optional(),
})

type FormValues = z.infer<typeof schema>

interface Project {
  id: string
  name: string
}

async function createPollAction(values: FormValues, identity: any) {
  const { createBackendWithIdentity } = await import('@/lib/icp')
  
  if (!identity) {
    throw new Error('Please login first')
  }

  const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
  const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
  
  const backend = await createBackendWithIdentity({ canisterId, host, identity })
  
  // Convert form values to backend format
  const { title, description, projectId, expiresAt, allowAnonymous, allowMultiple, options, fundingEnabled, selectedToken, customTokenCanister, totalFundAmount, rewardPerVote } = values
  
  const backendOptions = options.map(opt => opt.text)
  
  // Convert to nanoseconds and ensure it's in the future
  const expiresAtDate = new Date(expiresAt)
  const now = new Date()
  
  // If no expiresAt provided or it's in the past, set it to 7 days from now
  if (!expiresAt || expiresAtDate <= now) {
    expiresAtDate.setTime(now.getTime() + (7 * 24 * 60 * 60 * 1000)) // 7 days from now
  }
  
  const expiresAtNs = expiresAtDate.getTime() * 1_000_000
  
  try {
    if (fundingEnabled && selectedToken === 'CUSTOM' && customTokenCanister) {
      // Use custom token poll creation
      const tokenCanisterPrincipal = customTokenCanister; // Assume it's already a valid principal string
      const totalFundingE8s = Math.floor((totalFundAmount || 0) * 100_000_000);
      const rewardPerVoteE8s = Math.floor((rewardPerVote || 0) * 100_000_000);

      const result = await backend.create_custom_token_poll(
        'project',
        BigInt(projectId),
        title,
        description,
        backendOptions,
        BigInt(expiresAtNs),
        [tokenCanisterPrincipal], // Optional Principal
        BigInt(totalFundingE8s),
        BigInt(rewardPerVoteE8s)
      );

      if ('Ok' in result) {
        return { success: true, pollId: result.Ok };
      } else {
        throw new Error('Err' in result ? result.Err : 'Unknown error creating custom token poll');
      }
    } else {
      // Use standard ICP poll creation (backward compatibility)
      const rewardFundLegacy = fundingEnabled ? Math.floor((totalFundAmount || 0) * 100) : 0;
      const rewardPerVoteE8s = fundingEnabled && rewardPerVote ? BigInt(Math.floor(rewardPerVote * 100_000_000)) : null;

      const pollId = await backend.create_poll(
        'project',
        BigInt(projectId),
        title,
        description,
        backendOptions,
        BigInt(expiresAtNs),
        BigInt(rewardFundLegacy),
        fundingEnabled,
        rewardPerVoteE8s ? [rewardPerVoteE8s] : []
      );

      return { success: true, pollId };
    }
  } catch (error) {
    console.error('Error creating poll:', error)
    throw new Error('Failed to create poll: ' + (error as Error).message)
  }
}

export default function NewPollPage() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const { identity } = useIcpAuth()
  const router = useRouter()

  // Token hooks
  const { data: supportedTokens = [], isLoading: tokensLoading } = useSupportedTokens()
  const selectedToken = watch('selectedToken')
  const customTokenCanister = watch('customTokenCanister')
  const isCustomToken = selectedToken === 'CUSTOM'
  const { data: customTokenInfo, isLoading: validatingToken } = useValidateToken(
    isCustomToken ? customTokenCanister || '' : ''
  )
  
  // Get minimum datetime (current time + 1 minute)
  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1) // Add 1 minute buffer
    return now.toISOString().slice(0, 16) // Format for datetime-local input
  }

  const { register, handleSubmit, formState: { errors }, control, setValue, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      options: [
        { text: '' },
        { text: '' }
      ],
      fundingEnabled: false,
      selectedToken: 'ICP',
      totalFundAmount: 0,
      rewardPerVote: 0,
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options'
  })

  // Fetch projects for dropdown
  useEffect(() => {
    async function fetchProjects() {
      if (!identity) return
      
      try {
        const { createBackendWithIdentity } = await import('@/lib/icp')
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const backend = await createBackendWithIdentity({ canisterId, host, identity })
        
        const projectData = await backend.list_projects(0n, 100n)
        setProjects(projectData.map((p: any) => ({ id: p.id.toString(), name: p.name })))
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      }
    }
    fetchProjects()
  }, [identity])

  const addOption = () => {
    append({ text: '' })
  }

  const removeOption = (index: number) => {
    if (fields.length > 2) {
      remove(index)
    }
  }

  const fundingEnabled = watch('fundingEnabled')
  // Get the selected token info for display
  const getSelectedTokenInfo = () => {
    if (selectedToken === 'ICP') return { symbol: 'ICP', decimals: 8 }
    if (isCustomToken && customTokenInfo) return customTokenInfo

    // Find token info from supported tokens
    const tokenData = supportedTokens.find(([principal]) => principal === selectedToken)
    if (tokenData) {
      return { symbol: tokenData[1], decimals: tokenData[2] }
    }

    return { symbol: 'Tokens', decimals: 8 }
  }

  const tokenInfo = getSelectedTokenInfo()
  const totalFundAmount = watch('totalFundAmount') || 0
  const rewardPerVote = watch('rewardPerVote') || 0
  const maxVotes = rewardPerVote > 0 ? Math.floor(totalFundAmount / rewardPerVote) : 0

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Create Poll</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create a quick poll to gather votes and make decisions
          </p>
        </div>
      </div>

      <form
        className="space-y-6"
        onSubmit={handleSubmit((values) => {
          setError(null)
          startTransition(async () => {
            try {
              await createPollAction(values, identity)
              router.push('/admin?tab=polls')
            } catch (e: any) {
              setError(e.message || 'Error creating poll')
            }
          })
        })}
      >
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input 
                {...register('title')} 
                placeholder="Enter poll title"
                className="w-full"
              />
              {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea 
                {...register('description')} 
                placeholder="Describe what this poll is about"
                rows={3}
                className="w-full"
              />
              {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Project</label>
                <Select onValueChange={(value) => setValue('projectId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.projectId && <p className="text-sm text-red-600 mt-1">{errors.projectId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Expires At</label>
                <Input 
                  type="datetime-local"
                  min={getMinDateTime()}
                  {...register('expiresAt')} 
                  className="w-full"
                />
                {errors.expiresAt && <p className="text-sm text-red-600 mt-1">{errors.expiresAt.message}</p>}
                <p className="text-xs text-gray-500 mt-1">Poll must expire in the future</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowAnonymous"
                  {...register('allowAnonymous')}
                  className="rounded border-gray-300"
                />
                <label htmlFor="allowAnonymous" className="text-sm font-medium">
                  Allow anonymous votes
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowMultiple"
                  {...register('allowMultiple')}
                  className="rounded border-gray-300"
                />
                <label htmlFor="allowMultiple" className="text-sm font-medium">
                  Allow multiple choice selection
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funding Section */}
        <Card>
          <CardHeader>
            <CardTitle>Funding & Rewards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fundingEnabled"
                {...register('fundingEnabled')}
                className="rounded border-gray-300"
              />
              <label htmlFor="fundingEnabled" className="text-sm font-medium">
                Enable token rewards for votes
              </label>
            </div>

            {fundingEnabled && (
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                {/* Token Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Select Token</label>
                  <Select onValueChange={(value) => setValue('selectedToken', value)} value={selectedToken}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ICP">ICP (Internet Computer)</SelectItem>
                      {!tokensLoading && supportedTokens.map(([principal, symbol, decimals]) => (
                        <SelectItem key={principal} value={principal}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{symbol}</span>
                            {KNOWN_TOKEN_INFO[symbol] && (
                              <span className="text-sm text-muted-foreground">
                                {KNOWN_TOKEN_INFO[symbol].name}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="CUSTOM">Custom ICRC-1 Token</SelectItem>
                    </SelectContent>
                  </Select>
                  {tokensLoading && (
                    <p className="text-sm text-muted-foreground mt-1">Loading supported tokens...</p>
                  )}
                </div>

                {/* Custom Token Canister Input */}
                {isCustomToken && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Token Canister ID</label>
                    <Input
                      {...register('customTokenCanister')}
                      placeholder="rdmx6-jaaaa-aaaah-qcaiq-cai"
                      className="w-full font-mono text-sm"
                    />
                    {errors.customTokenCanister && <p className="text-sm text-red-600 mt-1">{errors.customTokenCanister.message}</p>}
                    {customTokenCanister && (
                      <div className="mt-2 text-sm">
                        {validatingToken ? (
                          <p className="text-yellow-600">Validating token...</p>
                        ) : customTokenInfo ? (
                          <p className="text-green-600">
                            ✓ Valid ICRC-1 token: {customTokenInfo.symbol} ({customTokenInfo.decimals} decimals)
                          </p>
                        ) : customTokenCanister.length > 20 ? (
                          <p className="text-red-600">
                            ✗ Invalid token canister or not ICRC-1 compatible
                          </p>
                        ) : null}
                      </div>
                    )}
                    <p className="text-xs text-gray-600 mt-1">Enter the canister ID of your ICRC-1 token</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Total Fund ({tokenInfo.symbol})
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('totalFundAmount', { valueAsNumber: true })}
                      placeholder="10.00"
                      className="w-full"
                    />
                    {errors.totalFundAmount && <p className="text-sm text-red-600 mt-1">{errors.totalFundAmount.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Reward per Vote ({tokenInfo.symbol})
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('rewardPerVote', { valueAsNumber: true })}
                      placeholder="0.25"
                      className="w-full"
                    />
                    {errors.rewardPerVote && <p className="text-sm text-red-600 mt-1">{errors.rewardPerVote.message}</p>}
                  </div>
                </div>
                
                {totalFundAmount > 0 && rewardPerVote > 0 && (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                    <h4 className="font-medium text-sm mb-2">Funding Summary</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Total Fund:</span>
                        <span className="font-mono">{totalFundAmount.toFixed(2)} {tokenInfo.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reward per Vote:</span>
                        <span className="font-mono">{rewardPerVote.toFixed(2)} {tokenInfo.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Funded Votes:</span>
                        <span className="font-mono">{maxVotes}</span>
                      </div>
                      {isCustomToken && (
                        <div className="flex justify-between">
                          <span>Token Canister:</span>
                          <span className="font-mono text-xs">{watch('customTokenCanister') || 'Not specified'}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Total in smallest unit:</span>
                        <span className="font-mono">{Math.floor(totalFundAmount * 100_000_000).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <p>• Voters will receive {tokenInfo.symbol} rewards directly to their wallets upon voting</p>
                  <p>• Rewards are distributed automatically from your funded amount</p>
                  <p>• Once the fund is depleted, no more rewards will be given</p>
                  {isCustomToken && <p>• Make sure the custom token canister supports ICRC-1 standard and you have sufficient balance</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Poll Options ({fields.length})</CardTitle>
              <Button type="button" onClick={addOption} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-4">
                <Badge variant="outline" className="min-w-fit">
                  {index + 1}
                </Badge>
                <div className="flex-1">
                  <Input 
                    {...register(`options.${index}.text`)}
                    placeholder={`Option ${index + 1}`}
                    className="w-full"
                  />
                  {errors.options?.[index]?.text && (
                    <p className="text-sm text-red-600 mt-1">{errors.options[index]?.text?.message}</p>
                  )}
                </div>
                {fields.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {errors.options && (
              <p className="text-sm text-red-600">{errors.options.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating Poll...' : 'Create Poll'}
          </Button>
        </div>
      </form>
    </div>
  )
}