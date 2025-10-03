// Minimal IDL to start; expand as we build pages
import { IDL } from '@dfinity/candid'

export const idlFactory = ({ IDL: I = IDL }) => {
  const Status = I.Variant({ active: I.Null, closed: I.Null })
  const ScopeType = I.Variant({ project: I.Null, product: I.Null })

  const TokenType = I.Variant({ ICP: I.Null, ICRC1: I.Principal })
  const FundingInfo = I.Record({
    tokenType: TokenType,
    tokenCanister: I.Opt(I.Principal),
    tokenSymbol: I.Text,
    tokenDecimals: I.Nat8,
    totalFund: I.Nat64,
    rewardPerResponse: I.Nat64,
    maxResponses: I.Nat,
    currentResponses: I.Nat,
    remainingFund: I.Nat64,
  })

  const Project = I.Record({
    id: I.Nat,
    slug: I.Text,
    name: I.Text,
    description: I.Text,
    createdBy: I.Principal,
    createdAt: I.Int,
    status: I.Text,
  })
  const ProjectSummary = I.Record({ id: I.Nat, slug: I.Text, name: I.Text, status: I.Text })

  const Product = I.Record({
    id: I.Nat,
    projectId: I.Nat,
    slug: I.Text,
    name: I.Text,
    description: I.Text,
    createdBy: I.Principal,
    createdAt: I.Int,
    status: I.Text,
  })
  const ProductSummary = I.Record({ id: I.Nat, projectId: I.Nat, slug: I.Text, name: I.Text, status: I.Text })

  const OptionT = I.Record({ id: I.Nat, text: I.Text, votes: I.Nat })
  const Poll = I.Record({
    id: I.Nat,
    scopeType: ScopeType,
    scopeId: I.Nat,
    title: I.Text,
    description: I.Text,
    options: I.Vec(OptionT),
    createdBy: I.Principal,
    createdAt: I.Int,
    closesAt: I.Int,
    status: Status,
    totalVotes: I.Nat,
    rewardFund: I.Nat,
    fundingInfo: I.Opt(FundingInfo),
    voterPrincipals: I.Vec(I.Principal),
  })
  const PollSummary = I.Record({ id: I.Nat, scopeType: ScopeType, scopeId: I.Nat, title: I.Text, status: Status, totalVotes: I.Nat })

  const QuestionType = I.Variant({ single: I.Null, multi: I.Null, likert: I.Null, short: I.Null, long: I.Null, number: I.Null, rating: I.Null })
  const Question = I.Record({ id: I.Nat, qType: QuestionType, text: I.Text, required: I.Bool, choices: I.Opt(I.Vec(I.Text)), min: I.Opt(I.Nat), max: I.Opt(I.Nat), helpText: I.Opt(I.Text) })
  const Survey = I.Record({ id: I.Nat, scopeType: ScopeType, scopeId: I.Nat, title: I.Text, description: I.Text, createdBy: I.Principal, createdAt: I.Int, closesAt: I.Int, status: Status, rewardFund: I.Nat, fundingInfo: I.Opt(FundingInfo), allowAnonymous: I.Bool, questions: I.Vec(Question), submissionsCount: I.Nat })
  const SurveySummary = I.Record({ id: I.Nat, scopeType: ScopeType, scopeId: I.Nat, title: I.Text, status: Status, submissionsCount: I.Nat })

  const QuestionInput = I.Record({
    qType: I.Text,  // Use qType to avoid reserved keyword issues
    text: I.Text,
    required: I.Bool,
    choices: I.Opt(I.Vec(I.Text)),
    min: I.Opt(I.Nat),
    max: I.Opt(I.Nat),
    helpText: I.Opt(I.Text)
  })
  const AnswerInput = I.Record({ questionId: I.Nat, nat: I.Opt(I.Nat), nats: I.Opt(I.Vec(I.Nat)), text: I.Opt(I.Text) })

  const AnswerValue = I.Variant({ nat: I.Nat, nats: I.Vec(I.Nat), text: I.Text })
  const Answer = I.Record({ questionId: I.Nat, value: AnswerValue })
  const Submission = I.Record({
    id: I.Nat,
    surveyId: I.Nat,
    respondent: I.Opt(I.Principal),
    submittedAt: I.Int,
    answers: I.Vec(Answer)
  })

  // Analytics types
  const TokenDistribution = I.Record({
    tokenSymbol: I.Text,
    amount: I.Text,
    count: I.Nat,
  })

  const AnalyticsOverview = I.Record({
    polls: I.Record({
      total: I.Nat,
      totalVotes: I.Nat,
      averageVotesPerPoll: I.Nat,
    }),
    surveys: I.Record({
      total: I.Nat,
      totalSubmissions: I.Nat,
      averageSubmissionsPerSurvey: I.Nat,
    }),
    funding: I.Record({
      totalFundsDisbursed: I.Text,
      disbursedByToken: I.Vec(TokenDistribution),
    }),
    engagement: I.Record({
      uniqueVoters: I.Nat,
      uniqueRespondents: I.Nat,
      totalUniqueUsers: I.Nat,
    }),
  })

  return I.Service({
    create_project: I.Func([I.Text, I.Text], [I.Nat], []),
    list_projects: I.Func([I.Nat, I.Nat], [I.Vec(ProjectSummary)], ['query']),
    get_project: I.Func([I.Nat], [I.Opt(Project)], ['query']),
    update_project: I.Func([I.Nat, I.Text, I.Text, I.Text], [I.Bool], []),

    create_product: I.Func([I.Nat, I.Text, I.Text], [I.Nat], []),
    list_products: I.Func([I.Nat, I.Nat, I.Nat], [I.Vec(ProductSummary)], ['query']),
    get_product: I.Func([I.Nat], [I.Opt(Product)], ['query']),
    update_product: I.Func([I.Nat, I.Text, I.Text, I.Text], [I.Bool], []),

    create_poll: I.Func([I.Text, I.Nat, I.Text, I.Text, I.Vec(I.Text), I.Int, I.Nat, I.Bool, I.Opt(I.Nat64)], [I.Nat], []),
    list_polls_by_project: I.Func([I.Nat, I.Nat, I.Nat], [I.Vec(PollSummary)], ['query']),
    list_polls_by_product: I.Func([I.Nat, I.Nat, I.Nat], [I.Vec(PollSummary)], ['query']),
    get_poll: I.Func([I.Nat], [I.Opt(Poll)], ['query']),
    vote: I.Func([I.Nat, I.Nat], [I.Bool], []),
    close_poll: I.Func([I.Nat], [I.Bool], []),

    create_survey: I.Func([I.Text, I.Nat, I.Text, I.Text, I.Int, I.Nat, I.Bool, I.Vec(QuestionInput), I.Bool, I.Opt(I.Nat64)], [I.Nat], []),
    get_survey: I.Func([I.Nat], [I.Opt(Survey)], ['query']),
    list_surveys_by_project: I.Func([I.Nat, I.Nat, I.Nat], [I.Vec(SurveySummary)], ['query']),
    list_surveys_by_product: I.Func([I.Nat, I.Nat, I.Nat], [I.Vec(SurveySummary)], ['query']),
    submit_survey: I.Func([I.Nat, I.Vec(AnswerInput)], [I.Bool], []),
    close_survey: I.Func([I.Nat], [I.Bool], []),
    export_survey_csv: I.Func([I.Nat], [I.Vec(I.Nat8)], ['query']),
    get_survey_respondents: I.Func([I.Nat], [I.Vec(I.Principal)], ['query']),
    get_survey_submissions: I.Func([I.Nat], [I.Vec(Submission)], ['query']),
    update_survey_funding: I.Func([I.Nat, I.Nat64, I.Nat64], [I.Bool], []),

    // Analytics
    get_analytics_overview: I.Func([], [AnalyticsOverview], ['query']),
  })
}

export type ServiceIDL = ReturnType<typeof idlFactory>
