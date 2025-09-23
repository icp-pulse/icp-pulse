import type { Principal } from '@dfinity/principal'

// TypeScript mirror of the candid interface (partial)
export type Status = { active: null } | { closed: null }
export type ScopeType = { project: null } | { product: null }

export type Project = { id: bigint; slug: string; name: string; description: string; createdBy: string; createdAt: bigint; status: string }
export type ProjectSummary = { id: bigint; slug: string; name: string; status: string }

export type Product = { id: bigint; projectId: bigint; slug: string; name: string; description: string; createdBy: string; createdAt: bigint; status: string }
export type ProductSummary = { id: bigint; projectId: bigint; slug: string; name: string; status: string }

export type OptionT = { id: bigint; text: string; votes: bigint }
export type Poll = { id: bigint; scopeType: ScopeType; scopeId: bigint; title: string; description: string; options: OptionT[]; createdBy: string; createdAt: bigint; closesAt: bigint; status: Status; totalVotes: bigint; rewardFund: bigint; voterPrincipals: string[] }
export type PollSummary = { id: bigint; scopeType: ScopeType; scopeId: bigint; title: string; status: Status; totalVotes: bigint }

export type QuestionType = { single: null } | { multi: null } | { likert: null } | { short: null } | { long: null } | { number: null } | { rating: null }
export type Question = { id: bigint; type_: QuestionType; text: string; required: boolean; choices: string[] | null; min: bigint | null; max: bigint | null; helpText: string | null }
export type Survey = { id: bigint; scopeType: ScopeType; scopeId: bigint; title: string; description: string; createdBy: string; createdAt: bigint; closesAt: bigint; status: Status; rewardFund: bigint; allowAnonymous: boolean; questions: Question[]; submissionsCount: bigint }
export type SurveySummary = { id: bigint; scopeType: ScopeType; scopeId: bigint; title: string; status: Status; submissionsCount: bigint }

export type AnswerInput = { questionId: bigint; nat: bigint | [] | null; nats: bigint[] | [] | null; text: string | [] | null }

// Token types
export type SupportedToken = [string, string, number] // [Principal, Symbol, Decimals]
export type TokenInfo = { symbol: string; decimals: number }

// Reward types
export type RewardStatus = { pending: null } | { claimed: null } | { processing: null }
export type PendingReward = {
  id: string
  pollId: bigint
  pollTitle: string
  userPrincipal: string
  amount: bigint
  tokenSymbol: string
  tokenDecimals: number
  tokenCanister: string | null
  status: RewardStatus
  claimedAt: bigint | null
  votedAt: bigint
}

// Backend reward type (as received from canister)
export type BackendPendingReward = {
  id: string
  pollId: bigint
  pollTitle: string
  userPrincipal: Principal
  amount: bigint
  tokenSymbol: string
  tokenDecimals: number
  tokenCanister: [] | [Principal]
  status: RewardStatus
  claimedAt: [] | [bigint]
  votedAt: bigint
}

export type BackendService = {
  create_project(name: string, description: string): Promise<bigint>
  list_projects(offset: bigint, limit: bigint): Promise<ProjectSummary[]>
  get_project(id: bigint): Promise<[Project] | []>
  update_project(id: bigint, name: string, description: string, status: string): Promise<boolean>

  create_product(projectId: bigint, name: string, description: string): Promise<bigint>
  list_products(projectId: bigint, offset: bigint, limit: bigint): Promise<ProductSummary[]>
  get_product(id: bigint): Promise<[Product] | []>
  update_product(id: bigint, name: string, description: string, status: string): Promise<boolean>

  create_poll(scopeType: string, scopeId: bigint, title: string, description: string, options: string[], closesAt: bigint, rewardFund: bigint, fundingEnabled: boolean, rewardPerVote: [] | [bigint]): Promise<bigint>
  create_custom_token_poll(scopeType: string, scopeId: bigint, title: string, description: string, options: string[], closesAt: bigint, tokenCanister: [string] | [], totalFunding: bigint, rewardPerVote: bigint): Promise<bigint>
  list_polls_by_project(projectId: bigint, offset: bigint, limit: bigint): Promise<PollSummary[]>
  list_polls_by_product(productId: bigint, offset: bigint, limit: bigint): Promise<PollSummary[]>
  get_poll(id: bigint): Promise<[Poll] | []>
  vote(pollId: bigint, optionId: bigint): Promise<boolean>
  close_poll(pollId: bigint): Promise<boolean>

  create_survey(scopeType: string, scopeId: bigint, title: string, description: string, closesAt: bigint, rewardFund: bigint, allowAnonymous: boolean, questions: { type_: string; text: string; required: boolean; choices: [string[]] | []; min: [bigint] | []; max: [bigint] | []; helpText: [string] | [] }[]): Promise<bigint>
  get_survey(id: bigint): Promise<[Survey] | []>
  list_surveys_by_project(projectId: bigint, offset: bigint, limit: bigint): Promise<SurveySummary[]>
  list_surveys_by_product(productId: bigint, offset: bigint, limit: bigint): Promise<SurveySummary[]>
  submit_survey(surveyId: bigint, answers: AnswerInput[]): Promise<boolean>
  close_survey(surveyId: bigint): Promise<boolean>
  export_survey_csv(surveyId: bigint): Promise<Uint8Array>

  // Token functions
  get_supported_tokens(): Promise<SupportedToken[]>
  validate_custom_token(canister: string): Promise<[TokenInfo] | []>

  // Reward functions
  get_user_rewards(userPrincipal: Principal): Promise<BackendPendingReward[]>
  claim_reward(rewardId: string): Promise<boolean>
}
