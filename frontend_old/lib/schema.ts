// Minimal local schema types to satisfy Admin UI during migration
export type Project = {
  id: string
  name: string
  description: string
  status: 'active' | 'completed' | 'on_hold' | 'draft'
  owner: string
  createdAt?: string
}

export type Survey = {
  id: string
  title: string
  description?: string
  status: 'active' | 'draft' | 'closed'
  responses?: number
}

export type PollOption = { id: string; text: string; votes: number }
export type Poll = {
  id: string
  question: string
  options: PollOption[]
  totalVotes?: number
  duration: '1_day' | '3_days' | '1_week' | '1_month'
  status: 'active' | 'completed'
  createdAt?: string | Date
}

// Zod schemas placeholders (lightweight) to keep forms working; replace with real ones later
import { z } from 'zod'
export const insertProjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  status: z.enum(['active','completed','on_hold','draft']).default('active'),
  owner: z.string().default('Admin'),
})
export type InsertProject = z.infer<typeof insertProjectSchema>

export const insertSurveySchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  questions: z.array(z.object({ id: z.string(), question: z.string(), type: z.string(), required: z.boolean() })).default([]),
  status: z.enum(['draft','active']).default('draft'),
})
export type InsertSurvey = z.infer<typeof insertSurveySchema>
export type SurveyQuestion = { id: string; question: string; type: 'multiple_choice' | 'text_input' | 'rating_scale' | 'yes_no'; required: boolean }

export const insertPollSchema = z.object({
  question: z.string().min(2),
  options: z.array(z.object({ id: z.string(), text: z.string(), votes: z.number().default(0) })).min(2),
  duration: z.enum(['1_day','3_days','1_week','1_month']).default('1_day'),
  privacy: z.enum(['public','private','invite_only']).default('public'),
  status: z.enum(['active']).default('active'),
})
export type InsertPoll = z.infer<typeof insertPollSchema>
