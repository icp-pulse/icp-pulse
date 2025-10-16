"use client"

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useEffect, Suspense } from 'react'
import { useIcpAuth } from '@/components/IcpAuthProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { PollCreationWizard, type WizardStep } from '@/components/polls/poll-creation-wizard'
import { StepBasicInfo } from '@/components/polls/wizard-steps/step-basic-info'
import { StepPollOptions } from '@/components/polls/wizard-steps/step-poll-options'
import { StepConfiguration } from '@/components/polls/wizard-steps/step-configuration'
import { StepFundingRewards } from '@/components/polls/wizard-steps/step-funding-rewards'
import { pollFormSchema, type PollFormValues, type Project } from '@/components/polls/poll-form-types'
import { toast } from '@/hooks/use-toast'
import { FileText, ListChecks, Settings, Coins } from 'lucide-react'

const wizardSteps: WizardStep[] = [
  {
    title: 'Basic Info',
    description: 'Question and details',
    icon: <FileText className="h-5 w-5" />
  },
  {
    title: 'Options',
    description: 'Poll choices',
    icon: <ListChecks className="h-5 w-5" />
  },
  {
    title: 'Configuration',
    description: 'Settings and visibility',
    icon: <Settings className="h-5 w-5" />
  },
  {
    title: 'Funding',
    description: 'Rewards and incentives',
    icon: <Coins className="h-5 w-5" />
  }
]

async function createPollAction(values: PollFormValues, identity: any, isAuthenticated: boolean, authProvider: 'ii' | 'nfid' | 'plug' | null) {
  const { createBackendWithIdentity } = await import('@/lib/icp')
  const { Principal } = await import('@dfinity/principal')

  if (!isAuthenticated) {
    throw new Error('Please login first')
  }

  const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
  const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'
  const backend = await createBackendWithIdentity({ canisterId, host, identity })

  const {
    title, description, projectId, expiresAt, options,
    fundingEnabled, fundingSource, selectedToken, totalFundAmount, rewardPerVote,
    maxResponses, allowAnonymous, allowMultiple, visibility, rewardDistributionType
  } = values

  const backendOptions = options.map(opt => opt.text)

  // Convert to nanoseconds
  const expiresAtDate = new Date(expiresAt)
  const now = new Date()

  if (!expiresAt || expiresAtDate <= now) {
    expiresAtDate.setTime(now.getTime() + (7 * 24 * 60 * 60 * 1000))
  }

  const expiresAtNs = expiresAtDate.getTime() * 1_000_000

  try {
    // Check if using custom token (not ICP)
    if (fundingEnabled && selectedToken && selectedToken !== 'ICP') {
      const tokenCanisterPrincipal = Principal.fromText(selectedToken)
      const totalFundingE8s = BigInt(Math.floor((totalFundAmount || 0) * 100_000_000))
      const rewardPerVoteE8s = BigInt(Math.floor((rewardPerVote || 0) * 100_000_000))

      // For self-funded polls, approve tokens first
      if (fundingSource === 'self-funded' && totalFundingE8s > 0n) {
        const backendCanisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
        const feeBuffer = 20001n
        const approvalAmount = totalFundingE8s + feeBuffer

        // Use authProvider to determine which wallet is actually being used
        const isPlugWallet = authProvider === 'plug'

        console.log('Starting token approval process...')
        console.log('Auth provider:', authProvider)
        console.log('Selected token canister:', selectedToken)
        console.log('Backend canister:', backendCanisterId)
        console.log('Approval amount:', approvalAmount.toString())

        if (isPlugWallet && window.ic?.plug) {
          console.log('Using Plug wallet for approval')
          const whitelist = [selectedToken, backendCanisterId]

          // Force mainnet connection even when frontend is running locally
          const connected = await (window.ic.plug as any).requestConnect({
            whitelist,
            host: 'https://ic0.app'  // Explicitly use mainnet
          })

          if (!connected) {
            throw new Error('Failed to connect to Plug wallet')
          }

          console.log('Plug wallet connected to mainnet, creating actor...')

          // Use standard ICRC-2 interface instead of generated declarations
          const { icrc2IdlFactory } = await import('@/lib/icrc2.idl')
          const tokenActor = await window.ic.plug.createActor({
            canisterId: selectedToken,
            interfaceFactory: icrc2IdlFactory,
          })

          console.log('Token actor created for mainnet canister:', selectedToken)

          console.log('Token actor created, calling icrc2_approve...')

          const approveParams = {
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
          }

          console.log('Approve params:', JSON.stringify({
            ...approveParams,
            spender: { owner: approveParams.spender.owner.toText(), subaccount: approveParams.spender.subaccount },
            amount: approveParams.amount.toString()
          }))

          try {
            const approveResult = await tokenActor.icrc2_approve(approveParams)

            console.log('Approve result:', approveResult)

            if ('Err' in approveResult || approveResult.Err !== undefined) {
              throw new Error(`Failed to approve token transfer: ${JSON.stringify(approveResult.Err || approveResult)}`)
            }

            console.log('Token approval successful!')
          } catch (approveError: any) {
            console.error('Token approval error:', approveError)
            if (approveError.message?.includes('Invalid read state request')) {
              throw new Error(`Network error: Could not connect to token canister on mainnet. Please verify the token canister ${selectedToken} exists and is accessible on mainnet.`)
            }
            throw approveError
          }
        } else {
          console.log('Using II/NFID wallet for approval')
          const { Actor, HttpAgent } = await import('@dfinity/agent')
          // Use standard ICRC-2 interface instead of generated declarations
          const { icrc2IdlFactory } = await import('@/lib/icrc2.idl')

          const isLocal = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local'
          const agent = HttpAgent.createSync({
            host,
            identity: identity!,
            verifyQuerySignatures: !isLocal
          })

          if (isLocal) {
            await agent.fetchRootKey()
          }

          const tokenActor = Actor.createActor(icrc2IdlFactory, {
            agent,
            canisterId: selectedToken,
          })

          console.log('Token actor created, calling icrc2_approve...')

          const approveParams = {
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
          }

          console.log('Approve params:', JSON.stringify({
            ...approveParams,
            spender: { owner: approveParams.spender.owner.toText(), subaccount: approveParams.spender.subaccount },
            amount: approveParams.amount.toString()
          }))

          try {
            const approveResult = await (tokenActor as any).icrc2_approve(approveParams)

            console.log('Approve result:', approveResult)

            if ('Err' in approveResult || approveResult.Err !== undefined) {
              throw new Error(`Failed to approve token transfer: ${JSON.stringify(approveResult.Err || approveResult)}`)
            }

            console.log('Token approval successful!')
          } catch (approveError: any) {
            console.error('Token approval error:', approveError)
            if (approveError.message?.includes('Invalid read state request')) {
              throw new Error(`Network error: Could not connect to token canister on mainnet. Please verify the token canister ${selectedToken} exists and is accessible on mainnet.`)
            }
            throw approveError
          }
        }

        console.log('Waiting 2 seconds before creating poll...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      console.log('Creating custom token poll...')
      console.log('Poll params:', {
        scopeType: 'project',
        scopeId: projectId,
        title,
        description,
        optionsCount: backendOptions.length,
        expiresAtNs: expiresAtNs.toString(),
        tokenCanister: tokenCanisterPrincipal.toText(),
        totalFundingE8s: totalFundingE8s.toString(),
        rewardPerVoteE8s: rewardPerVoteE8s.toString(),
        fundingSource,
        maxResponses,
        allowAnonymous,
        allowMultiple,
        visibility,
        rewardDistributionType
      })

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
        fundingSource,
        // New configuration parameters
        maxResponses !== undefined ? [BigInt(maxResponses)] : [],
        allowAnonymous !== undefined ? [allowAnonymous] : [],
        allowMultiple !== undefined ? [allowMultiple] : [],
        visibility ? [visibility] : [],
        rewardDistributionType ? [rewardDistributionType] : []
      )

      console.log('Create poll result:', result)

      if ('ok' in result) {
        console.log('Poll created successfully with ID:', result.ok)
        return { success: true, pollId: result.ok }
      } else {
        console.error('Poll creation failed:', result.err)
        throw new Error(result.err)
      }
    } else {
      // Use standard ICP poll creation
      const rewardFundLegacy = fundingEnabled ? Math.floor((totalFundAmount || 0) * 100) : 0
      const rewardPerVoteE8s = fundingEnabled && rewardPerVote ? BigInt(Math.floor(rewardPerVote * 100_000_000)) : null

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
        [fundingSource],
        // New configuration parameters
        maxResponses !== undefined ? [BigInt(maxResponses)] : [],
        allowAnonymous !== undefined ? [allowAnonymous] : [],
        allowMultiple !== undefined ? [allowMultiple] : [],
        visibility ? [visibility] : [],
        rewardDistributionType ? [rewardDistributionType] : []
      )

      return { success: true, pollId }
    }
  } catch (error) {
    console.error('Error creating poll:', error)
    throw new Error('Failed to create poll: ' + (error as Error).message)
  }
}

function NewPollPageContent() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const { identity, isAuthenticated, authProvider } = useIcpAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const prefilledTitle = searchParams.get('title') || ''

  const { register, handleSubmit, formState: { errors }, control, setValue, watch } = useForm<PollFormValues>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: {
      title: prefilledTitle,
      description: '',
      projectId: '',
      expiresAt: '',
      options: [{ text: '' }, { text: '' }],
      maxResponses: undefined,
      allowAnonymous: false,
      allowMultiple: false,
      visibility: 'public',
      fundingEnabled: false,
      fundingSource: 'self-funded',
      selectedToken: process.env.NEXT_PUBLIC_TOKENMANIA_CANISTER_ID || 'ICP',
      totalFundAmount: 0,
      rewardPerVote: 0,
      rewardDistributionType: 'fixed',
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options'
  })

  // Fetch projects
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

  const generateOptionsWithAI = async () => {
    const title = watch('title')
    if (!title || title.length < 2) {
      setAiError('Please enter a poll title first')
      return
    }

    setAiGenerating(true)
    setAiError(null)

    try {
      // Clear existing options immediately when generation starts
      const numFieldsToRemove = fields.length
      for (let i = 0; i < numFieldsToRemove; i++) {
        remove(0)
      }

      // Call backend canister directly for poll option generation
      const canisterId = process.env.NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID!
      const host = process.env.NEXT_PUBLIC_DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app'

      // Use authProvider to determine which wallet is actually being used
      const isPlugWallet = authProvider === 'plug'

      let backend

      if (isPlugWallet && window.ic?.plug) {
        // Use Plug wallet
        console.log('Using Plug wallet for AI option generation (auth provider:', authProvider, ')')
        const whitelist = [canisterId]
        const connected = await (window.ic.plug as any).requestConnect({
          whitelist,
          host
        })

        if (!connected) {
          throw new Error('Failed to connect to Plug wallet')
        }

        const { idlFactory } = await import('@/../../src/declarations/polls_surveys_backend')
        backend = await window.ic.plug.createActor({
          canisterId,
          interfaceFactory: idlFactory,
        })
      } else {
        // Use Internet Identity / NFID
        console.log('Using Internet Identity/NFID for AI option generation')
        const { createBackendWithIdentity } = await import('@/lib/icp')
        backend = await createBackendWithIdentity({ canisterId, host, identity })
      }

      // Generate a random seed for the request
      const seed = Math.floor(Math.random() * 1000000000)

      console.log(`Calling backend canister to generate options for: "${title}" with seed: ${seed}`)

      // Call the backend canister's generate_poll_options function
      const result = await backend.generate_poll_options(title, [BigInt(seed)])

      if ('ok' in result) {
        const options = result.ok
        console.log(`Successfully generated ${options.length} options from backend canister`)

        // Add generated options
        if (options && Array.isArray(options) && options.length > 0) {
          options.forEach((optionText: string) => {
            append({ text: optionText })
          })
          setAiError(null)
        } else {
          throw new Error('Invalid response format - no options returned')
        }
      } else {
        console.error('Backend canister returned error:', result.err)
        throw new Error(result.err || 'Failed to generate options from canister')
      }
    } catch (err) {
      console.error('Error generating options:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate options'
      setAiError(errorMessage)

      // Restore default empty options if exception occurred
      if (fields.length === 0) {
        append({ text: '' })
        append({ text: '' })
      }
    } finally {
      setAiGenerating(false)
    }
  }

  const onSubmit = async (data: PollFormValues) => {
    setIsSubmitting(true)
    try {
      await createPollAction(data, identity, isAuthenticated, authProvider)
      toast({
        title: "Poll created successfully!",
        description: "Your poll is now live and ready for votes.",
      })
      router.push('/creator?tab=polls')
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || 'Failed to create poll',
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Validation for proceeding to next step
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return !!(watch('title') && watch('description') && watch('projectId') && watch('expiresAt'))
      case 1: // Options
        const optionValues = fields.map((_, index) => watch(`options.${index}.text`))
        const filledOptions = optionValues.filter((text: string) => text && text.trim() !== '')
        return filledOptions.length >= 2
      case 2: // Configuration
        return true // No required fields
      case 3: // Funding
        return true // No required fields
      default:
        return true
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepBasicInfo
            register={register}
            errors={errors}
            setValue={setValue}
            projects={projects}
            prefilledTitle={prefilledTitle}
          />
        )
      case 1:
        return (
          <StepPollOptions
            register={register}
            errors={errors}
            fields={fields}
            append={append}
            remove={remove}
            onGenerateWithAI={generateOptionsWithAI}
            aiGenerating={aiGenerating}
            aiError={aiError}
            watch={watch}
          />
        )
      case 2:
        return (
          <StepConfiguration
            register={register}
            errors={errors}
            setValue={setValue}
            watch={watch}
          />
        )
      case 3:
        return (
          <StepFundingRewards
            register={register}
            errors={errors}
            setValue={setValue}
            watch={watch}
          />
        )
      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <PollCreationWizard
        steps={wizardSteps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onComplete={handleSubmit(onSubmit)}
        onCancel={() => router.push('/polls')}
        canProceed={canProceedToNextStep()}
        isSubmitting={isSubmitting}
      >
        {renderStep()}
      </PollCreationWizard>
    </form>
  )
}

export default function NewPollPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <NewPollPageContent />
    </Suspense>
  )
}
