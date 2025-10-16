// Auto-generated from Motoko canister - DO NOT EDIT MANUALLY
// Last regenerated: 2025-10-16
import { IDL } from '@dfinity/candid'

export const idlFactory = ({ IDL: I = IDL }) => {
  const PollId = I.Nat
  const Result = I.Variant({ ok: I.Text, err: I.Text })
  const SurveyId = I.Nat
  const Result_2 = I.Variant({ ok: PollId, err: I.Text })
  const ProjectId = I.Nat
  const ProductId = I.Nat
  const QuestionInput = I.Record({
    max: I.Opt(I.Nat),
    min: I.Opt(I.Nat),
    qType: I.Text,
    text: I.Text,
    helpText: I.Opt(I.Text),
    required: I.Bool,
    choices: I.Opt(I.Vec(I.Text))
  })
  const Result_1 = I.Variant({ ok: I.Vec(I.Text), err: I.Text })
  const TokenDistribution = I.Record({
    count: I.Nat,
    tokenSymbol: I.Text,
    amount: I.Text
  })
  const AnalyticsOverview = I.Record({
    surveys: I.Record({
      total: I.Nat,
      totalSubmissions: I.Nat,
      averageSubmissionsPerSurvey: I.Nat
    }),
    polls: I.Record({
      total: I.Nat,
      totalVotes: I.Nat,
      averageVotesPerPoll: I.Nat
    }),
    engagement: I.Record({
      totalUniqueUsers: I.Nat,
      uniqueRespondents: I.Nat,
      uniqueVoters: I.Nat
    }),
    funding: I.Record({
      totalFundsDisbursed: I.Text,
      disbursedByToken: I.Vec(TokenDistribution)
    })
  })
  const ClaimableReward = I.Record({
    tokenDecimals: I.Nat8,
    claimsAreOpen: I.Bool,
    pollTitle: I.Text,
    tokenSymbol: I.Text,
    pollClosed: I.Bool,
    amount: I.Nat64,
    tokenCanister: I.Opt(I.Principal),
    pollId: PollId
  })
  const Status = I.Variant({
    claimsEnded: I.Null,
    closed: I.Null,
    claimsOpen: I.Null,
    active: I.Null,
    paused: I.Null
  })
  const ScopeType = I.Variant({ product: I.Null, project: I.Null })
  const TokenType = I.Variant({ ICP: I.Null, ICRC1: I.Principal })
  const FundingType = I.Variant({
    Crowdfunded: I.Null,
    TreasuryFunded: I.Null,
    SelfFunded: I.Null
  })
  const FundingInfo = I.Record({
    currentResponses: I.Nat,
    rewardPerResponse: I.Nat64,
    remainingFund: I.Nat64,
    totalFund: I.Nat64,
    tokenDecimals: I.Nat8,
    tokenSymbol: I.Text,
    tokenType: TokenType,
    maxResponses: I.Opt(I.Nat),
    fundingType: FundingType,
    contributors: I.Vec(I.Tuple(I.Principal, I.Nat64)),
    tokenCanister: I.Opt(I.Principal),
    pendingClaims: I.Vec(I.Tuple(I.Principal, I.Nat64))
  })
  const RewardDistributionType = I.Variant({
    EqualSplit: I.Null,
    Fixed: I.Null
  })
  const PollConfig = I.Record({
    rewardDistributionType: RewardDistributionType,
    allowAnonymous: I.Bool,
    allowMultiple: I.Bool,
    maxResponses: I.Opt(I.Nat),
    visibility: I.Text
  })
  const OptionT = I.Record({
    id: I.Nat,
    votes: I.Nat,
    text: I.Text
  })
  const Poll = I.Record({
    id: PollId,
    status: Status,
    scopeType: ScopeType,
    title: I.Text,
    totalVotes: I.Nat,
    createdAt: I.Int,
    createdBy: I.Principal,
    description: I.Text,
    scopeId: I.Nat,
    closesAt: I.Int,
    rewardFund: I.Nat,
    voterPrincipals: I.Vec(I.Principal),
    fundingInfo: I.Opt(FundingInfo),
    config: I.Opt(PollConfig),
    options: I.Vec(OptionT)
  })
  const Product = I.Record({
    id: ProductId,
    status: I.Text,
    name: I.Text,
    createdAt: I.Int,
    createdBy: I.Principal,
    slug: I.Text,
    description: I.Text,
    projectId: ProjectId
  })
  const Project = I.Record({
    id: ProjectId,
    status: I.Text,
    name: I.Text,
    createdAt: I.Int,
    createdBy: I.Principal,
    slug: I.Text,
    description: I.Text
  })
  const QuestionType = I.Variant({
    multi: I.Null,
    long: I.Null,
    short: I.Null,
    number: I.Null,
    single: I.Null,
    rating: I.Null,
    likert: I.Null
  })
  const Question = I.Record({
    id: I.Nat,
    max: I.Opt(I.Nat),
    min: I.Opt(I.Nat),
    qType: QuestionType,
    text: I.Text,
    helpText: I.Opt(I.Text),
    required: I.Bool,
    choices: I.Opt(I.Vec(I.Text))
  })
  const Survey = I.Record({
    id: SurveyId,
    status: Status,
    scopeType: ScopeType,
    title: I.Text,
    submissionsCount: I.Nat,
    createdAt: I.Int,
    createdBy: I.Principal,
    allowAnonymous: I.Bool,
    description: I.Text,
    scopeId: I.Nat,
    closesAt: I.Int,
    rewardFund: I.Nat,
    questions: I.Vec(Question),
    fundingInfo: I.Opt(FundingInfo)
  })
  const AnswerValue = I.Variant({
    nat: I.Nat,
    nats: I.Vec(I.Nat),
    text: I.Text
  })
  const Answer = I.Record({ value: AnswerValue, questionId: I.Nat })
  const Submission = I.Record({
    id: I.Nat,
    answers: I.Vec(Answer),
    submittedAt: I.Int,
    surveyId: SurveyId,
    respondent: I.Opt(I.Principal)
  })
  const TreasuryFee = I.Record({
    totalFeesCollected: I.Nat64,
    tokenDecimals: I.Nat8,
    tokenSymbol: I.Text,
    tokenCanister: I.Principal
  })
  const RewardStatus = I.Variant({
    pending: I.Null,
    claimed: I.Null,
    processing: I.Null
  })
  const PendingReward = I.Record({
    id: I.Text,
    status: RewardStatus,
    tokenDecimals: I.Nat8,
    pollTitle: I.Text,
    claimedAt: I.Opt(I.Int),
    tokenSymbol: I.Text,
    userPrincipal: I.Principal,
    votedAt: I.Int,
    amount: I.Nat64,
    tokenCanister: I.Opt(I.Principal),
    pollId: PollId
  })
  const PollSummary = I.Record({
    id: PollId,
    status: Status,
    scopeType: ScopeType,
    title: I.Text,
    totalVotes: I.Nat,
    scopeId: I.Nat
  })
  const ProductSummary = I.Record({
    id: ProductId,
    status: I.Text,
    name: I.Text,
    slug: I.Text,
    projectId: ProjectId
  })
  const ProjectSummary = I.Record({
    id: ProjectId,
    status: I.Text,
    name: I.Text,
    slug: I.Text
  })
  const ProjectStats = I.Record({
    projectId: I.Nat,
    pollCount: I.Nat,
    surveyCount: I.Nat,
    totalVotes: I.Nat,
    totalSubmissions: I.Nat,
    totalResponses: I.Nat
  })
  const SurveySummary = I.Record({
    id: SurveyId,
    status: Status,
    scopeType: ScopeType,
    title: I.Text,
    submissionsCount: I.Nat,
    scopeId: I.Nat
  })
  const AnswerInput = I.Record({
    nat: I.Opt(I.Nat),
    nats: I.Opt(I.Vec(I.Nat)),
    text: I.Opt(I.Text),
    questionId: I.Nat
  })
  const HttpHeader = I.Record({ value: I.Text, name: I.Text })
  const HttpResponsePayload = I.Record({
    status: I.Nat,
    body: I.Vec(I.Nat8),
    headers: I.Vec(HttpHeader)
  })
  const TransformArgs = I.Record({
    context: I.Vec(I.Nat8),
    response: HttpResponsePayload
  })

  return I.Service({
    claim_poll_reward: I.Func([PollId], [Result], []),
    claim_reward: I.Func([I.Text], [I.Bool], []),
    chat_message: I.Func([I.Text, I.Vec(I.Tuple(I.Text, I.Text))], [Result], []),
    close_poll: I.Func([PollId], [Result], []),
    close_survey: I.Func([SurveyId], [I.Bool], []),
    create_custom_token_poll: I.Func(
      [
        I.Text,
        I.Nat,
        I.Text,
        I.Text,
        I.Vec(I.Text),
        I.Int,
        I.Opt(I.Principal),
        I.Nat64,
        I.Nat64,
        I.Text,
        I.Opt(I.Nat),
        I.Opt(I.Bool),
        I.Opt(I.Bool),
        I.Opt(I.Text),
        I.Opt(I.Text)
      ],
      [Result_2],
      []
    ),
    create_poll: I.Func(
      [
        I.Text,
        I.Nat,
        I.Text,
        I.Text,
        I.Vec(I.Text),
        I.Int,
        I.Nat,
        I.Bool,
        I.Opt(I.Nat64),
        I.Opt(I.Text),
        I.Opt(I.Nat),
        I.Opt(I.Bool),
        I.Opt(I.Bool),
        I.Opt(I.Text),
        I.Opt(I.Text)
      ],
      [PollId],
      []
    ),
    create_product: I.Func([ProjectId, I.Text, I.Text], [ProductId], []),
    create_project: I.Func([I.Text, I.Text], [ProjectId], []),
    create_survey: I.Func(
      [
        I.Text,
        I.Nat,
        I.Text,
        I.Text,
        I.Int,
        I.Nat,
        I.Bool,
        I.Vec(QuestionInput),
        I.Bool,
        I.Opt(I.Nat64)
      ],
      [SurveyId],
      []
    ),
    donate_unused_funds: I.Func([PollId], [Result], []),
    end_rewards_claiming: I.Func([PollId], [Result], []),
    export_survey_csv: I.Func([SurveyId], [I.Vec(I.Nat8)], ['query']),
    fund_poll: I.Func([PollId, I.Nat64], [Result], []),
    generate_poll_options: I.Func([I.Text, I.Opt(I.Nat)], [Result_1], []),
    get_analytics_overview: I.Func([], [AnalyticsOverview], ['query']),
    get_claimable_rewards: I.Func([I.Principal], [I.Vec(ClaimableReward)], ['query']),
    get_gateway_url: I.Func([], [I.Text], ['query']),
    get_platform_fee_percentage: I.Func([], [I.Nat], ['query']),
    get_poll: I.Func([PollId], [I.Opt(Poll)], ['query']),
    get_product: I.Func([ProductId], [I.Opt(Product)], ['query']),
    get_project: I.Func([ProjectId], [I.Opt(Project)], ['query']),
    get_stats: I.Func(
      [],
      [
        I.Record({
          pollCount: I.Nat,
          surveyCount: I.Nat,
          projectCount: I.Nat
        })
      ],
      ['query']
    ),
    get_my_stats: I.Func(
      [],
      [
        I.Record({
          pollCount: I.Nat,
          surveyCount: I.Nat,
          projectCount: I.Nat
        })
      ],
      ['query']
    ),
    get_project_stats: I.Func([I.Nat], [I.Opt(ProjectStats)], ['query']),
    get_projects_stats: I.Func([I.Vec(I.Nat)], [I.Vec(ProjectStats)], ['query']),
    get_supported_tokens: I.Func(
      [],
      [I.Vec(I.Tuple(I.Principal, I.Text, I.Nat8))],
      ['query']
    ),
    get_survey: I.Func([SurveyId], [I.Opt(Survey)], ['query']),
    get_survey_respondents: I.Func([SurveyId], [I.Vec(I.Principal)], ['query']),
    get_survey_submissions: I.Func([SurveyId], [I.Vec(Submission)], ['query']),
    get_token_treasury_fees: I.Func([I.Principal], [I.Opt(TreasuryFee)], ['query']),
    get_treasury_fees: I.Func([], [I.Vec(TreasuryFee)], ['query']),
    get_user_rewards: I.Func([I.Principal], [I.Vec(PendingReward)], ['query']),
    has_openai_api_key: I.Func([], [I.Bool], ['query']),
    list_polls_by_product: I.Func([ProductId, I.Nat, I.Nat], [I.Vec(PollSummary)], ['query']),
    list_polls_by_project: I.Func([ProjectId, I.Nat, I.Nat], [I.Vec(PollSummary)], ['query']),
    list_products: I.Func([ProjectId, I.Nat, I.Nat], [I.Vec(ProductSummary)], ['query']),
    list_projects: I.Func([I.Nat, I.Nat], [I.Vec(ProjectSummary)], ['query']),
    list_my_polls: I.Func([I.Nat, I.Nat], [I.Vec(PollSummary)], ['query']),
    list_my_projects: I.Func([I.Nat, I.Nat], [I.Vec(ProjectSummary)], ['query']),
    list_my_surveys: I.Func([I.Nat, I.Nat], [I.Vec(SurveySummary)], ['query']),
    list_surveys_by_product: I.Func([ProductId, I.Nat, I.Nat], [I.Vec(SurveySummary)], ['query']),
    list_surveys_by_project: I.Func([ProjectId, I.Nat, I.Nat], [I.Vec(SurveySummary)], ['query']),
    pause_poll: I.Func([PollId], [Result], []),
    resume_poll: I.Func([PollId], [Result], []),
    set_gateway_url: I.Func([I.Text], [I.Bool], []),
    set_openai_api_key: I.Func([I.Text], [I.Bool], []),
    start_rewards_claiming: I.Func([PollId], [Result], []),
    submit_survey: I.Func([SurveyId, I.Vec(AnswerInput)], [I.Bool], []),
    transform: I.Func([TransformArgs], [HttpResponsePayload], ['query']),
    transform_gateway: I.Func([TransformArgs], [HttpResponsePayload], ['query']),
    update_product: I.Func([ProductId, I.Text, I.Text, I.Text], [I.Bool], []),
    update_project: I.Func([ProjectId, I.Text, I.Text, I.Text], [I.Bool], []),
    update_poll_project: I.Func([PollId, I.Nat], [Result], []),
    update_survey_funding: I.Func([SurveyId, I.Nat64, I.Nat64], [I.Bool], []),
    validate_custom_token: I.Func(
      [I.Principal],
      [I.Opt(I.Record({ decimals: I.Nat8, symbol: I.Text }))],
      []
    ),
    vote: I.Func([PollId, I.Nat], [I.Bool], []),
    withdraw_unused_funds: I.Func([PollId], [Result], [])
  })
}

export type ServiceIDL = ReturnType<typeof idlFactory>
