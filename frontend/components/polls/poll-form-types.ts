import { z } from 'zod'

export const optionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
})

export type RewardDistributionType = 'fixed' | 'equal-split'
export type FundingSource = 'self-funded' | 'crowdfunded' | 'treasury-funded'

export const pollFormSchema = z.object({
  // Step 1: Basic Information
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(2, 'Description must be at least 2 characters'),
  projectId: z.string().min(1, 'Please select a project'),
  expiresAt: z.string().min(1, 'Please set an expiry date').refine((dateStr) => {
    if (!dateStr) return false
    const selectedDate = new Date(dateStr)
    const now = new Date()
    return selectedDate > now
  }, 'Expiry date must be in the future'),

  // Step 2: Poll Options
  options: z.array(optionSchema).min(2, 'At least two options are required'),

  // Step 3: Poll Configuration
  maxResponses: z.number().min(1, 'Must have at least 1 response').optional(),
  allowAnonymous: z.boolean().optional().default(false),
  allowMultiple: z.boolean().optional().default(false),
  visibility: z.enum(['public', 'private', 'invite-only']).optional().default('public'),

  // Step 4: Funding & Rewards
  fundingEnabled: z.boolean().optional().default(false),
  fundingSource: z.enum(['self-funded', 'crowdfunded', 'treasury-funded']).optional().default('self-funded'),
  selectedToken: z.string().optional().default('ICP'),
  totalFundAmount: z.number().min(0).optional(),
  rewardPerVote: z.number().min(0).optional(),
  rewardDistributionType: z.enum(['fixed', 'equal-split']).optional().default('fixed'),
})

// Manually define the type to match what Zod actually produces
export type PollFormValues = {
  title: string
  description: string
  projectId: string
  expiresAt: string
  options: Array<{ text: string }>
  maxResponses?: number
  allowAnonymous?: boolean
  allowMultiple?: boolean
  visibility?: 'public' | 'private' | 'invite-only'
  fundingEnabled?: boolean
  fundingSource?: 'self-funded' | 'crowdfunded' | 'treasury-funded'
  selectedToken?: string
  totalFundAmount?: number
  rewardPerVote?: number
  rewardDistributionType?: 'fixed' | 'equal-split'
}

export interface Project {
  id: string
  name: string
  status: string
}
