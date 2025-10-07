"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';

const INDEXER_API_URL = process.env.NEXT_PUBLIC_INDEXER_API_URL || 'https://icp-pulse-indexer.onrender.com';

interface Overview {
  polls: {
    total: number;
    totalVotes: number;
    averageVotesPerPoll: number;
  };
  surveys: {
    total: number;
    totalSubmissions: number;
    averageSubmissionsPerSurvey: number;
  };
  funding: {
    fundedPolls: number;
    fundedSurveys: number;
    totalFundsAllocated: string;
    totalFundsDisbursed: string;
    totalFundsRemaining: string;
    utilizationRate: number;
    disbursedByToken: Array<{
      tokenSymbol: string;
      tokenDecimals: number;
      amount: string;
      count: number;
    }>;
  };
  engagement: {
    uniqueVoters: number;
    uniqueRespondents: number;
    totalUniqueUsers: number;
  };
}

interface TopPoll {
  id: number;
  title: string;
  totalVotes: number;
  status: string;
  createdAt: string;
  tokenSymbol: string | null;
  totalFund: string | null;
  remainingFund: string | null;
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [topPolls, setTopPolls] = useState<TopPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);

        // Fetch overview data
        const overviewRes = await fetch(`${INDEXER_API_URL}/api/overview`);
        if (!overviewRes.ok) {
          throw new Error(`Failed to fetch overview: ${overviewRes.status} ${overviewRes.statusText}`);
        }
        const overviewData = await overviewRes.json();
        setOverview(overviewData);

        // Fetch top polls
        const topPollsRes = await fetch(`${INDEXER_API_URL}/api/polls/top?limit=5`);
        if (!topPollsRes.ok) {
          throw new Error(`Failed to fetch top polls: ${topPollsRes.status} ${topPollsRes.statusText}`);
        }
        const topPollsData = await topPollsRes.json();
        setTopPolls(topPollsData);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-slate-600 dark:text-slate-400">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Make sure the indexer is running on {INDEXER_API_URL}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Data sourced from ICP Pulse Indexer
          </p>
        </div>
        <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
          ● Connected to Indexer
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Polls</CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.polls.total || 0}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {overview?.polls.totalVotes || 0} total votes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Votes/Poll</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.polls.averageVotesPerPoll.toFixed(1) || 0}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Engagement rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Voters</CardTitle>
            <Users className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.engagement.uniqueVoters || 0}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Total participants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funded Polls</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.funding.fundedPolls || 0}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {overview?.funding.utilizationRate.toFixed(1) || 0}% utilized
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funding Breakdown */}
      {overview && overview.funding.disbursedByToken.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Funds Disbursed by Token</CardTitle>
            <CardDescription>Breakdown of rewards distributed to voters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview.funding.disbursedByToken.map((token) => (
                <div key={token.tokenSymbol} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <span className="font-semibold text-primary-700 dark:text-primary-400">
                        {token.tokenSymbol[0]}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{token.tokenSymbol}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {token.count} transactions
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {(Number(token.amount) / Math.pow(10, token.tokenDecimals)).toFixed(4)}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {token.tokenSymbol}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Polls */}
      <Card>
        <CardHeader>
          <CardTitle>Top Polls by Votes</CardTitle>
          <CardDescription>Most popular polls in the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPolls.map((poll, index) => (
              <div
                key={poll.id}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-bold text-primary-700 dark:text-primary-400">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {poll.title}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {poll.totalVotes} votes
                      </span>
                      <span>•</span>
                      <span className={poll.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}>
                        {poll.status}
                      </span>
                      {poll.tokenSymbol && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {poll.tokenSymbol}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Polls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Total Polls</span>
                  <span className="font-semibold">{overview.polls.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Total Votes</span>
                  <span className="font-semibold">{overview.polls.totalVotes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Avg per Poll</span>
                  <span className="font-semibold">{overview.polls.averageVotesPerPoll.toFixed(1)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Surveys</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Total Surveys</span>
                  <span className="font-semibold">{overview.surveys.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Submissions</span>
                  <span className="font-semibold">{overview.surveys.totalSubmissions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Avg per Survey</span>
                  <span className="font-semibold">{overview.surveys.averageSubmissionsPerSurvey.toFixed(1)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Unique Voters</span>
                  <span className="font-semibold">{overview.engagement.uniqueVoters}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Respondents</span>
                  <span className="font-semibold">{overview.engagement.uniqueRespondents}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Total Users</span>
                  <span className="font-semibold">{overview.engagement.totalUniqueUsers}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
