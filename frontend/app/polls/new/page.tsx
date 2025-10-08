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
import { Plus, Trash2, ArrowLeft, Sparkles } from 'lucide-react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { AIChatbox } from '@/components/ai-chatbox'
// import { useSupportedTokens, useValidateToken, KNOWN_TOKEN_INFO } from '@/lib/tokens'
const KNOWN_TOKEN_INFO: any = {}

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
  fundingType: z.enum(['self-funded', 'crowdfunded']).default('self-funded'),
  selectedToken: z.string().default('ICP'), // Either 'ICP' or a token principal
  totalFundAmount: z.number().min(0).optional(),
  rewardPerVote: z.number().min(0).optional(),
})

type FormValues = z.infer<typeof schema>

interface Project {
  id: string
  name: string
  status: string
}

async function createPollAction(values: FormValues, identity: any, isAuthenticated: boolean) {
  const { createBackendWithIdentity } = await import('@/lib/icp')
  const { Principal } = await import('@dfinity/principal')

  if (!isAuthenticated) {
    throw new Error('Please login first')
  }

  const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
  const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'

  const backend = await createBackendWithIdentity({ canisterId, host, identity })
  
  // Convert form values to backend format
  const { title, description, projectId, expiresAt, allowAnonymous, allowMultiple, options, fundingEnabled, fundingType, selectedToken, totalFundAmount, rewardPerVote } = values
  
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
    const pulseCanisterId = process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID

    // Check if using PULSE or other supported tokens (not ICP)
    if (fundingEnabled && selectedToken !== 'ICP') {
      // Using PULSE or other supported token
      const tokenCanisterPrincipal = Principal.fromText(selectedToken)

      const totalFundingE8s = BigInt(Math.floor((totalFundAmount || 0) * 100_000_000));
      const rewardPerVoteE8s = BigInt(Math.floor((rewardPerVote || 0) * 100_000_000));

      // For self-funded polls, approve tokens first
      if (fundingType === 'self-funded' && totalFundingE8s > 0n) {
        console.log('Self-funded poll detected, requesting token approval...')
        console.log('Funding amount:', totalFundingE8s.toString())

        const backendCanisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!

        // Add fee buffer (similar to poll-crowdfunding)
        const feeBuffer = 20001n
        const approvalAmount = totalFundingE8s + feeBuffer

        console.log('Approval amount (with buffer):', approvalAmount.toString())

        // Check if using Plug wallet
        const isPlugWallet = typeof window !== 'undefined' && window.ic?.plug
        console.log('Using Plug wallet:', isPlugWallet)

        if (isPlugWallet && window.ic?.plug) {
          console.log('Requesting Plug approval...')
          // Use Plug wallet for approval
          const whitelist = [selectedToken, backendCanisterId]
          console.log('Whitelist:', whitelist)

          const connected = await window.ic.plug.requestConnect({ whitelist })
          console.log('Plug connected:', connected)

          if (!connected) {
            throw new Error('Failed to connect to Plug wallet')
          }

          console.log('Creating token actor...')
          const { idlFactory: tokenIdl } = await import('@/../../src/declarations/tokenmania')
          const tokenActor = await window.ic.plug.createActor({
            canisterId: selectedToken,
            interfaceFactory: tokenIdl,
          })

          console.log('Requesting approval from Plug...', {
            spender: backendCanisterId,
            amount: approvalAmount.toString()
          })

          const approveResult = await tokenActor.icrc2_approve({
            from_subaccount: [],
            spender: {
              owner: Principal.fromText(backendCanisterId),
              subaccount: [],
            },
            amount: approvalAmount,
            expected_allowance: [],
            expires_at: [],
            fee: [],
            memo: [],
            created_at_time: [],
          })

          console.log('Approve result:', approveResult)

          if ('Err' in approveResult || approveResult.Err !== undefined) {
            throw new Error(`Failed to approve token transfer: ${JSON.stringify(approveResult.Err || approveResult)}`)
          }

          console.log('Approval successful!')
        } else {
          // Use identity-based approval for Internet Identity
          const { Actor, HttpAgent } = await import('@dfinity/agent')
          const { idlFactory: tokenIdl } = await import('@/../../src/declarations/tokenmania')

          const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
          const agent = new HttpAgent({ host, identity: identity! })

          if (process.env.NEXT_PUBLIC_DFX_NETWORK === 'local') {
            await agent.fetchRootKey()
          }

          const tokenActor = Actor.createActor(tokenIdl, {
            agent,
            canisterId: selectedToken,
          })

          const approveResult = await (tokenActor as any).icrc2_approve({
            from_subaccount: [],
            spender: {
              owner: Principal.fromText(backendCanisterId),
              subaccount: [],
            },
            amount: approvalAmount,
            expected_allowance: [],
            expires_at: [],
            fee: [],
            memo: [],
            created_at_time: [],
          })

          if ('Err' in approveResult || approveResult.Err !== undefined) {
            throw new Error(`Failed to approve token transfer: ${JSON.stringify(approveResult.Err || approveResult)}`)
          }
        }

        // Wait for approval to be processed
        console.log('Waiting for approval to be processed...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log('Approval processed, creating poll...')
      }

      // Use create_custom_token_poll for PULSE and other tokens
      console.log('Calling create_custom_token_poll...')
      const result = await backend.create_custom_token_poll(
        'project',
        BigInt(projectId),
        title,
        description,
        backendOptions,
        BigInt(expiresAtNs),
        [tokenCanisterPrincipal],
        totalFundingE8s,
        rewardPerVoteE8s,
        fundingType
      );

      if ('ok' in result) {
        return { success: true, pollId: result.ok }
      } else {
        throw new Error(result.err)
      }
    } else {
      // Use standard ICP poll creation
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
        rewardPerVoteE8s ? [rewardPerVoteE8s] : [],
        [fundingType] // Pass funding type
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
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const { identity, isAuthenticated } = useIcpAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get pre-filled title from URL parameter (from landing page)
  const prefilledTitle = searchParams.get('title') || ''

  // Get minimum datetime (current time + 1 minute)
  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1) // Add 1 minute buffer
    return now.toISOString().slice(0, 16) // Format for datetime-local input
  }

  const { register, handleSubmit, formState: { errors }, control, setValue, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: prefilledTitle, // Pre-fill from landing page
      options: [
        { text: '' },
        { text: '' }
      ],
      fundingEnabled: false,
      fundingType: 'self-funded',
      selectedToken: process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID || 'ICP',
      totalFundAmount: 0,
      rewardPerVote: 0,
    }
  })

  // Update title if prefilled value changes
  useEffect(() => {
    if (prefilledTitle) {
      setValue('title', prefilledTitle)
    }
  }, [prefilledTitle, setValue])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options'
  })

  // Token hooks (temporarily disabled for deployment)
  const supportedTokens: any[] = []
  const tokensLoading = false
  const selectedToken = watch('selectedToken')

  // Fetch projects for dropdown
  useEffect(() => {
    async function fetchProjects() {
      if (!isAuthenticated) return

      try {
        const { createBackendWithIdentity } = await import('@/lib/icp')
        const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
        const backend = await createBackendWithIdentity({ canisterId, host, identity })

        const projectData = await backend.list_projects(0n, 100n)
        const activeProjects = projectData.filter((p: any) => p.status === 'active')
        setProjects(activeProjects.map((p: any) => ({ id: p.id.toString(), name: p.name, status: p.status })))
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      }
    }
    fetchProjects()
  }, [identity, isAuthenticated])

  const addOption = () => {
    append({ text: '' })
  }

  const removeOption = (index: number) => {
    if (fields.length > 2) {
      remove(index)
    }
  }

  const handleOptionsGenerated = (options: string[]) => {
    // Clear existing options
    while (fields.length > 0) {
      remove(0)
    }
    // Add generated options
    options.forEach((optionText: string) => {
      append({ text: optionText })
    })
    setAiError(null)
  }

  const generateOptionsWithAI = async () => {
    const title = watch('title')
    if (!title || title.length < 2) {
      setAiError('Please enter a poll title first')
      return
    }

    if (!isAuthenticated) {
      setAiError('Please login to use AI generation')
      return
    }

    setAiGenerating(true)
    setAiError(null)

    try {
      const { createBackendWithIdentity } = await import('@/lib/icp')
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
      const backend = await createBackendWithIdentity({ canisterId, host, identity })

      // Check if API key is configured in backend
      const hasKey = await backend.has_openai_api_key()
      if (!hasKey) {
        setAiError('OpenAI API key not configured in backend. Please contact administrator.')
        return
      }

      // Call backend to generate options
      const result = await backend.generate_poll_options(title)

      if (result && result.length > 0 && result[0]) {
        handleOptionsGenerated(result[0])
      } else {
        setAiError('Failed to generate options. Please try again.')
      }
    } catch (err) {
      console.error('Error generating options:', err)
      setAiError(err instanceof Error ? err.message : 'Failed to generate options')
    } finally {
      setAiGenerating(false)
    }
  }

  const fundingEnabled = watch('fundingEnabled')
  // Get the selected token info for display
  const getSelectedTokenInfo = () => {
    if (selectedToken === 'ICP') return { symbol: 'ICP', decimals: 8 }

    // Check if PULSE token is selected
    if (selectedToken === process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID) {
      return { symbol: 'PULSE', decimals: 8 }
    }

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
              await createPollAction(values, identity, isAuthenticated)
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
                {/* Funding Type Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Funding Type</label>
                  <Select onValueChange={(value: 'self-funded' | 'crowdfunded') => setValue('fundingType', value)} value={watch('fundingType')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select funding type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self-funded">
                        <div>
                          <div className="font-medium">Self-Funded</div>
                          <div className="text-xs text-muted-foreground">You fund the entire reward pool yourself</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="crowdfunded">
                        <div>
                          <div className="font-medium">Crowdfunded</div>
                          <div className="text-xs text-muted-foreground">Open for community contributions</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Token Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Select Token</label>
                  <Select onValueChange={(value) => setValue('selectedToken', value)} value={selectedToken}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ICP">ICP (Internet Computer)</SelectItem>
                      <SelectItem value={process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID || 'PULSE'}>
                        PULSE (True Pulse Token)
                      </SelectItem>
                      {!tokensLoading && supportedTokens.map(([principal, symbol, decimals]) => {
                        // Skip PULSE token if it's already shown above
                        if (principal === process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID) {
                          return null
                        }
                        return (
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
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {tokensLoading && (
                    <p className="text-sm text-muted-foreground mt-1">Loading supported tokens...</p>
                  )}
                </div>

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
                      step="0.000001"
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
                        <span className="font-mono">{rewardPerVote.toFixed(6)} {tokenInfo.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Funded Votes:</span>
                        <span className="font-mono">{maxVotes}</span>
                      </div>
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={generateOptionsWithAI}
                  variant="outline"
                  disabled={aiGenerating}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {aiGenerating ? 'Generating...' : 'AI Generate'}
                </Button>
                <Button type="button" onClick={addOption} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
            {aiError && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {aiError}
              </div>
            )}
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

      {/* AI Chatbox */}
      <AIChatbox onOptionsGenerated={handleOptionsGenerated} />
    </div>
  )
}